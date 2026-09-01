"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  CheckCircle2,
  AlertCircle,
  Calendar,
  X,
  Compass,
  Check,
  ShieldCheck,
  Coffee,
} from "lucide-react";
import { useWorkdayStore } from "@/store/useWorkdayStore";
import { useUIStore } from "@/store/useUIStore";
import { getISTDateInfo } from "@/lib/supabase/workday";
import type { FounderName } from "@/lib/types";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { WorkdaySwipeAction } from "./WorkdaySwipeAction";

type CheckInStage = "idle" | "locating" | "verifying" | "success";

interface BreakState {
  isOnBreak: boolean;
  breakStartTime: number | null;
  totalBreakMs: number;
}

export interface WorkdayGreetingInfo {
  title: string;
  role?: string;
  contextualLine?: string;
  onAddClick?: () => void;
}

export function WorkdayCard({
  onOpenHistory,
  greeting,
}: {
  onOpenHistory?: () => void;
  greeting?: WorkdayGreetingInfo;
}) {
  const currentUser = useUIStore((s) => s.currentUser) as FounderName;
  const { todayWorkdays, checkIn, checkOut, initRealtime } = useWorkdayStore();

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [progressNotes, setProgressNotes] = useState("");
  const [blockerNotes, setBlockerNotes] = useState("");
  const [tomorrowNotes, setTomorrowNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [checkInStage, setCheckInStage] = useState<CheckInStage>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = initRealtime();
    return () => unsub();
  }, [initRealtime]);

  const { dateStr, isAfter3PM } = getISTDateInfo();
  const myWorkday = todayWorkdays.find((w) => w.founderName === currentUser);

  // ──────────────────────────────────────────────
  // BREAK TRACKING (Stored safely in client per founder & date)
  // ──────────────────────────────────────────────
  const breakStorageKey = `autobee_break_${currentUser}_${dateStr}`;
  const [breakState, setBreakState] = useState<BreakState>(() => {
    if (typeof window === "undefined") return { isOnBreak: false, breakStartTime: null, totalBreakMs: 0 };
    try {
      const saved = localStorage.getItem(breakStorageKey);
      return saved ? JSON.parse(saved) : { isOnBreak: false, breakStartTime: null, totalBreakMs: 0 };
    } catch {
      return { isOnBreak: false, breakStartTime: null, totalBreakMs: 0 };
    }
  });

  const saveBreakState = useCallback((state: BreakState) => {
    setBreakState(state);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(breakStorageKey, JSON.stringify(state));
      } catch (e) {
        console.error("Failed to save break state:", e);
      }
    }
  }, [breakStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(breakStorageKey);
      setBreakState(saved ? JSON.parse(saved) : { isOnBreak: false, breakStartTime: null, totalBreakMs: 0 });
    } catch {
      setBreakState({ isOnBreak: false, breakStartTime: null, totalBreakMs: 0 });
    }
  }, [breakStorageKey]);

  const handleTakeBreak = () => {
    if (breakState.isOnBreak) return;
    saveBreakState({
      ...breakState,
      isOnBreak: true,
      breakStartTime: Date.now(),
    });
  };

  const handleResumeWork = () => {
    if (!breakState.isOnBreak || !breakState.breakStartTime) return;
    const additionalBreakMs = Math.max(0, Date.now() - breakState.breakStartTime);
    saveBreakState({
      isOnBreak: false,
      breakStartTime: null,
      totalBreakMs: breakState.totalBreakMs + additionalBreakMs,
    });
  };

  // ──────────────────────────────────────────────
  // LIVE TIMER CALCULATION
  // ──────────────────────────────────────────────
  const [activeTimer, setActiveTimer] = useState({
    formattedHoursMins: "0h 00m",
    formattedDigital: "00:00:00",
  });

  useEffect(() => {
    if (!myWorkday || myWorkday.status !== "working" || !myWorkday.checkInAt) return;

    const updateTimer = () => {
      const checkInTime = new Date(myWorkday.checkInAt).getTime();
      const now = Date.now();

      let currentBreakTotal = breakState.totalBreakMs;
      if (breakState.isOnBreak && breakState.breakStartTime) {
        currentBreakTotal += (now - breakState.breakStartTime);
      }

      const effectiveWorkMs = Math.max(0, (now - checkInTime) - currentBreakTotal);
      const totalSecs = Math.floor(effectiveWorkMs / 1000);
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
  }, [myWorkday, breakState]);

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

  function getFriendlyAttendanceError(rawError: any): string {
    const msg = typeof rawError === "string" ? rawError : rawError?.message || "";
    const lower = msg.toLowerCase();

    if (lower.includes("outside") || lower.includes("closer to the office") || lower.includes("office radius") || lower.includes("area")) {
      return "You're outside AutoBee HQ. Move within 150m to check in.";
    }
    if (lower.includes("permission_denied") || lower.includes("permission denied") || lower.includes("access required")) {
      return "Location permission required to check in.";
    }
    if (lower.includes("position_unavailable") || lower.includes("timeout") || lower.includes("accurate enough") || lower.includes("make sure location is enabled")) {
      return "Couldn't acquire location. Ensure GPS is enabled and retry.";
    }
    if (lower.includes("closed")) {
      return "Check-in is closed for today (past 3:00 PM IST).";
    }
    return "Couldn't check you in. Try again.";
  }

  const handleCheckIn = async () => {
    setActionError(null);
    setCheckInStage("locating");
    setStatusMessage("Locating...");

    const { isAfter3PM: afterCutoff } = getISTDateInfo();
    if (afterCutoff) {
      setActionError("Check-in is closed for today (past 3:00 PM IST).");
      setCheckInStage("idle");
      setStatusMessage(null);
      return;
    }

    if (typeof window === "undefined" || !navigator.geolocation) {
      setActionError("Location is not supported by your browser.");
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
          setStatusMessage("Verifying HQ 150m...");

          await checkIn({
            latitude,
            longitude,
            accuracy,
            timestamp,
          });

          setCheckInStage("success");
          setStatusMessage("You're in ✓");
          setActionError(null);

          setTimeout(() => {
            setCheckInStage("idle");
            setStatusMessage(null);
          }, 900);
        } catch (err: any) {
          console.error("Check-in failed:", err);
          setActionError(getFriendlyAttendanceError(err));
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
          setActionError("Location permission required to check in.");
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE || geoError.code === geoError.TIMEOUT) {
          setActionError("Couldn't acquire GPS. Make sure location is enabled.");
        } else {
          setActionError("Location acquisition failed. Please retry.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
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

      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(breakStorageKey);
        } catch {}
      }
      setBreakState({ isOnBreak: false, breakStartTime: null, totalBreakMs: 0 });

      setCheckoutModalOpen(false);
      setProgressNotes("");
      setBlockerNotes("");
      setTomorrowNotes("");
    } catch (err: any) {
      console.error("Checkout failed:", err);
      setActionError("Something went wrong while ending your workday.");
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

  const formattedBreakStart = breakState.breakStartTime
    ? new Date(breakState.breakStartTime).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  const cardStatus = !myWorkday
    ? "idle"
    : myWorkday.status === "working"
    ? breakState.isOnBreak
      ? "break"
      : "working"
    : myWorkday.status;

  return (
    <>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border transition-all duration-300 backdrop-blur-xl shadow-xl",
          cardStatus === "working" && "border-emerald-500/30 shadow-[0_8px_32px_rgba(16,185,129,0.12)]",
          cardStatus === "break" && "border-amber-500/30 shadow-[0_8px_32px_rgba(245,158,11,0.12)]",
          cardStatus === "completed" && "border-blue-500/30 shadow-[0_8px_32px_rgba(59,130,246,0.12)]",
          cardStatus === "idle" && "border-white/10 hover:border-[#FFC107]/30 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
        )}
        style={{
          background:
            cardStatus === "working"
              ? "radial-gradient(ellipse at 10% 15%, rgba(16, 185, 129, 0.18) 0%, transparent 60%), radial-gradient(ellipse at 90% 85%, rgba(255, 193, 7, 0.12) 0%, transparent 60%), linear-gradient(145deg, #181d19 0%, #121513 50%, #141414 100%)"
              : cardStatus === "break"
              ? "radial-gradient(ellipse at 10% 15%, rgba(245, 158, 11, 0.18) 0%, transparent 60%), radial-gradient(ellipse at 90% 85%, rgba(255, 193, 7, 0.12) 0%, transparent 60%), linear-gradient(145deg, #1d1914 0%, #151311 50%, #141414 100%)"
              : cardStatus === "completed"
              ? "radial-gradient(ellipse at 10% 15%, rgba(59, 130, 246, 0.18) 0%, transparent 60%), radial-gradient(ellipse at 90% 85%, rgba(16, 185, 129, 0.10) 0%, transparent 60%), linear-gradient(145deg, #141822 0%, #101217 50%, #141414 100%)"
              : "radial-gradient(ellipse at 10% 15%, rgba(255, 193, 7, 0.16) 0%, transparent 60%), radial-gradient(ellipse at 90% 85%, rgba(16, 185, 129, 0.08) 0%, transparent 60%), linear-gradient(145deg, #1c1a14 0%, #141311 50%, #141414 100%)",
        }}
      >
        <div className="p-4 sm:p-4.5 relative z-10 space-y-3">
          {/* Optional Integrated Greeting Header inside Card */}
          {greeting && (
            <div className="pb-3 border-b border-white/[0.08] flex items-start justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground whitespace-pre-line leading-tight">
                    {greeting.title}
                  </h1>
                  {greeting.role && (
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#FFC107]/15 text-[#FFC107] border border-[#FFC107]/30 uppercase self-start mt-0.5">
                      {greeting.role}
                    </span>
                  )}
                </div>
                {greeting.contextualLine && (
                  <p className="text-xs text-muted-foreground font-medium truncate">
                    {greeting.contextualLine}
                  </p>
                )}
              </div>

              {greeting.onAddClick && (
                <button
                  onClick={greeting.onAddClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-foreground text-xs font-semibold shadow-sm transition-all cursor-pointer shrink-0"
                >
                  <span className="text-[#FFC107] font-bold text-sm">+</span>
                  <span className="hidden sm:inline">Add</span>
                </button>
              )}
            </div>
          )}

          {/* Status Row: Compact status + AutoBee HQ 150m pill + History entry */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {cardStatus === "working" ? (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 shadow-sm">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  ACTIVE WORKDAY
                </div>
              ) : cardStatus === "break" ? (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-300">
                  <Coffee className="w-3 h-3 text-amber-400" />
                  ON BREAK
                </div>
              ) : cardStatus === "completed" ? (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-[10px] font-bold text-blue-400">
                  <CheckCircle2 className="w-3 h-3" />
                  WORKDAY COMPLETED
                </div>
              ) : (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFC107]/15 border border-[#FFC107]/30 text-[10px] font-bold text-[#FFC107]">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-[#FFC107] animate-pulse" />
                  OFFICE WORKDAY
                </div>
              )}

              <span className="px-1.5 py-0.2 rounded bg-white/[0.04] border border-white/[0.06] text-[9px] text-muted-foreground font-mono">
                AutoBee HQ · 150m
              </span>
            </div>

            {onOpenHistory ? (
              <button
                onClick={onOpenHistory}
                className="px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[10px] font-medium text-muted-foreground hover:text-foreground transition-all flex items-center gap-1 cursor-pointer"
              >
                <Calendar className="w-3 h-3 text-[#FFC107]" />
                <span>History</span>
              </button>
            ) : (
              <Link
                href="/attendance"
                className="px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[10px] font-medium text-muted-foreground hover:text-foreground transition-all flex items-center gap-1 cursor-pointer"
              >
                <Calendar className="w-3 h-3 text-[#FFC107]" />
                <span>History</span>
              </Link>
            )}
          </div>

          {/* STATE A: NOT CHECKED IN */}
          {cardStatus === "idle" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-foreground">
                    {isAfter3PM ? "Attendance Closed" : "Ready to start?"}
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    {isAfter3PM
                      ? "Check-in closed for today (past 3:00 PM IST)."
                      : "Within 150m of AutoBee HQ"}
                  </p>
                </div>

                {checkInStage !== "idle" && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#FFC107]/10 border border-[#FFC107]/20 text-[#FFC107] text-[11px] font-semibold">
                    {checkInStage === "locating" ? (
                      <div className="w-3 h-3 border-2 border-[#FFC107]/30 border-t-[#FFC107] rounded-full animate-spin" />
                    ) : checkInStage === "verifying" ? (
                      <Compass className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3 stroke-[3]" />
                    )}
                    <span>{statusMessage}</span>
                  </div>
                )}
              </div>

              {/* Compact Swipe Action Control */}
              <WorkdaySwipeAction
                status="idle"
                isAfter3PM={isAfter3PM}
                submitting={submitting}
                onCheckIn={handleCheckIn}
                onTakeBreak={handleTakeBreak}
                onResumeWork={handleResumeWork}
                onEndWorkday={() => setCheckoutModalOpen(true)}
              />
            </div>
          )}

          {/* STATE B: ACTIVE WORKDAY (WORKING) */}
          {cardStatus === "working" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-foreground truncate">
                    You're in AutoBee HQ
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    {formattedCheckIn} · Working <strong className="text-emerald-400 font-mono">{activeTimer.formattedHoursMins}</strong>
                  </p>
                </div>

                {/* Compact Running Digital Clock */}
                <div className="px-2 py-0.5 rounded-lg bg-black/40 border border-emerald-500/25 flex items-center gap-1.5 shrink-0 shadow-inner">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-mono text-xs font-bold text-emerald-300 tabular-nums">
                    {activeTimer.formattedDigital}
                  </span>
                </div>
              </div>

              {/* Compact Swipe Controls */}
              <WorkdaySwipeAction
                status="working"
                onCheckIn={handleCheckIn}
                onTakeBreak={handleTakeBreak}
                onResumeWork={handleResumeWork}
                onEndWorkday={() => setCheckoutModalOpen(true)}
              />
            </div>
          )}

          {/* STATE C: ON BREAK */}
          {cardStatus === "break" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-amber-300">
                    On Break
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Started {formattedBreakStart} · Logged {activeTimer.formattedHoursMins}
                  </p>
                </div>

                <div className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 font-mono text-[11px] font-bold">
                  PAUSED
                </div>
              </div>

              <WorkdaySwipeAction
                status="break"
                onCheckIn={handleCheckIn}
                onTakeBreak={handleTakeBreak}
                onResumeWork={handleResumeWork}
                onEndWorkday={() => setCheckoutModalOpen(true)}
              />
            </div>
          )}

          {/* STATE D: COMPLETED */}
          {cardStatus === "completed" && (
            <div className="flex items-center justify-between gap-2 py-0.5">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <h2 className="text-xs sm:text-sm font-bold text-foreground truncate">
                    Workday Completed
                  </h2>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {formattedCheckIn} – {formattedCheckOut} {completedDurationStr && `· ${completedDurationStr}`}
                </p>
              </div>

              <div className="px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-400 text-[10px] font-bold flex items-center gap-1 shrink-0">
                <ShieldCheck className="w-3 h-3" />
                <span>Logged</span>
              </div>
            </div>
          )}

          {/* STATE E: LEAVE */}
          {cardStatus === "leave" && (
            <div className="flex items-center justify-between gap-2 py-0.5">
              <div className="space-y-0.5">
                <h2 className="text-xs sm:text-sm font-bold text-foreground">Marked Leave</h2>
                <p className="text-[11px] text-muted-foreground">Attendance closed for today.</p>
              </div>
              <span className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/10 text-muted-foreground text-[10px] font-semibold">
                Leave
              </span>
            </div>
          )}

          {/* Friendly Error Alert Box */}
          <AnimatePresence>
            {actionError && (
              <motion.div
                initial={{ opacity: 0, y: -3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                className="p-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span className="text-[11px] truncate">{actionError}</span>
                </div>
                {!myWorkday && !isAfter3PM && (
                  <button
                    onClick={handleCheckIn}
                    className="px-2 py-0.5 rounded-md bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 font-bold text-[9px] shrink-0 transition-colors cursor-pointer"
                  >
                    RETRY
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Manual Checkout Modal */}
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
              className="w-full sm:max-w-md rounded-2xl glass-card-premium p-4 sm:p-5 space-y-3.5 shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-foreground">End your workday?</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Checked in: {formattedCheckIn} · Duration: {activeTimer.formattedHoursMins}
                  </p>
                </div>
                <button
                  onClick={() => setCheckoutModalOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 pt-1">
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block font-semibold">
                    Today's Highlights <span className="text-[9px] text-muted-foreground/60 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={progressNotes}
                    onChange={(e) => setProgressNotes(e.target.value)}
                    placeholder="Key achievements..."
                    className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs outline-none focus:border-[#FFC107]/50 text-foreground"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block font-semibold">
                    Blockers / Challenges <span className="text-[9px] text-muted-foreground/60 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={blockerNotes}
                    onChange={(e) => setBlockerNotes(e.target.value)}
                    placeholder="Any blockers..."
                    className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs outline-none focus:border-[#FFC107]/50 text-foreground"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block font-semibold">
                    Tomorrow's Focus <span className="text-[9px] text-muted-foreground/60 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={tomorrowNotes}
                    onChange={(e) => setTomorrowNotes(e.target.value)}
                    placeholder="First priority for tomorrow..."
                    className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs outline-none focus:border-[#FFC107]/50 text-foreground"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCheckoutModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-foreground transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCheckout}
                  disabled={submitting}
                  className="flex-1 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {submitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                  ) : (
                    "End Workday"
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
