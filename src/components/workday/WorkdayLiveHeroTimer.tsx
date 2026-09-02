"use client";

import { useState, useEffect, useMemo } from "react";
import { Coffee, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkdayLiveHeroTimerProps {
  checkInAt: string;
  workDate: string; // YYYY-MM-DD
  isOnBreak: boolean;
  breakStartTime: number | null;
  storedBreakMs: number;
  className?: string;
}

export function WorkdayLiveHeroTimer({
  checkInAt,
  workDate,
  isOnBreak,
  breakStartTime,
  storedBreakMs,
  className,
}: WorkdayLiveHeroTimerProps) {
  // Parse authoritative timestamps in UTC ms
  const checkInTimeMs = useMemo(() => {
    const t = new Date(checkInAt).getTime();
    return isNaN(t) ? Date.now() : t;
  }, [checkInAt]);

  // 7:00 PM Asia/Kolkata deadline for this workday
  const sevenPmTimeMs = useMemo(() => {
    try {
      const t = new Date(`${workDate}T19:00:00+05:30`).getTime();
      return isNaN(t) ? checkInTimeMs + 9 * 3600000 : t;
    } catch {
      return checkInTimeMs + 9 * 3600000;
    }
  }, [workDate, checkInTimeMs]);

  // Total window duration from Check-in to 7:00 PM
  const totalWindowMs = useMemo(() => {
    return Math.max(1000, sevenPmTimeMs - checkInTimeMs);
  }, [sevenPmTimeMs, checkInTimeMs]);

  // Local state updated on high-performance drift-free interval (1s)
  const [snapshot, setSnapshot] = useState(() => calculateSnapshot());

  function calculateSnapshot() {
    const now = Date.now();
    // Work duration and break cannot continue past 7:00 PM Asia/Kolkata
    const effectiveNow = Math.min(now, sevenPmTimeMs);
    const isPast7Pm = now >= sevenPmTimeMs;

    // Calculate dynamic break elapsed
    let currentBreakTotal = Math.max(0, storedBreakMs);
    let activeBreakElapsed = 0;
    if (isOnBreak && breakStartTime) {
      activeBreakElapsed = Math.max(0, effectiveNow - breakStartTime);
      currentBreakTotal += activeBreakElapsed;
    }

    // Effective work duration in ms: (current - checkIn) - totalBreak
    const grossElapsed = Math.max(0, effectiveNow - checkInTimeMs);
    const effectiveWorkMs = Math.max(0, grossElapsed - currentBreakTotal);

    // Progress toward 7:00 PM checkout (0 to 1)
    const progressFraction = Math.min(1, Math.max(0, grossElapsed / totalWindowMs));
    const progressPercent = Math.min(100, Math.round(progressFraction * 100));

    // Time remaining until 7:00 PM
    const remainingMs = Math.max(0, sevenPmTimeMs - now);

    return {
      effectiveWorkMs,
      currentBreakTotal,
      activeBreakElapsed,
      progressFraction,
      progressPercent,
      remainingMs,
      isPast7Pm,
    };
  }

  useEffect(() => {
    const tick = () => {
      setSnapshot(calculateSnapshot());
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [checkInTimeMs, sevenPmTimeMs, totalWindowMs, isOnBreak, breakStartTime, storedBreakMs]);

  // Format Helpers
  const pad = (n: number) => String(n).padStart(2, "0");

  const formatDigital = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  };

  const formatHoursMins = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${pad(mins)}m`;
  };

  // Subtle contextual microcopy
  const microcopy = useMemo(() => {
    if (snapshot.isPast7Pm) return "Workday closed at 7:00 PM.";
    if (isOnBreak) return "Recharge. We'll keep your time safe.";

    // Hours in Asia/Kolkata
    const istDate = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const h = istDate.getUTCHours();
    const m = istDate.getUTCMinutes();
    const timeDecimal = h + m / 60;

    if (timeDecimal < 12) return "Let's get started.";
    if (timeDecimal < 15) return "You're making good progress.";
    if (timeDecimal < 17.5) return "Keep the momentum.";
    return "Almost there.";
  }, [isOnBreak, snapshot.isPast7Pm]);

  // SVG Circular Ring Configuration
  const strokeWidth = 5.5;
  const radius = 54;
  const circumference = 2 * Math.PI * radius; // ~339.292
  const strokeDashoffset = circumference * (1 - snapshot.progressFraction);

  const workTimeDisplay = formatDigital(snapshot.effectiveWorkMs);
  const breakTimeDisplay = formatHoursMins(snapshot.currentBreakTotal);
  const activeBreakDisplay = formatDigital(snapshot.activeBreakElapsed);
  const remainingTimeDisplay = formatHoursMins(snapshot.remainingMs);

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4 p-3 sm:p-4 rounded-2xl",
        "bg-white/[0.02] border border-white/[0.06] backdrop-blur-md",
        className
      )}
    >
      {/* ── Circular Progress Dial ── */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg
          className="w-32 h-32 sm:w-36 sm:h-36 -rotate-90 transform"
          viewBox="0 0 128 128"
          aria-hidden="true"
        >
          {/* Subtle Ambient Background Ring */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            className="stroke-white/[0.06] fill-none"
            strokeWidth={strokeWidth}
          />

          {/* Glowing Animated Progress Ring */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            className={cn(
              "fill-none transition-all duration-700 ease-out",
              isOnBreak
                ? "stroke-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                : "stroke-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"
            )}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        {/* Center Content of Dial */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none select-none">
          <span
            className={cn(
              "text-[9px] font-black uppercase tracking-wider mb-0.5",
              isOnBreak ? "text-amber-400" : "text-emerald-400"
            )}
          >
            {isOnBreak ? "ON BREAK" : "WORKING TIME"}
          </span>

          {/* Hero Digital Timer */}
          <span
            className={cn(
              "font-mono font-black text-xl sm:text-2xl tabular-nums tracking-tight leading-none",
              isOnBreak ? "text-amber-200" : "text-foreground"
            )}
          >
            {isOnBreak ? activeBreakDisplay : workTimeDisplay}
          </span>

          {/* Progress % Pill */}
          <div className="mt-1 flex items-center gap-1">
            <span
              className={cn(
                "text-[9px] font-bold px-1.5 py-0.2 rounded-full border",
                isOnBreak
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
              )}
            >
              {snapshot.progressPercent}% of Day
            </span>
          </div>
        </div>
      </div>

      {/* ── Key Workday Metrics & Motivational Microcopy ── */}
      <div className="flex-1 w-full space-y-2.5 min-w-0">
        {/* Microcopy Quote */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <Sparkles
            className={cn(
              "w-3.5 h-3.5 shrink-0",
              isOnBreak ? "text-amber-400" : "text-[#FFC107]"
            )}
          />
          <span className="truncate italic">{microcopy}</span>
        </div>

        {/* 3-Pill Compact Metric Strip */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {/* 1. Working Time Summary */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-0.5">
            <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
              <Clock className="w-2.5 h-2.5 text-emerald-400" />
              <span>Worked</span>
            </div>
            <div className="font-mono text-xs sm:text-sm font-bold text-foreground tabular-nums truncate">
              {formatHoursMins(snapshot.effectiveWorkMs)}
            </div>
          </div>

          {/* 2. Break Duration */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-0.5">
            <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
              <Coffee className="w-2.5 h-2.5 text-amber-400" />
              <span>Break</span>
            </div>
            <div
              className={cn(
                "font-mono text-xs sm:text-sm font-bold tabular-nums truncate",
                isOnBreak ? "text-amber-300 font-black animate-pulse" : "text-muted-foreground"
              )}
            >
              {snapshot.currentBreakTotal > 0 ? breakTimeDisplay : "0m"}
            </div>
          </div>

          {/* 3. 7 PM Cutoff & Remaining */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-0.5">
            <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>To 7 PM</span>
            </div>
            <div className="font-mono text-xs sm:text-sm font-bold text-muted-foreground tabular-nums truncate">
              {snapshot.isPast7Pm ? "Closed" : remainingTimeDisplay}
            </div>
          </div>
        </div>

        {/* Thin Linear Progress Track toward 7 PM */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="font-mono text-[9px]">Check-in</span>
            <span className="font-medium text-[9px] text-[#FFC107]">
              7:00 PM Auto-Close
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                isOnBreak
                  ? "bg-gradient-to-r from-[#FFC107] to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                  : "bg-gradient-to-r from-emerald-500 to-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              )}
              style={{ width: `${snapshot.progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
