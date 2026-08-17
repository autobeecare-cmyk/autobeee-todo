"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Clock, LogOut, CheckCircle2, AlertCircle, Calendar,
  X, Compass, Radio, Check, ShieldCheck, ArrowRight
} from "lucide-react";
import { useWorkdayStore } from "@/store/useWorkdayStore";
import { useUIStore } from "@/store/useUIStore";
import { getISTDateInfo } from "@/lib/supabase/workday";
import type { FounderName } from "@/lib/types";
import { cn } from "@/lib/utils";

type CheckInStage = "idle" | "locating" | "verifying" | "success";

export function WorkdayCard({ onOpenHistory }: { onOpenHistory?: () => void }) {
  const currentUser = useUIStore((s) => s.currentUser) as FounderName;
  const { todayWorkdays, loading, error, checkIn, checkOut, initRealtime } = useWorkdayStore();

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [progressNotes, setProgressNotes] = useState("");
  const [blockerNotes, setBlockerNotes] = useState("");
  const [tomorrowNotes, setTomorrowNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [checkInStage, setCheckInStage] = useState<CheckInStage>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Initialize realtime subscriptions
  useEffect(() => {
    const unsub = initRealtime();
    return () => unsub();
  }, [initRealtime]);

  const myWorkday = todayWorkdays.find((w) => w.founderName === currentUser);
  const { isAfter3PM } = getISTDateInfo();

  // Real-time ticking timer with seconds for active workday
  const [activeTimer, setActiveTimer] = useState({
    formattedHoursMins: "0h 00m",
    formattedDigital: "00:00:00",
  });

  useEffect(() => {
    if (!myWorkday || myWorkday.status !== "working" || !myWorkday.checkInAt) return;

    const updateTimer = () => {
      const checkInTime = new Date(myWorkday.checkInAt).getTime();
      const now = Date.now();
      const diffMs = Math.max(0, now - checkInTime);

      const totalSecs = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;

      const pad = (n: number) => String(n).padStart(2, "0");

      setActiveTimer({
        formattedHoursMins: `${hours}h ${pad(mins)}m`,
        formattedDigital: `${pad(hours)}:${pad(mins)}:${pad(secs)}`,
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [myWorkday]);

  // Completed duration calculation
  const completedDurationStr = useMemo(() => {
    if (!myWorkday || myWorkday.status !== "completed" || !myWorkday.checkInAt || !myWorkday.checkOutAt) {
      return null;
    }
    const start = new Date(myWorkday.checkInAt).getTime();
    const end = new Date(myWorkday.checkOutAt).getTime();
    const diffMs = Math.max(0, end - start);
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m worked`;
  }, [myWorkday]);

  const handleCheckIn = async () => {
    setActionError(null);
    setCheckInStage("locating");
    setStatusMessage("Locating you...");

    const { isAfter3PM } = getISTDateInfo();
    if (isAfter3PM) {
      setActionError("Check-in is closed for today.");
      setCheckInStage("idle");
      setStatusMessage(null);
      return;
    }

    if (typeof window === "undefined" || !navigator.geolocation) {
      setActionError("Location is not supported by your browser/device.");
      setCheckInStage("idle");
      setStatusMessage(null);
      return;
    }

    setSubmitting(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude, accuracy } = pos.coords;
          const timestamp = pos.timestamp || Date.now();

          setCheckInStage("verifying");
          setStatusMessage("Verifying office location...");

          await checkIn({
            latitude,
            longitude,
            accuracy,
            timestamp,
          });

          setCheckInStage("success");
          setStatusMessage("You're in!");
          setActionError(null);

          setTimeout(() => {
            setCheckInStage("idle");
            setStatusMessage(null);
          }, 1200);
        } catch (err: any) {
          setActionError(err.message || "Check-in failed. Please try again.");
          setCheckInStage("idle");
          setStatusMessage(null);
        } finally {
          setSubmitting(false);
        }
      },
      (geoError) => {
        setSubmitting(false);
        setCheckInStage("idle");
        setStatusMessage(null);

        if (geoError.code === geoError.PERMISSION_DENIED) {
          setActionError("Location access required");
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE || geoError.code === geoError.TIMEOUT) {
          setActionError("Couldn't get your location. Make sure Location is enabled and try again.");
        } else {
          setActionError("Couldn't acquire location. Please try again.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
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
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border transition-all duration-300",
          myWorkday?.status === "working"
            ? "active-workday-card bg-gradient-to-b from-[#112017]/95 to-[#0b120e] border-emerald-500/30 shadow-[0_8px_28px_rgba(16,185,129,0.08)]"
            : myWorkday?.status === "completed"
            ? "bg-gradient-to-b from-[#14161b]/95 to-[#0e1014] border-blue-500/20 shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
            : "bg-gradient-to-b from-[#181611]/95 to-[#100f0c] border-[#FFC107]/20 shadow-[0_8px_28px_rgba(255,193,7,0.05)]"
        )}
      >
        <div className="p-4 sm:p-5 relative z-10">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              {myWorkday?.status === "working" ? (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  ACTIVE WORKDAY
                </div>
              ) : myWorkday?.status === "completed" ? (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-[10px] font-bold text-blue-400">
                  <CheckCircle2 className="w-3 h-3" />
                  WORKDAY COMPLETED
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FFC107]/15 border border-[#FFC107]/30 text-[10px] font-bold text-[#FFC107]">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-[#FFC107] animate-pulse" />
                  OFFICE WORKDAY
                </div>
              )}

              <span className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[9px] text-muted-foreground font-mono">
                AutoBee HQ · 150m
              </span>
            </div>

            {onOpenHistory && (
              <button
                onClick={onOpenHistory}
                className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/08 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Calendar className="w-3 h-3" />
                <span className="hidden sm:inline">History</span>
              </button>
            )}
          </div>

          {/* STATE A: NOT CHECKED IN */}
          {!myWorkday && (
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                  {isAfter3PM ? "Attendance Closed" : "Ready to start?"}
                </h2>
                <p className="text-xs text-muted-foreground truncate">
                  {isAfter3PM ? "Check-in closed for today." : "Check in to start your workday."}
                </p>
                {!isAfter3PM && (
                  <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground/80">
                    <div className="relative flex items-center justify-center w-3.5 h-3.5">
                      <span className="absolute w-3 h-3 rounded-full bg-[#FFC107]/30 animate-ping opacity-60" />
                      <MapPin className="w-3 h-3 text-[#FFC107] relative z-10" />
                    </div>
                    <span>Within 150m of AutoBee HQ</span>
                  </div>
                )}
              </div>

              <div className="shrink-0">
                {!isAfter3PM ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleCheckIn}
                    disabled={submitting}
                    className={cn(
                      "px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shadow-md transition-all",
                      checkInStage === "success"
                        ? "bg-emerald-500 text-[#0c1e14]"
                        : "bee-gradient text-[#111] checkin-btn-glow disabled:opacity-75"
                    )}
                  >
                    {checkInStage === "locating" ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-[#111]/30 border-t-[#111] rounded-full animate-spin" />
                        <span className="font-mono text-xs">LOCATING...</span>
                      </>
                    ) : checkInStage === "verifying" ? (
                      <>
                        <Compass className="w-3.5 h-3.5 text-[#111] animate-radar-sweep" />
                        <span className="font-mono text-xs">VERIFYING...</span>
                      </>
                    ) : checkInStage === "success" ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span className="font-mono text-xs">CHECKED IN ✓</span>
                      </>
                    ) : (
                      <>
                        <span>Check In</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </motion.button>
                ) : (
                  <span className="text-[11px] text-muted-foreground px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                    Closed
                  </span>
                )}
              </div>
            </div>
          )}

          {/* STATE B: ACTIVE WORKDAY (CHECKED IN) */}
          {myWorkday?.status === "working" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse" />
                    <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                      You're in
                    </h2>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Checked in at {formattedCheckIn} • Working for <strong className="text-foreground">{activeTimer.formattedHoursMins}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/[0.06]">
                {/* Live Running Digital Clock */}
                <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-emerald-500/20 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-mono text-xs font-bold text-emerald-300 tabular-nums tracking-wide">
                    {activeTimer.formattedDigital}
                  </span>
                </div>

                {/* End Workday CTA */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setCheckoutModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-muted-foreground hover:text-red-300 font-medium text-xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  End Workday
                </motion.button>
              </div>
            </div>
          )}

          {/* STATE C: COMPLETED */}
          {myWorkday?.status === "completed" && (
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  <h2 className="text-sm sm:text-base font-bold text-foreground">
                    Workday Complete
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  Checked in at {formattedCheckIn} · Checked out at {formattedCheckOut}
                </p>
                {completedDurationStr && (
                  <p className="text-xs font-semibold text-blue-400 pt-0.5">
                    {completedDurationStr}
                  </p>
                )}
              </div>

              <div className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold shrink-0 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Logged
              </div>
            </div>
          )}

          {/* STATE D: LEAVE */}
          {myWorkday?.status === "leave" && (
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h2 className="text-sm sm:text-base font-bold text-foreground">Marked Leave</h2>
                <p className="text-xs text-muted-foreground">Attendance closed for today.</p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/08 text-muted-foreground text-xs font-medium">
                Leave
              </span>
            </div>
          )}

          {/* Error Banner */}
          {actionError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2.5 p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span className="truncate">{actionError}</span>
              </div>
              {!myWorkday && !isAfter3PM && (
                <button
                  onClick={handleCheckIn}
                  className="px-2 py-0.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 font-bold text-[10px] shrink-0 cursor-pointer"
                >
                  RETRY
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      <AnimatePresence>
        {checkoutModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
            onClick={() => setCheckoutModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full sm:max-w-md rounded-2xl bg-[#141414] border border-white/10 p-5 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-foreground">End your workday?</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Checked in: {formattedCheckIn} · Current duration: {activeTimer.formattedHoursMins}
                  </p>
                </div>
                <button
                  onClick={() => setCheckoutModalOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 pt-1">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block font-medium">
                    Today's Highlights <span className="text-[10px] text-muted-foreground/60">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={progressNotes}
                    onChange={(e) => setProgressNotes(e.target.value)}
                    placeholder="Key achievements..."
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs outline-none focus:border-[#FFC107]/50 text-foreground"
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
                    placeholder="Any blockers..."
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs outline-none focus:border-[#FFC107]/50 text-foreground"
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
                    placeholder="Priority for tomorrow..."
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs outline-none focus:border-[#FFC107]/50 text-foreground"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCheckoutModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-foreground transition-all cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCheckout}
                  disabled={submitting}
                  className="flex-1 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                  ) : (
                    "END WORKDAY"
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
