"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, MapPin, LogOut, AlertCircle, DollarSign } from "lucide-react";
import { useNotificationStore } from "@/store/useNotificationStore";

export function NotificationToast() {
  const { toasts, dismissToast, initRealtime } = useNotificationStore();

  useEffect(() => {
    const unsub = initRealtime();
    return () => unsub();
  }, [initRealtime]);

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-xl bg-[#1a1a1a] border border-[#FFC107]/30 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#FFC107]/10 text-[#FFC107] shrink-0 mt-0.5">
                {toast.type === "check_in" ? (
                  <MapPin className="w-4 h-4" />
                ) : toast.type === "check_out" ? (
                  <LogOut className="w-4 h-4" />
                ) : toast.type === "settlement" ? (
                  <DollarSign className="w-4 h-4" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-foreground">{toast.title}</div>
                <div className="text-xs text-muted-foreground">{toast.body}</div>
              </div>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
