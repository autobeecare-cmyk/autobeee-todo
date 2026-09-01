"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, X, CheckCircle2, AlertCircle, Info, Sparkles } from "lucide-react";
import { useNotificationStore } from "@/store/useNotificationStore";
import { formatDistanceToNow, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotificationStore();

  const getRelativeTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
    } catch {
      return "recently";
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-foreground transition-all cursor-pointer"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="w-4 h-4 text-muted-foreground hover:text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#FFC107] text-[10px] font-bold text-[#111] shadow-[0_0_8px_rgba(255,193,7,0.4)]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 mt-2 z-50 w-80 sm:w-96 rounded-2xl bg-[#141414]/95 border border-white/10 p-4 shadow-2xl backdrop-blur-xl space-y-3"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-foreground">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFC107]/15 text-[#FFC107] font-bold border border-[#FFC107]/30">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead()}
                    className="text-xs text-[#FFC107] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400/50" />
                    <span>All caught up! No new notifications.</span>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={cn(
                        "p-3 rounded-xl border text-xs cursor-pointer transition-all duration-200",
                        !n.read
                          ? "bg-[#FFC107]/[0.06] border-[#FFC107]/25 text-foreground hover:bg-[#FFC107]/10"
                          : "bg-white/[0.02] border-white/[0.05] text-muted-foreground hover:bg-white/[0.04]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-foreground flex items-center gap-1.5 min-w-0 truncate">
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#FFC107] shrink-0" />}
                          <span className="truncate">{n.title}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                          {getRelativeTime(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[11px] mt-1 line-clamp-2 leading-relaxed">
                        {n.body}
                      </p>
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

