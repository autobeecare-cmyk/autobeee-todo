'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X } from 'lucide-react'
import { requestNotificationPermission, setupForegroundNotifications } from '@/lib/firebase-messaging'

import { useUIStore } from '@/store/useUIStore'

export function NotificationPermission() {
  const { currentUser } = useUIStore()
  const [status, setStatus] = useState<'unknown' | 'granted' | 'denied' | 'unsupported'>('unknown')
  const [showBanner, setShowBanner] = useState(false)
  const [isEnabling, setIsEnabling] = useState(false)

  useEffect(() => {
    // Check current permission state
    if (!('Notification' in window)) {
      setStatus('unsupported')
      return
    }

    const currentPermission = Notification.permission
    if (currentPermission === 'granted') {
      setStatus('granted')
      // Re-register token on each app load (tokens can expire)
      requestNotificationPermission(currentUser)
      setupForegroundNotifications()
    } else if (currentPermission === 'denied') {
      setStatus('denied')
    } else {
      // 'default' — not yet asked
      // Show banner after 3 seconds
      const timer = setTimeout(() => setShowBanner(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [currentUser])

  const handleEnable = async () => {
    setIsEnabling(true)
    const token = await requestNotificationPermission(currentUser)
    if (token) {
      setStatus('granted')
      setShowBanner(false)
      await setupForegroundNotifications()
    } else {
      setStatus('denied')
    }
    setIsEnabling(false)
  }

  // Don't show anything if already granted or unsupported
  if (status === 'granted' || status === 'unsupported') return null

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:w-96"
        >
          <div className="glass-strong rounded-2xl p-4 shadow-2xl border border-white/08">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-amber-400 animate-swing" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">Enable notifications</p>
                <p className="text-xs text-white/50 mt-0.5">
                  Get alerts for task deadlines, meetings, and team updates
                </p>
                <div className="flex gap-2 mt-3">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleEnable}
                    disabled={isEnabling}
                    className="flex-1 bg-[#FFC107] hover:bg-[#FFC107]/90 text-black text-xs font-semibold py-2 px-3 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isEnabling ? 'Enabling...' : 'Enable'}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setShowBanner(false)}
                    className="px-3 py-2 text-xs text-white/40 hover:text-white/60 transition-colors cursor-pointer"
                  >
                    Later
                  </motion.button>
                </div>
              </div>
              <button
                onClick={() => setShowBanner(false)}
                className="text-white/30 hover:text-white/60 flex-shrink-0 p-0.5 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
