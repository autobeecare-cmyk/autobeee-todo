"use client";

// src/app/attendance/page.tsx — AutoBee OS Dedicated Attendance & Work Intelligence Page
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  isToday as fnsIsToday,
  isPast as fnsIsPast,
  isFuture as fnsIsFuture,
  isWeekend as fnsIsWeekend,
  parseISO,
  addMonths,
  subMonths,
} from "date-fns";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Users,
  Award,
  BarChart2,
  CalendarCheck,
  Search,
  Timer,
  ChevronDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { useWorkdayStore } from "@/store/useWorkdayStore";
import { useUIStore } from "@/store/useUIStore";
import { getISTDateInfo, isLateCheckIn } from "@/lib/supabase/workday";
import type { FounderName, Workday } from "@/lib/types";
import { cn } from "@/lib/utils";
import { fadeUp, staggerContainer } from "@/lib/animations";

// Canonical Founder Identities & Roles
const FOUNDERS: { name: FounderName; role: string; color: string }[] = [
  { name: "Sourabh", role: "CEO", color: "#FFC107" },
  { name: "Asher", role: "CTO", color: "#10B981" },
  { name: "Subin", role: "COO", color: "#06B6D4" },
];

type PeriodType = "week" | "month" | "year" | "all";
type MetricType = "hours" | "attendance" | "days";

