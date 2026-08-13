"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, LogOut, CheckCircle2, AlertCircle, Calendar, Sparkles, X } from "lucide-react";
import { useWorkdayStore } from "@/store/useWorkdayStore";
import { useUIStore } from "@/store/useUIStore";
import { getISTDateInfo } from "@/lib/supabase/workday";
import type { FounderName, Workday } from "@/lib/types";

export function WorkdayCard({ onOpenHistory }: { onOpenHistory?: () => void }) {
  const currentUser = useUIStore((s) => s.currentUser) as FounderName;
  const { todayWorkdays, loading, error, checkIn, checkOut, initRealtime } = useWorkdayStore();

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [progressNotes, setProgressNotes] = useState("");
  const [blockerNotes, setBlockerNotes] = useState("");
  const [tomorrowNotes, setTomorrowNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Initialize realtime subscriptions
  useEffect(() => {
    const unsub = initRealtime();
    return () => unsub();
  }, [initRealtime]);

  // Check server auto-leave if past 3 PM
  useEffect(() => {
    const { isAfter3PM } = getISTDateInfo();
    if (isAfter3PM) {
      fetch("/api/cron/auto-leave").catch(() => {});
    }
  }, []);

  const myWorkday = todayWorkdays.find((w) => w.founderName === currentUser);
  const { isAfter3PM } = getISTDateInfo();

  // Timer for duration when working
  const [durationStr, setDurationStr] = useState("0h 0m");

  useEffect(() => {
    if (!myWorkday || myWorkday.status !== "working") return;

    const updateTimer = () => {
      const checkInTime = new Date(myWorkday.checkInAt).getTime();
      const now = new Date().getTime();
      const diffMs = Math.max(0, now - checkInTime);
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      setDurationStr(`${hours}h ${mins}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 30000); // update every 30s
    return () => clearInterval(interval);
  }, [myWorkday]);

  const handleCheckIn = async () => {
    setActionError(null);
    setSubmitting(true);
    try {
      await checkIn();
    } catch (err: any) {
      setActionError(err.message || "Check-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCheckout = async () => {
    setActionError(null);
    setSubmitting(true);
    try {
      await checkOut({
        progress: progressNotes.trim() || undefined,
        blocker: blockerNotes.trim() || undefined,
        tomorrow: tomorrowNotes.trim() || undefined,
      });
      setCheckoutModalOpen(false);
      setProgressNotes("");
      setBlockerNotes("");
      setTomorrowNotes("");
    } catch (err: any) {
      setActionError(err.message || "Checkout failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formattedCheckIn = myWorkday?.checkInAt
    ? new Date(myWorkday.checkInAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  const formattedCheckOut = myWorkday?.checkOutAt
    ? new Date(myWorkday.checkOutAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#1c1c1c] to-[#121212] border border-white/10 p-5 sm:p-6 shadow-xl">
        {/* Glow effect */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#FFC107]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-[#FFC107] animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#FFC107]">
                Office Workday
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-muted-foreground font-mono">
                Only Office
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {!myWorkday
                ? isAfter3PM
                  ? "Today's Attendance Closed"
                  : "Office Check-In"
                : myWorkday.status === "working"
                ? "🟢 You're in the office"
                : myWorkday.status === "completed"
                ? "⚫ Workday Completed"
                : "⚪ Marked Leave"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {!myWorkday
                ? isAfter3PM
                  ? "No check-in recorded before 3:00 PM IST deadline."
                  : "Check in before 3:00 PM IST to record today's office attendance."
                : myWorkday.status === "working"
                ? `Checked in at ${formattedCheckIn} · Working for ${durationStr}`
                : myWorkday.status === "completed"
                ? `Checked in ${formattedCheckIn} · Checked out ${formattedCheckOut}`
                : "Automatically marked Leave (no check-in by 3:00 PM IST)."}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {onOpenHistory && (
              <button
                onClick={onOpenHistory}
                className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-foreground transition-all flex items-center gap-2"
              >
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                History
              </button>
            )}

            {!myWorkday && !isAfter3PM && (
              <button
                onClick={handleCheckIn}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bee-gradient text-[#111] font-bold text-sm shadow-lg shadow-[#FFC107]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-[#111]/30 border-t-[#111] rounded-full animate-spin" />
                ) : (
                  <>
                    <MapPin className="w-4 h-4" />
                    CHECK IN
                  </>
                )}
              </button>
            )}

            {myWorkday?.status === "working" && (
              <button
                onClick={() => setCheckoutModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-semibold text-sm transition-all flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                END DAY
              </button>
            )}

            {myWorkday?.status === "completed" && (
              <div className="px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed
              </div>
            )}

            {isAfter3PM && (!myWorkday || myWorkday.status === "leave") && (
              <div className="px-4 py-2 rounded-xl bg-gray-500/10 border border-gray-500/20 text-muted-foreground text-xs font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Leave (Closed)
              </div>
            )}
          </div>
        </div>

        {actionError && (
          <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      <AnimatePresence>
        {checkoutModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
            onClick={() => setCheckoutModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full sm:max-w-lg rounded-2xl bg-[#141414] border border-white/10 p-6 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-foreground">End your workday?</h3>
                  <p className="text-xs text-muted-foreground">
                    Checked in: {formattedCheckIn} · Current duration: {durationStr}
                  </p>
                </div>
                <button
                  onClick={() => setCheckoutModalOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block font-medium">
                    Today's Progress <span className="text-[10px] text-muted-foreground/60">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={progressNotes}
                    onChange={(e) => setProgressNotes(e.target.value)}
                    placeholder="Key achievements today..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-[#FFC107]/50 text-foreground"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block font-medium">
                    Blockers / Challenges <span className="text-[10px] text-muted-foreground/60">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={blockerNotes}
                    onChange={(e) => setBlockerNotes(e.target.value)}
                    placeholder="Any unresolved blockers..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-[#FFC107]/50 text-foreground"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block font-medium">
                    Tomorrow's Focus <span className="text-[10px] text-muted-foreground/60">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={tomorrowNotes}
                    onChange={(e) => setTomorrowNotes(e.target.value)}
                    placeholder="Main goal for tomorrow..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-[#FFC107]/50 text-foreground"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setCheckoutModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-foreground transition-all"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCheckout}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                  ) : (
                    "END DAY"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
