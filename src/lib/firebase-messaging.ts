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

// Get FCM token for this device
export const requestNotificationPermission = async (userName: string): Promise<string | null> => {
  try {
    const supported = await isSupported()
    if (!supported) {
      console.warn('Push notifications not supported in this browser')
      return null
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.warn('Notification permission denied')
      return null
    }

    const messaging = getMessaging(app)
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    })

    if (token) {
      // Save token to Supabase
      await saveTokenToSupabase(token, userName)
      return token
    }

    return null
  } catch (error) {
    console.error('Error getting notification permission:', error)
    return null
  }
}

// Save/update token in Supabase push_tokens table
const saveTokenToSupabase = async (token: string, userName: string) => {
  const { supabase } = await import('./supabase')

  // Upsert: if token exists update it, if not create it
  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      {
        user_name: userName,
        fcm_token: token,
        platform: detectPlatform(),
        user_agent: navigator.userAgent,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'fcm_token' }
    )

  if (error) console.error('Error saving push token:', error)
}

// Detect platform for analytics
const detectPlatform = (): string => {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'web'
}

// Listen for notifications while app is open (foreground)
export const setupForegroundNotifications = async () => {
  const supported = await isSupported()
  if (!supported) return

  const messaging = getMessaging(app)

  onMessage(messaging, (payload) => {
    console.log('Foreground notification received:', payload)

    // Show notification manually when app is open
    // (browsers don't auto-show when app is in foreground)
    if (payload.notification) {
      const { title, body } = payload.notification
      new Notification(title ?? 'Autobee', {
        body: body ?? '',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
      })
    }
  })
}

export { app }