export default function AttendancePage() {
  const currentUser = useUIStore((s) => s.currentUser) as FounderName;
  const { allWorkdays, todayWorkdays, initRealtime } = useWorkdayStore();

  const [period, setPeriod] = useState<PeriodType>("month");
  const [selectedFounder, setSelectedFounder] = useState<FounderName>(currentUser);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => getISTDateInfo().dateStr);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [comparisonMetric, setComparisonMetric] = useState<MetricType>("hours");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = initRealtime();
    return () => unsub();
  }, [initRealtime]);

  const now = new Date();
  const { dateStr: todayStr } = getISTDateInfo(now);

  // ─────────────────────────────────────────────────────────────
  // 1. COMBINED WORKDAYS (DATABASE HISTORY + TODAY LIVE OVERLAY)
  // ─────────────────────────────────────────────────────────────
  const mergedWorkdays = useMemo(() => {
    const map = new Map<string, Workday>();
    allWorkdays.forEach((w) => map.set(`${w.founderName}_${w.workDate}`, w));
    todayWorkdays.forEach((w) => map.set(`${w.founderName}_${w.workDate}`, w));
    return Array.from(map.values());
  }, [allWorkdays, todayWorkdays]);

  // ─────────────────────────────────────────────────────────────
  // 2. PERIOD DATE RANGE INTERVAL
  // ─────────────────────────────────────────────────────────────
  const interval = useMemo(() => {
    if (period === "week") {
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
    }
    if (period === "month") {
      return {
        start: startOfMonth(calendarMonth),
        end: endOfMonth(calendarMonth),
      };
    }
    if (period === "year") {
      return {
        start: startOfYear(now),
        end: endOfYear(now),
      };
    }
    // All time -> default to earliest record date or 6 months ago
    const dates = mergedWorkdays.map((w) => new Date(w.workDate).getTime()).filter(Boolean);
    const minDate = dates.length > 0 ? new Date(Math.min(...dates)) : subMonths(now, 6);
    return {
      start: minDate,
      end: now,
    };
  }, [period, calendarMonth, now, mergedWorkdays]);

  // Expected past weekdays in this period (excluding future & weekends)
  const periodWeekdays = useMemo(() => {
    try {
      const days = eachDayOfInterval(interval);
      return days.filter((d) => !fnsIsWeekend(d) && !fnsIsFuture(d));
    } catch {
      return [];
    }
  }, [interval]);

  // Workdays filtered by the active period
  const periodWorkdaysList = useMemo(() => {
    return mergedWorkdays.filter((w) => {
      const d = parseISO(w.workDate);
      return d >= interval.start && d <= interval.end;
    });
  }, [mergedWorkdays, interval]);

  // Helper to compute worked duration in minutes
  const getWorkedMinutes = (w: Workday): number => {
    if (w.checkInAt && w.checkOutAt) {
      const start = new Date(w.checkInAt).getTime();
      const end = new Date(w.checkOutAt).getTime();
      return Math.max(0, Math.floor((end - start) / 60000));
    }
    if (w.checkInAt && w.status === "working") {
      const start = new Date(w.checkInAt).getTime();
      // If workday is for today in IST, live elapsed minutes is valid
      if (w.workDate === todayStr) {
        return Math.max(0, Math.floor((Date.now() - start) / 60000));
      }
      // If historical record was left unclosed, cap at 7:00 PM IST (19:00) on that work date
      try {
        const autoCloseTime = new Date(`${w.workDate}T19:00:00+05:30`).getTime();
        const effectiveEnd = Math.min(autoCloseTime, start + (10 * 3600000));
        return Math.max(0, Math.floor((effectiveEnd - start) / 60000));
      } catch {
        return 8 * 60; // fallback standard 8 hours
      }
    }
    return 0;
  };

  // ─────────────────────────────────────────────────────────────
  // 3. AGGREGATED STATS PER FOUNDER FOR ACTIVE PERIOD
  // ─────────────────────────────────────────────────────────────
  const founderStatsMap = useMemo(() => {
    const stats: Record<
      FounderName,
      {
        totalMinutes: number;
        presentDays: number;
        lateDays: number;
        absentDays: number;
        leaveDays: number;
        attendanceRate: number;
        avgMinutesPerDay: number;
        records: Workday[];
        lateDates: string[];
        absentDates: string[];
      }
    > = {
      Sourabh: {
        totalMinutes: 0,
        presentDays: 0,
        lateDays: 0,
        absentDays: 0,
        leaveDays: 0,
        attendanceRate: 0,
        avgMinutesPerDay: 0,
        records: [],
        lateDates: [],
        absentDates: [],
      },
      Asher: {
        totalMinutes: 0,
        presentDays: 0,
        lateDays: 0,
        absentDays: 0,
        leaveDays: 0,
        attendanceRate: 0,
        avgMinutesPerDay: 0,
        records: [],
        lateDates: [],
        absentDates: [],
      },
      Subin: {
        totalMinutes: 0,
        presentDays: 0,
        lateDays: 0,
        absentDays: 0,
        leaveDays: 0,
        attendanceRate: 0,
        avgMinutesPerDay: 0,
        records: [],
        lateDates: [],
        absentDates: [],
      },
    };

    FOUNDERS.forEach((f) => {
      const fRecords = periodWorkdaysList.filter((w) => w.founderName === f.name);
      stats[f.name].records = fRecords;

      const presentWorkdays = fRecords.filter((w) => w.status === "working" || w.status === "completed");
      const leaveWorkdays = fRecords.filter((w) => w.status === "leave");

      let minutes = 0;
      const lateDates: string[] = [];

      presentWorkdays.forEach((w) => {
        minutes += getWorkedMinutes(w);
        if (isLateCheckIn(w)) {
          lateDates.push(w.workDate);
        }
      });

      const presentDatesSet = new Set(presentWorkdays.map((w) => w.workDate));
      const leaveDatesSet = new Set(leaveWorkdays.map((w) => w.workDate));

      const absentDates: string[] = [];
      periodWeekdays.forEach((day) => {
        const dStr = format(day, "yyyy-MM-dd");
        if (!presentDatesSet.has(dStr) && !leaveDatesSet.has(dStr)) {
          absentDates.push(dStr);
        }
      });

      const totalExpected = Math.max(1, periodWeekdays.length);
      const attRate = Math.min(100, Math.round((presentWorkdays.length / totalExpected) * 100));
      const avgMins = presentWorkdays.length > 0 ? Math.floor(minutes / presentWorkdays.length) : 0;

      stats[f.name].totalMinutes = minutes;
      stats[f.name].presentDays = presentWorkdays.length;
      stats[f.name].lateDays = lateDates.length;
      stats[f.name].lateDates = lateDates;
      stats[f.name].absentDays = absentDates.length;
      stats[f.name].absentDates = absentDates;
      stats[f.name].leaveDays = leaveWorkdays.length;
      stats[f.name].attendanceRate = attRate;
      stats[f.name].avgMinutesPerDay = avgMins;
    });

    return stats;
  }, [periodWorkdaysList, periodWeekdays]);

  // ─────────────────────────────────────────────────────────────
  // 4. TEAM OVERVIEW SUMMARY METRICS
  // ─────────────────────────────────────────────────────────────
  const teamOverview = useMemo(() => {
    const totalTeamMinutes = Object.values(founderStatsMap).reduce((s, f) => s + f.totalMinutes, 0);
    const teamTotalHours = Math.floor(totalTeamMinutes / 60);
    const teamTotalMins = totalTeamMinutes % 60;

    const rates = Object.values(founderStatsMap).map((f) => f.attendanceRate);
    const avgAttendanceRate = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);

    // Live today present count
    const todayPresentCount = todayWorkdays.filter((w) => w.status === "working" || w.status === "completed").length;
    const totalLateInPeriod = Object.values(founderStatsMap).reduce((s, f) => s + f.lateDays, 0);
    const totalAbsentInPeriod = Object.values(founderStatsMap).reduce((s, f) => s + f.absentDays, 0);

    return {
      attendanceRate: avgAttendanceRate,
      totalHoursStr: `${teamTotalHours}h ${String(teamTotalMins).padStart(2, "0")}m`,
      todayPresentCount,
      totalLateInPeriod,
      totalAbsentInPeriod,
    };
  }, [founderStatsMap, todayWorkdays]);

  // ─────────────────────────────────────────────────────────────
  // 5. WORK HOURS FOUNDER RANKING
  // ─────────────────────────────────────────────────────────────
  const rankedFounders = useMemo(() => {
    const list = FOUNDERS.map((f) => {
      const data = founderStatsMap[f.name];
      const hours = Math.floor(data.totalMinutes / 60);
      const mins = data.totalMinutes % 60;
      return {
        ...f,
        ...data,
        formattedHours: `${hours}h ${String(mins).padStart(2, "0")}m`,
        rawHours: Number((data.totalMinutes / 60).toFixed(1)),
      };
    });

    list.sort((a, b) => b.totalMinutes - a.totalMinutes);
    const maxMinutes = Math.max(1, list[0]?.totalMinutes || 1);

    return list.map((item, idx) => ({
      ...item,
      rank: idx + 1,
      progressPct: Math.max(8, Math.round((item.totalMinutes / maxMinutes) * 100)),
    }));
  }, [founderStatsMap]);

  // ─────────────────────────────────────────────────────────────
  // 6. CALENDAR HEATMAP DATA (MONTHLY VIEW)
  // ─────────────────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return allDays.map((d) => {
      const dateString = format(d, "yyyy-MM-dd");
      const isWeekend = fnsIsWeekend(d);
      const isToday = fnsIsToday(d);
      const isFuture = fnsIsFuture(d) && !isToday;

      // Find selected founder record for this day
      const fRecord = mergedWorkdays.find(
        (w) => w.founderName === selectedFounder && w.workDate === dateString
      );

      let status: "present" | "late" | "absent" | "leave" | "weekend" | "future" = "future";
      let minutesWorked = 0;

      if (isFuture) {
        status = "future";
      } else if (isWeekend) {
        status = "weekend";
      } else if (fRecord) {
        if (fRecord.status === "leave") {
          status = "leave";
        } else if (fRecord.status === "working" || fRecord.status === "completed") {
          minutesWorked = getWorkedMinutes(fRecord);
          if (isLateCheckIn(fRecord)) {
            status = "late";
          } else {
            status = "present";
          }
        }
      } else {
        status = "absent";
      }

      return {
        date: d,
        dateString,
        dayNum: format(d, "d"),
        dayName: format(d, "EEE"),
        isWeekend,
        isToday,
        isFuture,
        status,
        minutesWorked,
        record: fRecord,
      };
    });
  }, [calendarMonth, mergedWorkdays, selectedFounder]);

  // Selected Day Details for the Inspector
  const selectedDayRecord = useMemo(() => {
    const fRecord = mergedWorkdays.find(
      (w) => w.founderName === selectedFounder && w.workDate === selectedDateStr
    );

    const targetDate = parseISO(selectedDateStr);
    const isWeekend = fnsIsWeekend(targetDate);
    const isToday = fnsIsToday(targetDate);
    const isFuture = fnsIsFuture(targetDate) && !isToday;

    let inTime = "—";
    let outTime = "—";
    let durationStr = "0h 00m";
    let statusText = "Absent";
    let statusColor = "text-red-400 bg-red-500/10 border-red-500/25";

    if (isFuture) {
      statusText = "Upcoming";
      statusColor = "text-muted-foreground bg-white/5 border-white/10";
    } else if (isWeekend) {
      statusText = "Weekend (Off)";
      statusColor = "text-muted-foreground bg-white/5 border-white/10";
    } else if (fRecord) {
      if (fRecord.checkInAt) {
        inTime = format(new Date(fRecord.checkInAt), "hh:mm a");
      }
      if (fRecord.checkOutAt) {
        outTime = format(new Date(fRecord.checkOutAt), "hh:mm a");
      } else if (fRecord.status === "working") {
        outTime = fRecord.workDate === todayStr ? "Active Now" : "07:00 PM (Auto)";
      }

      const mins = getWorkedMinutes(fRecord);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      durationStr = `${h}h ${String(m).padStart(2, "0")}m`;

      if (fRecord.status === "leave") {
        statusText = "Marked Leave";
        statusColor = "text-amber-400 bg-amber-500/10 border-amber-500/25";
      } else if (isLateCheckIn(fRecord)) {
        statusText = "Late Arrival";
        statusColor = "text-amber-400 bg-amber-500/10 border-amber-500/25";
      } else {
        const isCurrentlyWorking = fRecord.status === "working" && fRecord.workDate === todayStr;
        statusText = isCurrentlyWorking ? "Currently Present" : "Present (Completed)";
        statusColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/25";
      }
    }

    return {
      dateStr: selectedDateStr,
      formattedDate: format(targetDate, "EEEE, MMMM d, yyyy"),
      inTime,
      outTime,
      durationStr,
      statusText,
      statusColor,
      record: fRecord,
    };
  }, [selectedDateStr, mergedWorkdays, selectedFounder]);

  // ─────────────────────────────────────────────────────────────
  // 7. DAILY TEAM TIMELINE (Selected Day)
  // ─────────────────────────────────────────────────────────────
  const dailyTeamTimeline = useMemo(() => {
    // 9 AM to 8 PM (11 hours span)
    const timelineStartMinutes = 9 * 60; // 540 min
    const timelineEndMinutes = 20 * 60; // 1200 min
    const totalSpanMinutes = timelineEndMinutes - timelineStartMinutes; // 660 min

    return FOUNDERS.map((f) => {
      const record = mergedWorkdays.find(
        (w) => w.founderName === f.name && w.workDate === selectedDateStr
      );

      let hasRecord = false;
      let checkInStr = "—";
      let checkOutStr = "—";
      let leftPct = 0;
      let widthPct = 0;
      let isWorkingNow = false;

      if (record && record.checkInAt) {
        hasRecord = true;
        const checkInDate = new Date(record.checkInAt);
        checkInStr = format(checkInDate, "hh:mm a");

        const istIn = new Date(checkInDate.getTime() + 5.5 * 60 * 60 * 1000);
        const inMins = istIn.getUTCHours() * 60 + istIn.getUTCMinutes();

        let outMins = inMins + 60; // default 1h bar fallback
        if (record.checkOutAt) {
          const checkOutDate = new Date(record.checkOutAt);
          checkOutStr = format(checkOutDate, "hh:mm a");
          const istOut = new Date(checkOutDate.getTime() + 5.5 * 60 * 60 * 1000);
          outMins = istOut.getUTCHours() * 60 + istOut.getUTCMinutes();
        } else if (record.status === "working") {
          if (record.workDate === todayStr) {
            isWorkingNow = true;
            checkOutStr = "Active";
            const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
            outMins = nowIST.getUTCHours() * 60 + nowIST.getUTCMinutes();
          } else {
            isWorkingNow = false;
            checkOutStr = "07:00 PM";
            outMins = 19 * 60; // 7:00 PM IST
          }
        }

        // Clamp to timeline scale
        const startClamped = Math.max(timelineStartMinutes, Math.min(timelineEndMinutes, inMins));
        const endClamped = Math.max(startClamped + 15, Math.min(timelineEndMinutes, outMins));

        leftPct = Math.max(0, ((startClamped - timelineStartMinutes) / totalSpanMinutes) * 100);
        widthPct = Math.min(100 - leftPct, Math.max(4, ((endClamped - startClamped) / totalSpanMinutes) * 100));
      }

      return {
        ...f,
        record,
        hasRecord,
        checkInStr,
        checkOutStr,
        leftPct,
        widthPct,
        isWorkingNow,
      };
    });
  }, [selectedDateStr, mergedWorkdays]);

  // ─────────────────────────────────────────────────────────────
  // 8. COMPARISON BAR CHART DATA
  // ─────────────────────────────────────────────────────────────
  const comparisonChartData = useMemo(() => {
    return FOUNDERS.map((f) => {
      const stat = founderStatsMap[f.name];
      return {
        name: f.name,
        role: f.role,
        hours: Number((stat.totalMinutes / 60).toFixed(1)),
        attendance: stat.attendanceRate,
        days: stat.presentDays,
      };
    });
  }, [founderStatsMap]);

  // ─────────────────────────────────────────────────────────────
  // 9. ATTENDANCE TREND CHART (WEEKLY POINTS)
  // ─────────────────────────────────────────────────────────────
  const trendData = useMemo(() => {
    const weeksMap: Record<string, { weekLabel: string; totalHours: number; count: number }> = {};
    
    periodWeekdays.forEach((d) => {
      const weekStart = format(startOfWeek(d, { weekStartsOn: 1 }), "MMM d");
      if (!weeksMap[weekStart]) {
        weeksMap[weekStart] = { weekLabel: `W/O ${weekStart}`, totalHours: 0, count: 0 };
      }
    });

    periodWorkdaysList.forEach((w) => {
      const d = parseISO(w.workDate);
      const weekStart = format(startOfWeek(d, { weekStartsOn: 1 }), "MMM d");
      if (weeksMap[weekStart]) {
        const mins = getWorkedMinutes(w);
        weeksMap[weekStart].totalHours += Number((mins / 60).toFixed(1));
        weeksMap[weekStart].count += 1;
      }
    });

    const result = Object.values(weeksMap);
    if (result.length === 0) {
      return [
        { weekLabel: "Week 1", totalHours: 0 },
        { weekLabel: "Week 2", totalHours: 0 },
        { weekLabel: "Week 3", totalHours: 0 },
        { weekLabel: "Week 4", totalHours: 0 },
      ];
    }
    return result;
  }, [periodWeekdays, periodWorkdaysList]);

  // ─────────────────────────────────────────────────────────────
  // 10. FILTERED LOGS TABLE
  // ─────────────────────────────────────────────────────────────
  const filteredLogs = useMemo(() => {
    let list = [...periodWorkdaysList];
    if (selectedFounder) {
      list = list.filter((w) => w.founderName === selectedFounder);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (w) =>
          w.workDate.includes(q) ||
          w.founderName.toLowerCase().includes(q) ||
          (w.progressNotes && w.progressNotes.toLowerCase().includes(q)) ||
          (w.blockerNotes && w.blockerNotes.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => b.workDate.localeCompare(a.workDate));
  }, [periodWorkdaysList, selectedFounder, searchQuery]);

  const selectedFounderRole = FOUNDERS.find((f) => f.name === selectedFounder)?.role || "Founder";
  const selectedFounderStat = founderStatsMap[selectedFounder];

  return (
    <div className="px-3.5 sm:px-6 lg:px-8 py-5 sm:py-6 max-w-[1560px] w-full mx-auto space-y-5 sm:space-y-6 pb-24 md:pb-12">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & PERIOD SELECTOR
      ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={staggerContainer}
        className="space-y-4"
      >
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FFC107]/15 border border-[#FFC107]/30 flex items-center justify-center text-[#FFC107]">
                <Clock className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Attendance
              </h1>
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-0.5 ml-10">
              Team Work History & Presence Intelligence
            </p>
          </div>

          {/* Period Selector Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] self-start sm:self-auto shadow-inner">
            {(["week", "month", "year", "all"] as PeriodType[]).map((p) => {
              const active = period === p;
              const labels: Record<PeriodType, string> = {
                week: "Week",
                month: "Month",
                year: "Year",
                all: "All Time",
              };
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer relative",
                    active ? "text-[#111] shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="period-active"
                      className="absolute inset-0 rounded-lg bee-gradient"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{labels[p]}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ─────────────────────────────────────────────────────────────
            2. TEAM OVERVIEW SUMMARY CARDS
        ───────────────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Card 1: Attendance Rate */}
          <div className="glass-card-premium p-3.5 sm:p-4 rounded-2xl space-y-1 relative overflow-hidden border border-white/[0.07]">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">TEAM ATTENDANCE</span>
              <Award className="w-4 h-4 text-[#FFC107]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
                {teamOverview.attendanceRate}%
              </span>
              <span className="text-[10px] font-semibold text-emerald-400">Target 85%+</span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              Average across {FOUNDERS.length} founders
            </p>
          </div>

          {/* Card 2: Total Team Hours */}
          <div className="glass-card-premium p-3.5 sm:p-4 rounded-2xl space-y-1 relative overflow-hidden border border-white/[0.07]">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">TEAM WORK HOURS</span>
              <Timer className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
                {teamOverview.totalHoursStr}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate capitalize">
              Logged in {period} view
            </p>
          </div>

          {/* Card 3: Present Count */}
          <div className="glass-card-premium p-3.5 sm:p-4 rounded-2xl space-y-1 relative overflow-hidden border border-white/[0.07]">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">TODAY'S PRESENCE</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
                {teamOverview.todayPresentCount} / {FOUNDERS.length}
              </span>
              <span className="text-[10px] font-semibold text-emerald-400">Present</span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              AutoBee HQ Office
            </p>
          </div>

          {/* Card 4: Absences & Late */}
          <div className="glass-card-premium p-3.5 sm:p-4 rounded-2xl space-y-1 relative overflow-hidden border border-white/[0.07]">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">ATTENTION</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm sm:text-base font-black text-amber-300 tabular-nums">
                {teamOverview.totalLateInPeriod} Late
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-sm sm:text-base font-black text-red-400 tabular-nums">
                {teamOverview.totalAbsentInPeriod} Absent
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              {period === "all" ? "All-time summary" : `In selected ${period}`}
            </p>
          </div>
        </motion.div>

        {/* ─────────────────────────────────────────────────────────────
            3. MAIN CONTENT GRID (RESPONSIVE: MOBILE STACK / DESKTOP 2-COL)
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* ──────────────────────────────────────────────
              LEFT COLUMN (lg:col-span-7)
              - Team Performance / Work Hours Ranking
              - Attendance Calendar & Heatmap
              - Daily Team Presence Timeline
              - Attendance Trend Chart
          ────────────────────────────────────────────── */}
          <div className="lg:col-span-7 space-y-4">
            {/* WORK HOURS RANKING */}
            <motion.div variants={fadeUp} className="glass-card-premium p-4 rounded-2xl space-y-3 border border-white/[0.07]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <span>WORK HOURS</span>
                    <span className="text-[10px] text-muted-foreground/60 font-normal">· Relative Team Volume</span>
                  </h2>
                </div>
                <span className="text-[10px] font-semibold text-[#FFC107] bg-[#FFC107]/10 px-2 py-0.5 rounded-full border border-[#FFC107]/20">
                  {period.toUpperCase()}
                </span>
              </div>

              <div className="space-y-2.5 pt-1">
                {rankedFounders.map((f) => (
                  <div
                    key={f.name}
                    onClick={() => setSelectedFounder(f.name)}
                    className={cn(
                      "p-2.5 rounded-xl border transition-all cursor-pointer",
                      selectedFounder === f.name
                        ? "bg-white/[0.06] border-[#FFC107]/40 shadow-sm"
                        : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-white/10 text-[11px] font-black text-foreground flex items-center justify-center shrink-0">
                          {f.rank}
                        </span>
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                            {f.name}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-muted-foreground uppercase shrink-0">
                            {f.role}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 text-right shrink-0">
                        <span className="font-mono font-bold text-xs sm:text-sm text-foreground">
                          {f.formattedHours}
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          {f.attendanceRate}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${f.progressPct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={cn(
                          "h-full rounded-full",
                          f.rank === 1 ? "bee-gradient" : f.rank === 2 ? "bg-emerald-400" : "bg-cyan-400"
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* ATTENDANCE CALENDAR & HEATMAP */}
            <motion.div variants={fadeUp} className="glass-card-premium p-4 rounded-2xl space-y-3.5 border border-white/[0.07]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-[#FFC107]" />
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    ATTENDANCE CALENDAR
                  </h2>
                </div>

                {/* Month Navigator */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                    className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-foreground px-1.5">
                    {format(calendarMonth, "MMMM yyyy")}
                  </span>
                  <button
                    onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                    className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Founder Tab Mini-Selector for Calendar */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                {FOUNDERS.map((f) => {
                  const active = selectedFounder === f.name;
                  return (
                    <button
                      key={f.name}
                      onClick={() => setSelectedFounder(f.name)}
                      className={cn(
                        "flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center truncate",
                        active ? "bg-[#FFC107] text-[#111] shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {f.name} · {f.role}
                    </button>
                  );
                })}
              </div>

              {/* Calendar Grid */}
              <div className="space-y-1.5">
                {/* Weekday Header */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-foreground pb-1">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span className="text-muted-foreground/40">Sat</span>
                  <span className="text-muted-foreground/40">Sun</span>
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((d) => {
                    const isSelected = selectedDateStr === d.dateString;
                    return (
                      <button
                        key={d.dateString}
                        onClick={() => setSelectedDateStr(d.dateString)}
                        className={cn(
                          "h-10 sm:h-12 rounded-xl flex flex-col items-center justify-between p-1 transition-all cursor-pointer relative border",
                          isSelected
                            ? "ring-2 ring-[#FFC107] border-transparent bg-white/10"
                            : "border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.06]",
                          d.isToday && "border-amber-400/40"
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={cn(
                              "text-[10px] font-bold leading-none",
                              d.isToday ? "text-[#FFC107] font-black" : "text-foreground"
                            )}
                          >
                            {d.dayNum}
                          </span>
                          {d.isToday && (
                            <span className="w-1 h-1 rounded-full bg-[#FFC107]" />
                          )}
                        </div>

                        {/* Status Indicator Dot / Pill */}
                        <div className="w-full flex items-center justify-center">
                          {d.status === "present" ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/50" />
                          ) : d.status === "late" ? (
                            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-500/50" />
                          ) : d.status === "absent" ? (
                            <span className="w-2 h-2 rounded-full bg-red-400/80" />
                          ) : d.status === "leave" ? (
                            <span className="w-2 h-2 rounded-full bg-amber-500/40 border border-amber-400" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Heatmap Legend */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/05 text-[10px] text-muted-foreground font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Present</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Late / Partial</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span>Absent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white/15" />
                  <span>Off / Future</span>
                </div>
              </div>

              {/* Selected Day Inspector */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedDayRecord.dateStr}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="p-3.5 rounded-xl bg-white/[0.03] border border-white/08 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        {selectedDayRecord.formattedDate}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {selectedFounder} ({selectedFounderRole}) Workday Record
                      </p>
                    </div>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                        selectedDayRecord.statusColor
                      )}
                    >
                      {selectedDayRecord.statusText}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="p-2 rounded-lg bg-white/05 border border-white/05">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase block">
                        CHECK-IN
                      </span>
                      <span className="text-xs font-mono font-bold text-foreground">
                        {selectedDayRecord.inTime}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-white/05 border border-white/05">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase block">
                        CHECK-OUT
                      </span>
                      <span className="text-xs font-mono font-bold text-foreground">
                        {selectedDayRecord.outTime}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-white/05 border border-white/05">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase block">
                        WORKED
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {selectedDayRecord.durationStr}
                      </span>
                    </div>
                  </div>

                  {selectedDayRecord.record && (
                    <div className="space-y-1 text-[11px] pt-1 text-muted-foreground">
                      {selectedDayRecord.record.progressNotes && (
                        <p>
                          <strong className="text-foreground">Highlights:</strong> {selectedDayRecord.record.progressNotes}
                        </p>
                      )}
                      {selectedDayRecord.record.blockerNotes && (
                        <p>
                          <strong className="text-amber-400">Blockers:</strong> {selectedDayRecord.record.blockerNotes}
                        </p>
                      )}
                      {selectedDayRecord.record.tomorrowNotes && (
                        <p>
                          <strong className="text-cyan-400">Next:</strong> {selectedDayRecord.record.tomorrowNotes}
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* DAILY TEAM PRESENCE TIMELINE */}
            <motion.div variants={fadeUp} className="glass-card-premium p-4 rounded-2xl space-y-3.5 border border-white/[0.07]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    DAILY TEAM TIMELINE
                  </h2>
                  <p className="text-[10px] text-muted-foreground">
                    {format(parseISO(selectedDateStr), "EEE, d MMMM yyyy")}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedDateStr(todayStr)}
                  className="px-2 py-1 rounded-lg bg-white/05 hover:bg-white/10 border border-white/10 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                >
                  Jump to Today
                </button>
              </div>

              {/* Timeline Track Labels (9 AM - 8 PM) */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between text-[9px] font-mono text-muted-foreground/70 px-1 border-b border-white/05 pb-1">
                  <span>09:00 AM</span>
                  <span>12:00 PM</span>
                  <span>03:00 PM</span>
                  <span>06:00 PM</span>
                  <span>08:00 PM</span>
                </div>

                {dailyTeamTimeline.map((item) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-foreground">{item.name}</span>
                        <span className="text-[9px] text-muted-foreground uppercase font-semibold">
                          ({item.role})
                        </span>
                      </div>

                      <div className="text-[11px] font-mono text-muted-foreground">
                        {item.hasRecord ? (
                          <span>
                            {item.checkInStr} – {item.checkOutStr}
                          </span>
                        ) : (
                          <span className="text-red-400/80">No check-in</span>
                        )}
                      </div>
                    </div>

                    {/* Timeline Bar representation */}
                    <div className="h-4 w-full bg-white/[0.04] rounded-lg relative overflow-hidden border border-white/[0.04]">
                      {item.hasRecord && (
                        <div
                          className={cn(
                            "absolute top-0.5 bottom-0.5 rounded-md flex items-center justify-between px-1 transition-all",
                            item.isWorkingNow
                              ? "bg-gradient-to-r from-emerald-500 to-[#FFC107] animate-pulse"
                              : "bg-emerald-500/80"
                          )}
                          style={{
                            left: `${item.leftPct}%`,
                            width: `${item.widthPct}%`,
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 shadow-sm" />
                          <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 shadow-sm" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* ATTENDANCE TREND CHART */}
            <motion.div variants={fadeUp} className="glass-card-premium p-4 rounded-2xl space-y-3 border border-white/[0.07]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    ATTENDANCE TREND
                  </h2>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">Team Total Hours</span>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FFC107" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#FFC107" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="weekLabel"
                      stroke="#888"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      unit="h"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#161616",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        fontSize: "11px",
                      }}
                      formatter={(value: any) => [`${value}h`, "Total Hours"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="totalHours"
                      stroke="#FFC107"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#trendGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* ──────────────────────────────────────────────
              RIGHT COLUMN (lg:col-span-5)
              - Individual Founder Deep Dive
              - Monthly Comparison Chart
              - Absence & Late Summary ("Attention")
              - All-Time Team History Overview
          ────────────────────────────────────────────── */}
          <div className="lg:col-span-5 space-y-4">
            {/* INDIVIDUAL FOUNDER DEEP DIVE */}
            <motion.div variants={fadeUp} className="glass-card-premium p-4 rounded-2xl space-y-3.5 border border-white/[0.07]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  FOUNDER PROFILE
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-foreground">
                  {period.toUpperCase()} METRICS
                </span>
              </div>

              {/* Founder Selector Pills */}
              <div className="grid grid-cols-3 gap-1.5">
                {FOUNDERS.map((f) => {
                  const active = selectedFounder === f.name;
                  return (
                    <button
                      key={f.name}
                      onClick={() => setSelectedFounder(f.name)}
                      className={cn(
                        "p-2 rounded-xl text-center transition-all cursor-pointer border",
                        active
                          ? "bg-[#FFC107]/15 border-[#FFC107]/40 text-foreground shadow-sm"
                          : "bg-white/[0.02] border-white/[0.05] text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <p className="font-bold text-xs truncate">{f.name}</p>
                      <p className="text-[9px] font-semibold text-muted-foreground">{f.role}</p>
                    </button>
                  );
                })}
              </div>

              {/* Individual Metrics Grid */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between border-b border-white/05 pb-2">
                  <span className="text-xs font-bold text-foreground">
                    {selectedFounder} · {selectedFounderRole}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {selectedFounderStat.attendanceRate}% Attendance
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground block">Total Hours</span>
                    <span className="font-mono font-bold text-foreground text-sm">
                      {Math.floor(selectedFounderStat.totalMinutes / 60)}h {selectedFounderStat.totalMinutes % 60}m
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground block">Avg Hours/Day</span>
                    <span className="font-mono font-bold text-foreground text-sm">
                      {Math.floor(selectedFounderStat.avgMinutesPerDay / 60)}h {selectedFounderStat.avgMinutesPerDay % 60}m
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground block">Days Present</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {selectedFounderStat.presentDays} days
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground block">Days Absent</span>
                    <span className="font-mono font-bold text-red-400 text-sm">
                      {selectedFounderStat.absentDays} days
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground block">Late Arrivals</span>
                    <span className="font-mono font-bold text-amber-400 text-sm">
                      {selectedFounderStat.lateDays}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground block">Leave Days</span>
                    <span className="font-mono font-bold text-muted-foreground text-sm">
                      {selectedFounderStat.leaveDays}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* MONTHLY / PERIOD COMPARISON BAR CHART */}
            <motion.div variants={fadeUp} className="glass-card-premium p-4 rounded-2xl space-y-3.5 border border-white/[0.07]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-[#FFC107]" />
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    COMPARISON
                  </h2>
                </div>

                {/* Metric Selector */}
                <div className="flex items-center p-0.5 rounded-lg bg-white/05 border border-white/08">
                  {(["hours", "attendance", "days"] as MetricType[]).map((m) => {
                    const active = comparisonMetric === m;
                    const labels: Record<MetricType, string> = {
                      hours: "Hours",
                      attendance: "Rate %",
                      days: "Days",
                    };
                    return (
                      <button
                        key={m}
                        onClick={() => setComparisonMetric(m)}
                        className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                          active ? "bg-[#FFC107] text-[#111]" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {labels[m]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-44 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#161616",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        fontSize: "11px",
                      }}
                      formatter={(value: any) => [
                        comparisonMetric === "hours"
                          ? `${value} hrs`
                          : comparisonMetric === "attendance"
                          ? `${value}%`
                          : `${value} days`,
                        comparisonMetric.toUpperCase(),
                      ]}
                    />
                    <Bar
                      dataKey={comparisonMetric}
                      fill="#FFC107"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* ABSENCE & LATE SUMMARY (ATTENTION SECTION) */}
            <motion.div variants={fadeUp} className="glass-card-premium p-4 rounded-2xl space-y-3 border border-white/[0.07]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    ATTENTION & ABSENCES
                  </h2>
                </div>
                <span className="text-[10px] text-muted-foreground">Click person for dates</span>
              </div>

              <div className="space-y-2">
                {FOUNDERS.map((f) => {
                  const stat = founderStatsMap[f.name];
                  const hasIssues = stat.lateDays > 0 || stat.absentDays > 0;
                  return (
                    <div
                      key={f.name}
                      onClick={() => setSelectedFounder(f.name)}
                      className={cn(
                        "p-2.5 rounded-xl border transition-all cursor-pointer",
                        selectedFounder === f.name ? "bg-white/[0.06] border-white/15" : "bg-white/[0.02] border-white/05"
                      )}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-foreground">
                          {f.name} ({f.role})
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-300 font-mono font-bold">
                            {stat.lateDays} Late
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-red-400 font-mono font-bold">
                            {stat.absentDays} Absent
                          </span>
                        </div>
                      </div>

                      {/* Expandable Late / Absent Dates */}
                      {selectedFounder === f.name && hasIssues && (
                        <div className="pt-2 border-t border-white/05 space-y-1.5 text-[10px]">
                          {stat.lateDates.length > 0 && (
                            <div>
                              <span className="text-amber-400 font-semibold block mb-0.5">Late check-in dates:</span>
                              <div className="flex flex-wrap gap-1">
                                {stat.lateDates.map((dStr) => (
                                  <button
                                    key={dStr}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedDateStr(dStr);
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25 hover:bg-amber-500/25 cursor-pointer font-mono"
                                  >
                                    {dStr}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {stat.absentDates.length > 0 && (
                            <div>
                              <span className="text-red-400 font-semibold block mb-0.5">Absent dates:</span>
                              <div className="flex flex-wrap gap-1">
                                {stat.absentDates.slice(0, 8).map((dStr) => (
                                  <button
                                    key={dStr}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedDateStr(dStr);
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/25 hover:bg-red-500/25 cursor-pointer font-mono"
                                  >
                                    {dStr}
                                  </button>
                                ))}
                                {stat.absentDates.length > 8 && (
                                  <span className="text-muted-foreground self-center">
                                    +{stat.absentDates.length - 8} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* ALL-TIME TEAM SUMMARY */}
            <motion.div variants={fadeUp} className="glass-card-premium p-4 rounded-2xl space-y-2.5 border border-white/[0.07]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  ALL-TIME TEAM RECORD
                </span>
                <span className="text-[10px] font-mono text-[#FFC107]">Total Database Logs</span>
              </div>

              <div className="space-y-2 text-xs">
                {FOUNDERS.map((f) => {
                  const allFLogs = mergedWorkdays.filter((w) => w.founderName === f.name);
                  const presentCount = allFLogs.filter((w) => w.status === "working" || w.status === "completed").length;
                  let totalMins = 0;
                  allFLogs.forEach((w) => (totalMins += getWorkedMinutes(w)));
                  const totalHours = Math.floor(totalMins / 60);

                  return (
                    <div
                      key={f.name}
                      className="p-2 rounded-xl bg-white/[0.02] border border-white/05 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-foreground">{f.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-1 font-medium">({f.role})</span>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        <span className="text-foreground font-bold">{presentCount} days</span>
                        <span className="text-muted-foreground"> · </span>
                        <span className="text-emerald-400 font-bold">{totalHours}h</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. DETAILED HISTORICAL LOGS TABLE / FEED
        ───────────────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="glass-card-premium p-4 rounded-2xl space-y-3.5 border border-white/[0.07]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                HISTORICAL WORKDAY LOGS
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Verified check-in & check-out records ({filteredLogs.length} entries)
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search date, founder, note..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/05 border border-white/08 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-[#FFC107]/50 transition-colors"
              />
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">No attendance records found</p>
              <p>Try switching period or clearing search filter.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.slice(0, 20).map((w) => {
                const isExpanded = expandedLogId === w.id;
                const inTime = w.checkInAt ? format(new Date(w.checkInAt), "hh:mm a") : "—";
                const outTime = w.checkOutAt
                  ? format(new Date(w.checkOutAt), "hh:mm a")
                  : w.status === "working"
                  ? "Active"
                  : "—";

                const mins = getWorkedMinutes(w);
                const h = Math.floor(mins / 60);
                const m = mins % 60;
                const durationStr = `${h}h ${String(m).padStart(2, "0")}m`;

                return (
                  <div
                    key={w.id}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/05 hover:bg-white/[0.04] transition-all text-xs space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-foreground w-16">{w.founderName}</span>
                        <span className="font-mono text-muted-foreground">{w.workDate}</span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                            w.status === "working"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                              : w.status === "completed"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/25"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/25"
                          )}
                        >
                          {w.status === "working" ? "In Office" : w.status === "completed" ? "Completed" : "Leave"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-muted-foreground text-right self-end sm:self-auto font-mono text-[11px]">
                        <span>In: <strong className="text-foreground">{inTime}</strong></span>
                        <span>Out: <strong className="text-foreground">{outTime}</strong></span>
                        <span className="text-emerald-400 font-bold">{durationStr}</span>
                        {(w.progressNotes || w.blockerNotes || w.tomorrowNotes) && (
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : w.id)}
                            className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <ChevronDown
                              className={cn("w-3.5 h-3.5 transition-transform", isExpanded && "rotate-180")}
                            />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Notes */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-2 border-t border-white/05 text-[11px] text-muted-foreground space-y-1"
                      >
                        {w.progressNotes && (
                          <p><strong className="text-foreground">Highlights:</strong> {w.progressNotes}</p>
                        )}
                        {w.blockerNotes && (
                          <p><strong className="text-amber-400">Blockers:</strong> {w.blockerNotes}</p>
                        )}
                        {w.tomorrowNotes && (
                          <p><strong className="text-cyan-400">Tomorrow:</strong> {w.tomorrowNotes}</p>
                        )}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
