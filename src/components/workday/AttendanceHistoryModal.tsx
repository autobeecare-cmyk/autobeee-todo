"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, Award, AlertCircle, CheckCircle2 } from "lucide-react";
import { useWorkdayStore } from "@/store/useWorkdayStore";
import type { FounderName, Workday } from "@/lib/types";

const FOUNDERS: FounderName[] = ["Sourabh", "Asher", "Subin"];

export function AttendanceHistoryModal({ onClose }: { onClose: () => void }) {
  const { allWorkdays } = useWorkdayStore();

  // Founder summary metrics across all recorded workdays
  const founderStats = useMemo(() => {
    return FOUNDERS.map((f) => {
      const fLogs = allWorkdays.filter((w) => w.founderName === f);
      const officeDays = fLogs.filter((w) => w.status === "working" || w.status === "completed").length;
      const leaveDays = fLogs.filter((w) => w.status === "leave").length;

      let totalMinutes = 0;
      fLogs.forEach((w) => {
        if (w.checkInAt && w.checkOutAt) {
          const start = new Date(w.checkInAt).getTime();
          const end = new Date(w.checkOutAt).getTime();
          totalMinutes += Math.max(0, Math.floor((end - start) / 60000));
        } else if (w.checkInAt && w.status === "working") {
          const start = new Date(w.checkInAt).getTime();
          const autoCloseTime = new Date(`${w.workDate}T19:00:00+05:30`).getTime();
          const effectiveEnd = Math.min(autoCloseTime, start + (10 * 3600000));
          totalMinutes += Math.max(0, Math.floor((effectiveEnd - start) / 60000));
        }
      });

      const totalHoursStr = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;

      return {
        founder: f,
        officeDays,
        leaveDays,
        totalHoursStr,
      };
    });
  }, [allWorkdays]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl bg-[#141414] border border-white/10 p-6 space-y-6 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-foreground">Attendance History & Founder Workdays</h2>
            <p className="text-xs text-muted-foreground">Factual office check-in summary and logs</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Founder Review Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          {founderStats.map((stat) => (
            <div
              key={stat.founder}
              className="p-4 rounded-xl bg-white/5 border border-white/08 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">{stat.founder}</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-[#FFC107]/10 text-[#FFC107] font-medium">
                  {stat.officeDays} office days
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Total time:</span>
                <span className="font-mono text-foreground">{stat.totalHoursStr}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Leave days:</span>
                <span className="font-mono text-muted-foreground">{stat.leaveDays}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Logs Table */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Workday Logs
          </h3>

          {allWorkdays.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No workday records logged yet.
            </div>
          ) : (
            <div className="space-y-2">
              {allWorkdays.map((w) => {
                const inTime = w.checkInAt
                  ? new Date(w.checkInAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "—";

                const outTime = w.checkOutAt
                  ? new Date(w.checkOutAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "—";

                let durationStr = "—";
                if (w.checkInAt && w.checkOutAt) {
                  const diff = new Date(w.checkOutAt).getTime() - new Date(w.checkInAt).getTime();
                  const h = Math.floor(diff / (1000 * 60 * 60));
                  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                  durationStr = `${h}h ${m}m`;
                }

                return (
                  <div
                    key={w.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-white/5 border border-white/05 text-xs gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-foreground w-20">{w.founderName}</span>
                      <span className="text-muted-foreground font-mono">{w.workDate}</span>
                    </div>

                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-foreground font-mono">
                        {w.status === "working"
                          ? "Office (In)"
                          : w.status === "completed"
                          ? "Office"
                          : "Leave"}
                      </span>
                      <span>In: {inTime}</span>
                      <span>Out: {outTime}</span>
                      <span className="font-mono text-foreground">{durationStr}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
