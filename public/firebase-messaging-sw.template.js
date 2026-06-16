// Firebase messaging service worker
// This handles push notifications when the app is closed or in background

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: self.FIREBASE_API_KEY || '__FIREBASE_API_KEY__',
  authDomain: self.FIREBASE_AUTH_DOMAIN || '__FIREBASE_AUTH_DOMAIN__',
  projectId: self.FIREBASE_PROJECT_ID || '__FIREBASE_PROJECT_ID__',
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || '__FIREBASE_MESSAGING_SENDER_ID__',
  appId: self.FIREBASE_APP_ID || '__FIREBASE_APP_ID__',
})

const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload)

  const { title, body } = payload.notification ?? {}
  const data = payload.data ?? {}

  self.registration.showNotification(title ?? 'Autobee OS', {
    body: body ?? '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: data.entity_id ?? 'autobee-notification',
    data: data,
    actions: getActions(data.type),
    requireInteraction: data.type === 'meeting_alert', // meetings stay until dismissed
  })
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data ?? {}
  let url = '/'

  // Navigate to relevant page when notification is clicked
  switch (data.type) {
    case 'task_reminder':
      url = '/tasks'
      break
    case 'meeting_alert':
    case 'meeting_change':
      url = '/meetings'
      break
    case 'partner_update':
      url = '/partners'
      break
    default:
      url = '/'
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

function getActions(type) {
  if (type === 'meeting_alert') {
    return [
      { action: 'view', title: '📅 View Meeting' },
      { action: 'dismiss', title: 'Dismiss' },
    ]
  }
  if (type === 'task_reminder') {
    return [
      { action: 'view', title: '✅ View Tasks' },
    ]
  }
  return []
}
