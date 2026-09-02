"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Award,
  ChevronDown,
  ArrowUpRight,
} from "lucide-react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  isFuture,
  isWeekend,
  parseISO,
} from "date-fns";
import { useWorkdayStore } from "@/store/useWorkdayStore";
import { useUIStore } from "@/store/useUIStore";
import type { FounderName, Workday } from "@/lib/types";
import { cn } from "@/lib/utils";

const FOUNDERS: { name: FounderName; role: string }[] = [
  { name: "Sourabh", role: "CEO" },
  { name: "Asher", role: "CTO" },
  { name: "Subin", role: "COO" },
];

export function AttendanceAnalyticsCard({ onOpenHistory }: { onOpenHistory?: () => void }) {
  const currentUser = useUIStore((s) => s.currentUser) as FounderName;
  const [selectedFounder, setSelectedFounder] = useState<FounderName>(currentUser);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"week" | "month">("week");

  const { allWorkdays, todayWorkdays } = useWorkdayStore();

  const now = new Date();

  // ──────────────────────────────────────────────
  // Weekly Days Calculation (Monday to Friday)
  // ──────────────────────────────────────────────
  const weekDays = useMemo(() => {
    const start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const end = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
    const allDays = eachDayOfInterval({ start, end });
    return allDays.slice(0, 5); // Monday to Friday
  }, [now]);

  // Combine historical and today's workdays
  const founderRecords = useMemo(() => {
    const recordsMap = new Map<string, Workday>();
    allWorkdays
      .filter((w) => w.founderName === selectedFounder)
      .forEach((w) => recordsMap.set(w.workDate, w));

    // Overlay today's live state if available
    todayWorkdays
      .filter((w) => w.founderName === selectedFounder)
      .forEach((w) => recordsMap.set(w.workDate, w));

    return recordsMap;
  }, [allWorkdays, todayWorkdays, selectedFounder]);

  // Daily Chart Items
  const dayStats = useMemo(() => {
    return weekDays.map((d) => {
      const dateStr = format(d, "yyyy-MM-dd");
      const dayLabel = format(d, "EEE")[0]; // M, T, W, T, F
      const dayFull = format(d, "EEE, d MMM");
      const record = founderRecords.get(dateStr);
      const isDayToday = isToday(d);
      const isDayFuture = isFuture(d) && !isDayToday;

      let minutes = 0;
      let checkInStr = "—";
      let checkOutStr = "—";
      let status: "working" | "completed" | "leave" | "none" = "none";

      if (record) {
        status = record.status as any;
        if (record.checkInAt) {
          checkInStr = format(new Date(record.checkInAt), "hh:mm a");
        }
        if (record.checkOutAt) {
          checkOutStr = format(new Date(record.checkOutAt), "hh:mm a");
        }

        if (record.checkInAt && record.checkOutAt) {
          const start = new Date(record.checkInAt).getTime();
          const end = new Date(record.checkOutAt).getTime();
          // Deduct server-authoritative break time
          const grossMs = Math.max(0, end - start);
          const netMs = Math.max(0, grossMs - (record.totalBreakMs ?? 0));
          minutes = Math.max(0, Math.floor(netMs / 60000));
        } else if (record.checkInAt && (record.status === "working" || record.status === "on_break")) {
          const start = new Date(record.checkInAt).getTime();
          if (isDayToday) {
            // Live calculation: gross elapsed minus any accumulated break
            const autoCloseTime = new Date(`${dateStr}T19:00:00+05:30`).getTime();
            const effectiveNow = Math.min(Date.now(), autoCloseTime);
            const grossMs = Math.max(0, effectiveNow - start);
            // Compute live break (server total + active break if on_break)
            let liveBreakMs = record.totalBreakMs ?? 0;
            if (record.status === "on_break" && record.breakStartedAt) {
              liveBreakMs += Math.max(0, effectiveNow - new Date(record.breakStartedAt).getTime());
            }
            minutes = Math.max(0, Math.floor((grossMs - liveBreakMs) / 60000));
          } else {
            const autoCloseTime = new Date(`${dateStr}T19:00:00+05:30`).getTime();
            const effectiveEnd = Math.min(autoCloseTime, start + (10 * 3600000));
            const grossMs = Math.max(0, effectiveEnd - start);
            const netMs = Math.max(0, grossMs - (record.totalBreakMs ?? 0));
            minutes = Math.max(0, Math.floor(netMs / 60000));
            checkOutStr = "07:00 PM (Auto)";
          }
        }
      }

      const hours = minutes / 60;
      const hoursFormatted = hours >= 1 ? `${Math.floor(hours)}h` : minutes > 0 ? `${minutes}m` : isDayFuture ? "·" : "—";
      const fullDuration = `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

      // Target reference: 8h workday
      const targetHours = 8.5;
      const heightPercent = Math.min(100, Math.max(8, (hours / targetHours) * 100));

      return {
        date: d,
        dateStr,
        dayLabel,
        dayFull,
        record,
        isDayToday,
        isDayFuture,
        minutes,
        hours,
        hoursFormatted,
        fullDuration,
        checkInStr,
        checkOutStr,
        status,
        heightPercent: minutes > 0 ? heightPercent : 6,
      };
    });
  }, [weekDays, founderRecords]);

  // Aggregate Metrics
  const summaryMetrics = useMemo(() => {
    const workedDays = dayStats.filter((d) => d.minutes > 0);
    const totalMinutes = dayStats.reduce((sum, d) => sum + d.minutes, 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMins = totalMinutes % 60;

    const avgMinutesPerDay = workedDays.length > 0 ? Math.floor(totalMinutes / workedDays.length) : 0;
    const avgHoursStr = `${Math.floor(avgMinutesPerDay / 60)}h ${avgMinutesPerDay % 60}m`;

    const pastWeekdaysCount = dayStats.filter((d) => !d.isDayFuture || d.isDayToday).length;
    const attendancePct = pastWeekdaysCount > 0 ? Math.round((workedDays.length / pastWeekdaysCount) * 100) : 0;

    return {
      totalHoursStr: `${totalHours}h ${remainingMins}m`,
      avgHoursStr: workedDays.length > 0 ? avgHoursStr : "0h 00m",
      daysRatio: `${workedDays.length}/5`,
      attendancePct: `${attendancePct}%`,
    };
  }, [dayStats]);

  const activeDayDetail = dayStats.find((d) => d.dateStr === selectedDayDate);

  return (
    <div className="glass-card-premium p-3.5 sm:p-4 rounded-2xl space-y-3 shadow-sm">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[#FFC107]">
            <BarChart3 className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">
              ATTENDANCE
            </h3>
          </div>
        </div>

        {onOpenHistory && (
          <button
            onClick={onOpenHistory}
            className="text-xs text-[#FFC107] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
          >
            <span>View History</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Founder Segmented Selector */}
      <div className="flex items-center p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] gap-1">
        {FOUNDERS.map((f) => {
          const active = selectedFounder === f.name;
          return (
            <button
              key={f.name}
              onClick={() => {
                setSelectedFounder(f.name);
                setSelectedDayDate(null);
              }}
              className={cn(
                "flex-1 py-1 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                active
                  ? "bg-[#FFC107] text-[#111] shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <span>{f.name}</span>
              <span
                className={cn(
                  "text-[9px] px-1 py-0.2 rounded font-mono uppercase",
                  active ? "bg-black/15 text-black font-bold" : "text-muted-foreground/70 bg-white/5"
                )}
              >
                {f.role}
              </span>
            </button>
          );
        })}
      </div>

      {/* Graphical Bar Chart */}
      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-2.5">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground/80">Weekly Hours</span>
          <span className="text-[10px] text-muted-foreground/70">Target: 8h/day</span>
        </div>

        {/* 5-Day Vertical Bars */}
        <div className="grid grid-cols-5 gap-2 items-end h-24 pt-2 pb-1 px-1">
          {dayStats.map((d) => {
            const isSelected = selectedDayDate === d.dateStr;
            const hasHours = d.minutes > 0;
            const isFullDay = d.hours >= 7;

            return (
              <div
                key={d.dateStr}
                onClick={() => setSelectedDayDate(isSelected ? null : d.dateStr)}
                className="flex flex-col items-center gap-1.5 h-full justify-end cursor-pointer group"
              >
                {/* Hours tooltip indicator */}
                <span
                  className={cn(
                    "text-[10px] font-mono font-bold transition-all",
                    isSelected
                      ? "text-[#FFC107]"
                      : hasHours
                      ? "text-muted-foreground group-hover:text-foreground"
                      : "text-muted-foreground/40"
                  )}
                >
                  {d.hoursFormatted}
                </span>

                {/* Vertical Bar */}
                <div className="w-full max-w-[36px] bg-white/[0.04] h-14 rounded-lg overflow-hidden flex flex-col justify-end p-0.5 relative">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${d.heightPercent}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className={cn(
                      "w-full rounded-md transition-colors",
                      hasHours
                        ? isFullDay
                          ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                          : "bg-[#FFC107] shadow-[0_0_8px_rgba(255,193,7,0.3)]"
                        : d.isDayToday
                        ? "bg-white/10 animate-pulse"
                        : "bg-white/[0.04]"
                    )}
                  />
                  {d.isDayToday && (
                    <span className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#FFC107]" />
                  )}
                </div>

                {/* Day Label */}
                <span
                  className={cn(
                    "text-[11px] font-bold uppercase transition-colors",
                    d.isDayToday
                      ? "text-[#FFC107]"
                      : isSelected
                      ? "text-foreground"
                      : "text-muted-foreground/70"
                  )}
                >
                  {d.dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded Daily Details (when a bar is tapped) */}
      <AnimatePresence>
        {activeDayDetail && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-xl bg-white/[0.03] border border-[#FFC107]/20 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-white/05 pb-1.5">
                <span className="font-bold text-foreground">{activeDayDetail.dayFull}</span>
                <span className="font-mono text-[#FFC107] font-bold">
                  {activeDayDetail.minutes > 0 ? activeDayDetail.fullDuration : "No office hours"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                <div>
                  <span className="text-muted-foreground/70 block">Check In</span>
                  <span className="font-semibold text-foreground">{activeDayDetail.checkInStr}</span>
                </div>
                <div>
                  <span className="text-muted-foreground/70 block">Check Out</span>
                  <span className="font-semibold text-foreground">{activeDayDetail.checkOutStr}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4 Compact Metrics */}
      <div className="grid grid-cols-4 gap-1.5 pt-0.5">
        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center space-y-0.5">
          <span className="text-[9px] font-bold text-muted-foreground/70 uppercase block">Total</span>
          <span className="text-xs font-black text-foreground font-mono tabular-nums">{summaryMetrics.totalHoursStr}</span>
        </div>

        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center space-y-0.5">
          <span className="text-[9px] font-bold text-muted-foreground/70 uppercase block">Avg/Day</span>
          <span className="text-xs font-black text-foreground font-mono tabular-nums">{summaryMetrics.avgHoursStr}</span>
        </div>

        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center space-y-0.5">
          <span className="text-[9px] font-bold text-muted-foreground/70 uppercase block">Days</span>
          <span className="text-xs font-black text-foreground font-mono tabular-nums">{summaryMetrics.daysRatio}</span>
        </div>

        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center space-y-0.5">
          <span className="text-[9px] font-bold text-muted-foreground/70 uppercase block">Attend</span>
          <span className="text-xs font-black text-emerald-400 font-mono tabular-nums">{summaryMetrics.attendancePct}</span>
        </div>
      </div>
    </div>
  );
}
