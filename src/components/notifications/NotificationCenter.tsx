"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, X, Calendar, MapPin, LogOut, DollarSign } from "lucide-react";
import { useNotificationStore } from "@/store/useNotificationStore";

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotificationStore();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-foreground transition-all"
        title="Notifications"
      >
        <Bell className="w-4 h-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#FFC107] text-[10px] font-bold text-[#111]">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 z-50 w-80 sm:w-96 rounded-2xl bg-[#141414] border border-white/10 p-4 shadow-2xl space-y-3"
            >
              <div className="flex items-center justify-between border-b border-white/05 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFC107]/10 text-[#FFC107] font-medium">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead()}
                    className="text-xs text-[#FFC107] hover:underline flex items-center gap-1 font-medium"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        !n.read
                          ? "bg-[#FFC107]/05 border-[#FFC107]/20 text-foreground"
                          : "bg-white/5 border-white/05 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium text-foreground">{n.title}</div>
                        <div className="text-[10px] text-muted-foreground shrink-0 font-mono">
                          {new Date(n.createdAt).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <div className="text-muted-foreground mt-0.5">{n.body}</div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
