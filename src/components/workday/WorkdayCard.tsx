"use client";

import { useState, useEffect, useMemo } from "react";
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
  Building2,
  Clock,
  Sparkles,
} from "lucide-react";
import { useWorkdayStore } from "@/store/useWorkdayStore";
import { useUIStore } from "@/store/useUIStore";
import { getISTDateInfo } from "@/lib/supabase/workday";
import type { FounderName } from "@/lib/types";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { WorkdaySwipeAction } from "./WorkdaySwipeAction";
import { WorkdayLiveHeroTimer } from "./WorkdayLiveHeroTimer";

type CheckInStage = "idle" | "locating" | "verifying" | "success";


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
  const { todayWorkdays, checkIn, checkOut, startBreak, endBreak, initRealtime } = useWorkdayStore();

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
  // BREAK STATE — Derived entirely from server workday record
  // All break logic is persisted server-side; no localStorage
  // ──────────────────────────────────────────────

  const [breakSubmitting, setBreakSubmitting] = useState(false);

  const isOnBreak = myWorkday?.status === "on_break";
  const breakStartedAt = myWorkday?.breakStartedAt ?? null;
  const totalBreakMs = myWorkday?.totalBreakMs ?? 0;

  const handleTakeBreak = async () => {
    if (isOnBreak || !myWorkday) return;
    setBreakSubmitting(true);
    try {
      await startBreak();
    } catch (err: any) {
      setActionError(getFriendlyAttendanceError(err));
    } finally {
      setBreakSubmitting(false);
    }
  };

  const handleResumeWork = async () => {
    if (!isOnBreak || !myWorkday) return;
    setBreakSubmitting(true);
    try {
      await endBreak();
    } catch (err: any) {
      setActionError(getFriendlyAttendanceError(err));
    } finally {
      setBreakSubmitting(false);
    }
  };

  // Completed workday duration: checkout - checkin - totalBreakMs (all server values)
  const completedDurationStr = useMemo(() => {
    if (!myWorkday || myWorkday.status !== "completed" || !myWorkday.checkInAt || !myWorkday.checkOutAt) {
      return null;
    }
    const start = new Date(myWorkday.checkInAt).getTime();
    const end = new Date(myWorkday.checkOutAt).getTime();
    const grossMs = Math.max(0, end - start);
    // Deduct server-authoritative break time
    const netMs = Math.max(0, grossMs - (myWorkday.totalBreakMs ?? 0));
    const hours = Math.floor(netMs / (1000 * 60 * 60));
    const mins = Math.floor((netMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m worked`;
  }, [myWorkday]);

  // Completed break duration for summary display (from server totalBreakMs)
  const completedBreakDurationStr = useMemo(() => {
    if (!myWorkday || myWorkday.status !== "completed" || !myWorkday.totalBreakMs) return null;
    const ms = myWorkday.totalBreakMs;
    if (ms <= 0) return null;
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    return hours > 0 ? `${hours}h ${mins}m break` : `${mins}m break`;
  }, [myWorkday]);

  function getFriendlyAttendanceError(rawError: any): string {
    const msg = typeof rawError === "string" ? rawError : rawError?.message || "";
    const lower = msg.toLowerCase();

    if (lower.includes("schema cache") || lower.includes("break_started_at") || lower.includes("total_break_ms")) {
      return "Database update pending: Please run migration 08_break_support.sql in Supabase SQL Editor.";
    }
    if (lower.includes("outside") || lower.includes("closer to the office") || lower.includes("office radius") || lower.includes("area")) {
      return "You're outside AutoBee HQ. Move within 150m to check in.";
    }
    if (lower.includes("permission_denied") || lower.includes("permission denied") || lower.includes("access required")) {
      return "Location permission required to check in.";
    }
    if (lower.includes("position_unavailable") || lower.includes("timeout") || lower.includes("accurate enough") || lower.includes("make sure location is enabled")) {
      return "Couldn't acquire GPS. Make sure location is enabled.";
    }
    if (lower.includes("closed")) {
      return "Check-in is closed for today (past 3:00 PM IST).";
    }
    return msg || "Couldn't complete request. Please try again.";
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

  const isAutoCheckout =
    myWorkday?.status === "completed" &&
    (myWorkday.checkOutSource === "auto_7pm" ||
      myWorkday.checkOutSource === "auto_7pm_cleanup");

  const cardStatus = !myWorkday
    ? "idle"
    : myWorkday.status === "on_break"
    ? "break"
    : myWorkday.status;

  return (
    <>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl sm:rounded-3xl border transition-all duration-500 backdrop-blur-2xl shadow-2xl",
          cardStatus === "working" &&
            "active-workday-card border-emerald-500/30 bg-[#0f1411]",
          cardStatus === "break" &&
            "break-workday-card border-amber-500/30 bg-[#16120c]",
          cardStatus === "completed" &&
            "border-white/[0.08] hover:border-white/[0.15] bg-[#121316]",
          cardStatus === "idle" &&
            "border-white/[0.08] hover:border-[#FFC107]/25 bg-[#141311]",
          cardStatus === "leave" &&
            "border-white/[0.08] bg-[#141212]"
        )}
        style={{
          background:
            cardStatus === "working"
              ? "radial-gradient(ellipse 65% 55% at 15% 15%, rgba(16, 185, 129, 0.16) 0%, transparent 70%), radial-gradient(ellipse 55% 50% at 85% 85%, rgba(255, 193, 7, 0.08) 0%, transparent 70%), linear-gradient(145deg, #111713 0%, #0d110f 50%, #0c0d0d 100%)"
              : cardStatus === "break"
              ? "radial-gradient(ellipse 65% 55% at 15% 15%, rgba(245, 158, 11, 0.16) 0%, transparent 70%), radial-gradient(ellipse 55% 50% at 85% 85%, rgba(255, 193, 7, 0.10) 0%, transparent 70%), linear-gradient(145deg, #18140e 0%, #12100c 50%, #0d0d0d 100%)"
              : cardStatus === "completed"
              ? "radial-gradient(ellipse 65% 55% at 15% 15%, rgba(59, 130, 246, 0.12) 0%, transparent 70%), radial-gradient(ellipse 55% 50% at 85% 85%, rgba(16, 185, 129, 0.06) 0%, transparent 70%), linear-gradient(145deg, #121419 0%, #0e1013 50%, #0c0d0d 100%)"
              : "radial-gradient(ellipse 65% 55% at 15% 15%, rgba(255, 193, 7, 0.12) 0%, transparent 70%), radial-gradient(ellipse 55% 50% at 85% 85%, rgba(16, 185, 129, 0.05) 0%, transparent 70%), linear-gradient(145deg, #161511 0%, #11100e 50%, #0d0d0d 100%)",
        }}
      >
        <div className="p-4 sm:p-5 relative z-10 space-y-4">
          {/* ──────────────────────────────────────────────
              1. INTEGRATED GREETING & FOUNDER HEADER BAR
          ────────────────────────────────────────────── */}
          {greeting && (
            <div className="pb-3 border-b border-white/[0.07] flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground whitespace-pre-line leading-tight">
                    {greeting.title}
                  </h1>
                  {greeting.role && (
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#FFC107]/15 text-[#FFC107] border border-[#FFC107]/30 uppercase self-start mt-0.5">
                      {greeting.role}
                    </span>
                  )}
                </div>

                {/* Overdue / Contextual Indicator: Subtle badge that coexists quietly */}
                {greeting.contextualLine && (
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {greeting.contextualLine.toLowerCase().includes("overdue") ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-[11px] font-semibold text-amber-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span>{greeting.contextualLine}</span>
                      </span>
                    ) : (
                      <p className="text-xs text-muted-foreground font-medium truncate">
                        {greeting.contextualLine}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {greeting.onAddClick && (
                <button
                  onClick={greeting.onAddClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 text-foreground text-xs font-semibold shadow-sm transition-all cursor-pointer shrink-0"
                >
                  <span className="text-[#FFC107] font-bold text-sm">+</span>
                  <span className="hidden sm:inline">Add</span>
                </button>
              )}
            </div>
          )}

          {/* ──────────────────────────────────────────────
              2. STATUS BADGE ROW + LOCATION & HISTORY
          ────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Main Status Pill */}
              {cardStatus === "working" ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.8 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-[10px] font-black text-emerald-300 shadow-sm">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  ACTIVE WORKDAY
                </div>
              ) : cardStatus === "break" ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.8 rounded-full bg-amber-500/15 border border-amber-500/35 text-[10px] font-black text-amber-300 shadow-sm">
                  <Coffee className="w-3 h-3 text-amber-400" />
                  ON BREAK
                </div>
              ) : cardStatus === "completed" ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.8 rounded-full bg-blue-500/15 border border-blue-500/30 text-[10px] font-black text-blue-300 shadow-sm">
                  <CheckCircle2 className="w-3 h-3 text-blue-400" />
                  {isAutoCheckout ? "AUTO-CLOSED (7 PM)" : "WORKDAY COMPLETE"}
                </div>
              ) : cardStatus === "leave" ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.8 rounded-full bg-white/[0.06] border border-white/10 text-[10px] font-bold text-muted-foreground">
                  MARKED LEAVE
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.8 rounded-full bg-[#FFC107]/15 border border-[#FFC107]/30 text-[10px] font-black text-[#FFC107] shadow-sm">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-[#FFC107] animate-pulse" />
                  OFFICE WORKDAY
                </div>
              )}

              {/* Office Location Indicator */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] text-muted-foreground font-mono">
                <Building2 className="w-3 h-3 text-[#FFC107]" />
                <span>AutoBee HQ · 150m</span>
              </div>
            </div>

            {/* Attendance History Trigger */}
            {onOpenHistory ? (
              <button
                onClick={onOpenHistory}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Calendar className="w-3 h-3 text-[#FFC107]" />
                <span>History</span>
              </button>
            ) : (
              <Link
                href="/attendance"
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Calendar className="w-3 h-3 text-[#FFC107]" />
                <span>History</span>
              </Link>
            )}
          </div>

          {/* ──────────────────────────────────────────────
              3. STATE A: IDLE / NOT CHECKED IN
          ────────────────────────────────────────────── */}
          {cardStatus === "idle" && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    {isAfter3PM ? "Attendance Closed for Today" : "Ready to start your workday?"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {isAfter3PM
                      ? "Daily check-in closed at 3:00 PM IST."
                      : "Verified within 150m of AutoBee Headquarters."}
                  </p>
                </div>

                {checkInStage !== "idle" && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FFC107]/10 border border-[#FFC107]/25 text-[#FFC107] text-xs font-semibold shrink-0">
                    {checkInStage === "locating" ? (
                      <div className="w-3.5 h-3.5 border-2 border-[#FFC107]/30 border-t-[#FFC107] rounded-full animate-spin" />
                    ) : checkInStage === "verifying" ? (
                      <Compass className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                    <span>{statusMessage}</span>
                  </div>
                )}
              </div>

              {/* Swipe Action Control for Check-In */}
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

          {/* ──────────────────────────────────────────────
              4. STATE B & C: ACTIVE WORKING OR ON BREAK
          ────────────────────────────────────────────── */}
          {(cardStatus === "working" || cardStatus === "break") && myWorkday && (
            <div className="space-y-4 pt-1">
              {/* Hero Dial & Metric Console */}
              <WorkdayLiveHeroTimer
                checkInAt={myWorkday.checkInAt}
                workDate={myWorkday.workDate}
                isOnBreak={isOnBreak}
                breakStartedAt={breakStartedAt}
                totalBreakMs={totalBreakMs}
              />

              {/* Swipe and Break Controls */}
              <WorkdaySwipeAction
                status={cardStatus}
                onCheckIn={handleCheckIn}
                onTakeBreak={handleTakeBreak}
                onResumeWork={handleResumeWork}
                onEndWorkday={() => setCheckoutModalOpen(true)}
              />
            </div>
          )}

          {/* ──────────────────────────────────────────────
              5. STATE D & E: COMPLETED / AUTO-CLOSED
          ────────────────────────────────────────────── */}
          {cardStatus === "completed" && myWorkday && (
            <div className="space-y-3 pt-1">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <h2 className="text-sm sm:text-base font-bold text-foreground">
                      {isAutoCheckout
                        ? "Automatically Closed at 7:00 PM"
                        : "Workday Successfully Completed"}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono flex-wrap">
                    <span>
                      {formattedCheckIn} → {formattedCheckOut || "7:00 PM"}
                    </span>
                    {completedDurationStr && (
                      <>
                        <span>·</span>
                        <span className="text-emerald-400 font-semibold">
                          {completedDurationStr}
                        </span>
                      </>
                    )}
                    {completedBreakDurationStr && (
                      <>
                        <span>·</span>
                        <span className="text-amber-300 font-semibold">
                          {completedBreakDurationStr}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs font-semibold shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Audit Verified</span>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────
              6. STATE F: MARKED LEAVE
          ────────────────────────────────────────────── */}
          {cardStatus === "leave" && (
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h2 className="text-xs sm:text-sm font-bold text-foreground">Marked Leave</h2>
                <p className="text-[11px] text-muted-foreground">
                  Today's office attendance is closed.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-muted-foreground text-xs font-semibold">
                Leave
              </span>
            </div>
          )}

          {/* ──────────────────────────────────────────────
              7. ERROR ALERT BANNER
          ────────────────────────────────────────────── */}
          <AnimatePresence>
            {actionError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="truncate text-[11px]">{actionError}</span>
                </div>
                {!myWorkday && !isAfter3PM && (
                  <button
                    onClick={handleCheckIn}
                    className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 font-bold text-[10px] shrink-0 transition-colors cursor-pointer"
                  >
                    RETRY
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
          8. MANUAL CHECKOUT MODAL
      ────────────────────────────────────────────── */}
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
              className="w-full sm:max-w-md rounded-2xl glass-card-premium p-4 sm:p-5 space-y-4 shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-foreground">
                    End your workday?
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Checked in: {formattedCheckIn}
                  </p>
                </div>
                <button
                  onClick={() => setCheckoutModalOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block font-semibold">
                    Today's Highlights{" "}
                    <span className="text-[9px] text-muted-foreground/60 font-normal">
                      (Optional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={progressNotes}
                    onChange={(e) => setProgressNotes(e.target.value)}
                    placeholder="Key achievements..."
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs outline-none focus:border-[#FFC107]/50 text-foreground transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block font-semibold">
                    Blockers / Challenges{" "}
                    <span className="text-[9px] text-muted-foreground/60 font-normal">
                      (Optional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={blockerNotes}
                    onChange={(e) => setBlockerNotes(e.target.value)}
                    placeholder="Any blockers..."
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs outline-none focus:border-[#FFC107]/50 text-foreground transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block font-semibold">
                    Tomorrow's Focus{" "}
                    <span className="text-[9px] text-muted-foreground/60 font-normal">
                      (Optional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={tomorrowNotes}
                    onChange={(e) => setTomorrowNotes(e.target.value)}
                    placeholder="First priority for tomorrow..."
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs outline-none focus:border-[#FFC107]/50 text-foreground transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCheckoutModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-foreground transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCheckout}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
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
