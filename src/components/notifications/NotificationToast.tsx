"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  X,
  MapPin,
  LogOut,
  Clock,
  AlertCircle,
  DollarSign,
  Calendar,
  CheckSquare,
  Target,
} from "lucide-react";
import { useNotificationStore } from "@/store/useNotificationStore";

export function NotificationToast() {
  const { toasts, dismissToast } = useNotificationStore();

  // RACE-4 fix: initRealtime() is called by Providers.tsx which is mounted above us.
  // Calling it here too caused a second Supabase channel subscription whose cleanup
  // was lost (the guard returns a no-op), leaving dangling realtime channels.

  // BUG-10 fix: Auto-dismiss each toast after 6 seconds
  useEffect(() => {
    if (toasts.length === 0) return;
    const latest = toasts[toasts.length - 1];
    const timer = setTimeout(() => dismissToast(latest.id), 6000);
    return () => clearTimeout(timer);
  }, [toasts, dismissToast]);

  const getIcon = (type: string) => {
    switch (type) {
      case "check_in":
        return <MapPin className="w-4 h-4" />;
      case "check_out":
        return <LogOut className="w-4 h-4" />;
      case "auto_check_out":
        return <Clock className="w-4 h-4" />;
      case "check_in_reminder":
        return <AlertCircle className="w-4 h-4" />;
      case "settlement":
      case "expense":
        return <DollarSign className="w-4 h-4" />;
      case "meeting":
      case "meeting_alert":
      case "meeting_change":
        return <Calendar className="w-4 h-4" />;
      case "task":
      case "task_reminder":
        return <CheckSquare className="w-4 h-4" />;
      case "goal":
      case "goal_reminder":
        return <Target className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

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
                {getIcon(toast.type)}
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-foreground">{toast.title}</div>
                <div className="text-xs text-muted-foreground">{toast.body}</div>
              </div>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
