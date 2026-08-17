'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  RefreshCw,
  Smartphone,
  Laptop,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useUIStore } from '@/store/useUIStore'
import {
  getNotificationDiagnostics,
  sendTestPushNotification,
  requestNotificationPermission,
} from '@/lib/firebase-messaging'

export function PushDiagnostics() {
  const { currentUser } = useUIStore()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [testingPush, setTestingPush] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [diagnostics, setDiagnostics] = useState<{
    pushSupported: boolean
    permission: string
    serviceWorkerActive: boolean
    activeTokensCount: number
    userTokens: any[]
    platform: string
  } | null>(null)

  const refreshDiagnostics = async () => {
    setLoading(true)
    try {
      const data = await getNotificationDiagnostics(currentUser)
      setDiagnostics(data)
    } catch (err) {
      console.error('Failed to load diagnostics:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (isOpen) {
      refreshDiagnostics()
    }
  }, [isOpen, currentUser])

  const handleTestPush = async () => {
    setTestingPush(true)
    setTestResult(null)
    try {
      const res = await sendTestPushNotification(currentUser)
      if (res && res.success) {
        setTestResult({
          success: true,
          message: `Test push sent successfully to ${res.data?.tokensCount || 'active'} device(s)!`,
        })
      } else {
        setTestResult({
          success: false,
          message: res.error || 'Failed to dispatch push notification.',
        })
      }
      refreshDiagnostics()
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Error occurred while sending test push.',
      })
    }
    setTestingPush(false)
  }

  const handleRegisterDevice = async () => {
    setLoading(true)
    const token = await requestNotificationPermission(currentUser)
    if (token) {
      setTestResult({
        success: true,
        message: 'Device successfully registered and token saved!',
      })
    } else {
      setTestResult({
        success: false,
        message: 'Permission was not granted or token generation failed.',
      })
    }
    await refreshDiagnostics()
    setLoading(false)
  }

  return (
    <div className="border-t border-white/05 bg-white/[0.01]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/03 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 font-medium">
          <Activity className="w-3.5 h-3.5 text-[#FFC107]" />
          <span>Push Notification Health & Diagnostics</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-5 pb-5 pt-1 space-y-4 text-xs"
          >
            {/* Status Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 rounded-xl bg-white/03 border border-white/05 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Push Supported</p>
                <div className="flex items-center gap-1.5 font-medium">
                  {diagnostics?.pushSupported ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="capitalize">{diagnostics?.pushSupported ? 'Yes' : 'No'}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/03 border border-white/05 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Permission</p>
                <div className="flex items-center gap-1.5 font-medium">
                  {diagnostics?.permission === 'granted' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : diagnostics?.permission === 'denied' ? (
                    <XCircle className="w-4 h-4 text-red-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="capitalize">{diagnostics?.permission || 'Checking...'}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/03 border border-white/05 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Service Worker</p>
                <div className="flex items-center gap-1.5 font-medium">
                  {diagnostics?.serviceWorkerActive ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                  <span>{diagnostics?.serviceWorkerActive ? 'Active' : 'Unregistered'}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/03 border border-white/05 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Active Tokens</p>
                <div className="flex items-center gap-1.5 font-medium">
                  <Smartphone className="w-4 h-4 text-[#FFC107]" />
                  <span>{diagnostics ? `${diagnostics.activeTokensCount} device(s)` : '...'}</span>
                </div>
              </div>
            </div>

            {/* Registered Devices List for currentUser */}
            {diagnostics && diagnostics.userTokens && diagnostics.userTokens.length > 0 && (
              <div className="p-3 rounded-xl bg-white/02 border border-white/05 space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                  Registered Devices for {currentUser}
                </p>
                <div className="space-y-1.5">
                  {diagnostics.userTokens.map((t: any) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-white/03"
                    >
                      <div className="flex items-center gap-2">
                        {t.platform === 'ios' || t.platform === 'android' ? (
                          <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <Laptop className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <span className="capitalize font-medium">{t.platform || 'Device'}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ({t.fcm_token.slice(0, 10)}...{t.fcm_token.slice(-6)})
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(t.updated_at || t.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Result alert */}
            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={handleTestPush}
                disabled={testingPush}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FFC107] text-black font-semibold text-xs hover:bg-[#FFC107]/90 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{testingPush ? 'Dispatching...' : 'Send Test Push Notification'}</span>
              </button>

              <button
                onClick={handleRegisterDevice}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/05 text-foreground hover:bg-white/10 border border-white/05 text-xs transition-colors cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Re-register Current Device</span>
              </button>

              <button
                onClick={refreshDiagnostics}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/05 text-muted-foreground hover:text-foreground hover:bg-white/10 border border-white/05 text-xs transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Status</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
