// Firebase messaging service worker
// This handles push notifications when the app is closed or in background

importScripts('https://www.gstatic.com/firebasejs/11.8.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/11.8.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyDiKRJmSxHgPGBMywES7lOen-ljwlR1-C0',
  authDomain: 'autobee-notificationstodo.firebaseapp.com',
  projectId: 'autobee-notificationstodo',
  messagingSenderId: '234480900683',
  appId: '1:234480900683:web:e3a3a1c2d113f172508bce',
})

const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload)

  const data = payload.data || {}
  const title = payload.notification?.title || data.title || 'AutoBee OS'
  const body = payload.notification?.body || data.body || ''

  const isHighPriority =
    data.priority === 'high' ||
    data.type === 'meeting_alert' ||
    data.type === 'auto_check_out' ||
    data.type === 'check_in_reminder' ||
    data.type === 'task_reminder'

  const notificationOptions = {
    body: body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.entity_id ? `autobee-${data.entity_id}` : `autobee-${data.type || 'msg'}-${Date.now()}`,
    data: data,
    actions: getActions(data.type),
    requireInteraction: isHighPriority,
    vibrate: isHighPriority ? [200, 100, 200] : [100],
  }

  return self.registration.showNotification(title, notificationOptions)
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data || {}
  let url = data.url || '/'

  if (!data.url) {
    switch (data.type) {
      case 'check_in':
      case 'check_out':
      case 'auto_leave':
      case 'auto_check_out':
      case 'check_in_reminder':
      case 'attendance':
        url = '/'
        break
      case 'task':
      case 'task_reminder':
        url = '/tasks'
        break
      case 'meeting':
      case 'meeting_alert':
      case 'meeting_change':
        url = '/meetings'
        break
      case 'goal':
      case 'goal_reminder':
        url = '/goals'
        break
      case 'settlement':
      case 'expense':
        url = '/money'
        break
      case 'partner_update':
        url = '/partners'
        break
      default:
        url = '/'
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client && url) {
            client.navigate(url)
          }
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
  switch (type) {
    case 'meeting_alert':
      return [
        { action: 'view', title: '📅 View Meeting' },
        { action: 'dismiss', title: 'Dismiss' },
      ]
    case 'task':
    case 'task_reminder':
      return [
        { action: 'view', title: '✅ View Tasks' },
      ]
    case 'check_in':
    case 'check_out':
    case 'auto_check_out':
    case 'check_in_reminder':
    case 'auto_leave':
      return [
        { action: 'view', title: '🐝 View Attendance' },
      ]
    case 'goal':
    case 'goal_reminder':
      return [
        { action: 'view', title: '🎯 View Goals' },
      ]
    case 'settlement':
    case 'expense':
      return [
        { action: 'view', title: '💰 View Money' },
      ]
    default:
      return []
  }
}
