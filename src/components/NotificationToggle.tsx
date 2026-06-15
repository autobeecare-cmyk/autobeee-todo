'use client'

import { useState, useEffect } from 'react'
import { requestNotificationPermission } from '@/lib/firebase-messaging'
import { useUIStore } from '@/store/useUIStore'

export function NotificationToggle() {
  const { currentUser } = useUIStore()
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setEnabled(Notification.permission === 'granted')
    }
  }, [])

  const toggle = async () => {
    if (!enabled) {
      const token = await requestNotificationPermission(currentUser)
      setEnabled(!!token)
    } else {
      // Can't programmatically revoke — direct user to browser settings
      alert('To disable, go to your browser Settings → Notifications → Block for this site')
    }
  }

  return (
    <button
      onClick={toggle}
      className={`w-10 h-5.5 rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${
        enabled ? 'bg-[#FFC107]' : 'bg-white/10'
      }`}
      style={{ height: '22px', width: '40px' }}
    >
      <div
        className="absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform"
        style={{
          width: '18px',
          height: '18px',
          transform: enabled ? 'translateX(20px)' : 'translateX(2px)',
        }}
      />
    </button>
  )
}
