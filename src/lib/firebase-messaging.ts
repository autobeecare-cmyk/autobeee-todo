import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase app only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// Register Service Worker with error handling
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  try {
    // BUG-8 fix: Register the *dynamic* SW served by /api/firebase-sw which injects
    // Firebase config from env vars at request time, rather than the static
    // /firebase-messaging-sw.js which contains hardcoded credentials.
    const swRegistration = await navigator.serviceWorker.register(
      '/api/firebase-sw',
      { scope: '/' }
    )
    await navigator.serviceWorker.ready
    console.log('[FCM] Service worker registered successfully, scope:', swRegistration.scope)
    return swRegistration
  } catch (err) {
    console.error('[FCM] Service worker registration failed:', err)
    return null
  }
}

// Get FCM token for this device & register to Supabase
export const requestNotificationPermission = async (userName: string): Promise<string | null> => {
  try {
    const supported = await isSupported()
    if (!supported) {
      console.warn('[FCM] Push notifications not supported in this browser environment')
      return null
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.warn('[FCM] Notification permission was denied or dismissed:', permission)
      return null
    }

    const swRegistration = await registerServiceWorker()
    if (!swRegistration) {
      console.warn('[FCM] Could not register service worker')
    }

    const messaging = getMessaging(app)
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swRegistration || undefined,
    })

    if (token) {
      console.log('[FCM] FCM token obtained:', token.slice(0, 20) + '...')
      // Save / update token in Supabase push_tokens table
      await saveTokenToSupabase(token, userName)
      return token
    }

    console.warn('[FCM] No FCM token returned from getToken')
    return null
  } catch (error) {
    console.error('[FCM] Error getting notification permission or token:', error)
    return null
  }
}

// Save or update token in Supabase push_tokens table (Multi-device per user)
export const saveTokenToSupabase = async (token: string, userName: string) => {
  try {
    const { supabase } = await import('./supabase')

    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_name: userName,
          fcm_token: token,
          platform: detectPlatform(),
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'fcm_token' }
      )

    if (error) {
      console.error('[FCM] Error saving push token to Supabase:', error)
    } else {
      console.log('[FCM] Push token saved for user:', userName)
    }
  } catch (err) {
    console.error('[FCM] Exception saving push token:', err)
  }
}

// Detect client platform
export const detectPlatform = (): string => {
  if (typeof navigator === 'undefined') return 'web'
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  if (/Macintosh/.test(ua)) return 'macos'
  if (/Windows/.test(ua)) return 'windows'
  if (/Linux/.test(ua)) return 'linux'
  return 'web'
}

// Listen for notifications while app is open (foreground)
export const setupForegroundNotifications = async () => {
  if (typeof window === 'undefined') return
  const supported = await isSupported()
  if (!supported) return

  const messaging = getMessaging(app)

  onMessage(messaging, (payload) => {
    console.log('[FCM] Foreground notification received:', payload)

    const data = payload.data || {}
    const title = payload.notification?.title || data.title || 'Autobee OS'
    const body = payload.notification?.body || data.body || ''

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const options: NotificationOptions = {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: data.entity_id ? `autobee-${data.entity_id}` : `autobee-${data.type || 'msg'}-${Date.now()}`,
        data,
      }

      // On mobile browsers (Android Chrome, iOS PWA), 'new Notification()' throws:
      // "Illegal constructor. Use ServiceWorkerRegistration.showNotification() instead."
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
          .then((registration) => {
            return registration.showNotification(title, options)
          })
          .catch(() => {
            try {
              new Notification(title, options)
            } catch (err) {
              console.error('[FCM] Error displaying foreground notification:', err)
            }
          })
      } else {
        try {
          new Notification(title, options)
        } catch (err) {
          console.error('[FCM] Error displaying native foreground notification:', err)
        }
      }
    }
  })
}

// Diagnostic helper
export const getNotificationDiagnostics = async (userName: string) => {
  const isClient = typeof window !== 'undefined'
  const pushSupported = isClient ? ('Notification' in window && 'serviceWorker' in navigator) : false
  const permission = isClient && 'Notification' in window ? Notification.permission : 'unsupported'

  let swActive = false
  if (isClient && 'serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations().catch(() => [])
    swActive = regs.some((r) => r.active && r.scope.includes('/'))
  }

  let activeTokensCount = 0
  let userTokens: any[] = []

  try {
    const { supabase } = await import('./supabase')
    const { data } = await supabase
      .from('push_tokens')
      .select('*')
      .eq('user_name', userName)
      .eq('is_active', true)

    userTokens = data || []
    activeTokensCount = userTokens.length
  } catch (err) {
    console.warn('[FCM] Could not fetch user tokens for diagnostics:', err)
  }

  return {
    pushSupported,
    permission,
    serviceWorkerActive: swActive,
    activeTokensCount,
    userTokens,
    platform: detectPlatform(),
  }
}

// Send test push helper
export const sendTestPushNotification = async (userName: string) => {
  const res = await fetch('/api/notifications/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'AutoBee Test Notification',
      body: 'Native push notifications are working smoothly across your active devices!',
      recipient: userName,
      actor: 'System',
      type: 'test',
      priority: 'high',
    }),
  })

  return res.json()
}

export { app }
