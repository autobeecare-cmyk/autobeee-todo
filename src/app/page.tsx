"use client";
// src/app/page.tsx — Dashboard Overhaul
import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isPast, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import {
  CheckCircle2, Circle, TrendingUp, Target,
  ArrowRight, Plus, AlertCircle, DollarSign, Calendar, RefreshCw, Check,
  Car, Plane, Megaphone, Utensils, Users as UsersIcon, Code, Repeat, Laptop, Cpu, Briefcase, HelpCircle
} from "lucide-react";
import { Handshake, Activity, UserPlus, Milestone } from "lucide-react";
import Link from "next/link";
import { useTaskStore } from "@/store/useTaskStore";
import { useGoalStore } from "@/store/useGoalStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useMeetingStore } from "@/store/useMeetingStore";
import { usePartnerStore } from "@/store/usePartnerStore";
import { useRoadmapStore } from "@/store/useRoadmapStore";
import { useUIStore } from "@/store/useUIStore";
import { logActivity } from "@/lib/supabase/activity";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Task, Expense } from "@/lib/types";
import { fadeUp, staggerContainer, taskComplete } from "@/lib/animations";

const PRIORITY_BADGE_STYLE: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-400 border border-red-500/20",
  high: "bg-amber-500/10 text-[#FFC107] border border-amber-500/20",
  medium: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  low: "bg-gray-500/10 text-gray-400 border border-gray-500/20",
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-400",
  low: "bg-gray-500",
};

const CAT_COLORS: Record<string, string> = {
  fuel: "#f97316", travel: "#6366f1", marketing: "#3b82f6", food: "#22c55e",
  meetings: "#06b6d4", software: "#8b5cf6", subscriptions: "#ec4899",
  development: "#14b8a6", equipment: "#f59e0b", operations: "#84cc16", misc: "#6b7280",
};

const CAT_ICONS: Record<string, React.ComponentType<any>> = {
  fuel: Car,
  travel: Plane,
  marketing: Megaphone,
  food: Utensils,
  meetings: UsersIcon,
  software: Code,
  subscriptions: Repeat,
  development: Laptop,
  equipment: Cpu,
  operations: Briefcase,
  misc: HelpCircle,
};

export default function Dashboard() {
  const { tasks, loading: tasksLoading, deleteTask: storeDeleteTask } = useTaskStore();
  const { goals, loading: goalsLoading } = useGoalStore();
  const { expenses, loading: expLoading } = useExpenseStore();
  const { meetings, loading: meetingsLoading } = useMeetingStore();
  const { partners, loading: partnersLoading } = usePartnerStore();
  const { setQuickAddOpen } = useUIStore();

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  // Roadmap hooks & memos
  const { phases, objectives, milestones, hiring, finance } = useRoadmapStore();

  const overallProgress = useMemo(() => {
    if (phases.length === 0) return 0;
    return Math.round(phases.reduce((sum, p) => sum + p.completionPercentage, 0) / phases.length);
  }, [phases]);

  const activePhase = useMemo(() => {
    return phases.find(p => p.status === "active") || phases[0];
  }, [phases]);

  const hiringStats = useMemo(() => {
    if (!activePhase) return { filled: 0, total: 0 };
    const pRoles = hiring.filter(h => h.phaseId === activePhase.id);
    const filled = pRoles.filter(h => h.status === "filled").length;
    return { filled, total: pRoles.length };
  }, [activePhase, hiring]);

  const financeStats = useMemo(() => {
    if (!activePhase) return { target: 0, actual: 0 };
    const pFin = finance.filter(f => f.phaseId === activePhase.id);
    const target = pFin.reduce((sum, f) => sum + f.monthlyTarget, 0);
    const actual = pFin.reduce((sum, f) => sum + f.actualRevenue, 0);
    return { target, actual };
  }, [activePhase, finance]);

  const milestoneStats = useMemo(() => {
    if (!activePhase) return { completed: 0, total: 0, next: "None" };
    const pObjIds = objectives.filter(o => o.phaseId === activePhase.id).map(o => o.id);
    const pMilestones = milestones.filter(m => pObjIds.includes(m.objectiveId));
    const completed = pMilestones.filter(m => m.status === "completed").length;
    const next = pMilestones.find(m => m.status !== "completed")?.title || "All Milestones Completed!";
    const deadline = pMilestones.find(m => m.status !== "completed" && m.targetDate)?.targetDate || undefined;
    return { completed, total: pMilestones.length, next, deadline };
  }, [activePhase, objectives, milestones]);

  // Partners calculations
  const interestedPartnersCount = useMemo(() => 
    partners.filter(p => p.pipeline_status === "Interested" || p.pipeline_status === "Negotiating").length,
    [partners]
  );
  
  const followUpPartnersCount = useMemo(() => 
    partners.filter(p => p.follow_up_needed || p.pipeline_status === "Follow-Up").length,
    [partners]
  );

  const joinedPartnersCount = useMemo(() => 
    partners.filter(p => p.pipeline_status === "Joined").length,
    [partners]
  );

  const totalPartnerCommission = useMemo(() => 
    partners.filter(p => p.pipeline_status === "Joined").reduce((sum, p) => sum + (p.total_commission_earned ?? 0), 0),
    [partners]
  );

  // Derived dashboard data
  const todoCount = useMemo(() => tasks.filter(t => t.status === "todo").length, [tasks]);
  const doingCount = useMemo(() => tasks.filter(t => t.status === "doing").length, [tasks]);
  const doneCount = useMemo(() => tasks.filter(t => t.status === "done").length, [tasks]);
  const openTasksCount = todoCount + doingCount;
  
  const urgentOpenCount = useMemo(() => 
    tasks.filter(t => t.status !== "done" && t.priority === "urgent").length,
    [tasks]
  );

  const todayTasks = useMemo(() =>
    tasks.filter(t =>
      t.status !== "done" && (
        t.priority === "urgent" ||
        t.priority === "high" ||
        (t.deadline && (isPast(new Date(t.deadline)) || isToday(new Date(t.deadline))))
      )
    )
      .sort((a, b) => {
        const order = { urgent: 0, high: 1, medium: 2, low: 3 };
        return order[a.priority] - order[b.priority];
      })
      .slice(0, 5),
    [tasks]
  );

  const overdueCount = useMemo(() =>
    tasks.filter(t => t.deadline && isPast(new Date(t.deadline)) && !isToday(new Date(t.deadline)) && t.status !== "done").length,
    [tasks]
  );

  const activeGoalsCount = useMemo(() => goals.filter(g => g.status === "active").length, [goals]);
  const activeGoals = useMemo(() => goals.filter(g => g.status === "active").slice(0, 3), [goals]);
  
  const avgGoalProgress = useMemo(() => {
    const active = goals.filter(g => g.status === "active");
    return active.length > 0 ? Math.round(active.reduce((s, g) => s + g.progress, 0) / active.length) : 0;
  }, [goals]);

  // Expenses summary
  const monthExpenses = useMemo(() => {
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return expenses
      .filter(e => {
        const d = parseISO(e.date);
        return isWithinInterval(d, { start, end });
      })
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const recentExpenses = useMemo(() => expenses.slice(0, 3), [expenses]);

  const topCategoryThisMonth = useMemo(() => {
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const filtered = expenses.filter(e => isWithinInterval(parseISO(e.date), { start, end }));
    const map: Record<string, number> = {};
    filtered.forEach(e => { map[e.category] = (map[e.category] ?? 0) + e.amount; });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return null;
    return `${sorted[0][0].charAt(0).toUpperCase() + sorted[0][0].slice(1)}`;
  }, [expenses]);

  // Budget coloring logic: Green < 10k, Amber < 30k, Red >= 30k
  const spentNumberColor = useMemo(() => {
    if (monthExpenses < 10000) return "text-green-400";
    if (monthExpenses < 30000) return "text-amber-400";
    return "text-red-400";
  }, [monthExpenses]);

  // Meetings calculations
  const meetingsTodayCount = useMemo(() => {
    return meetings.filter(m => {
      const d = parseISO(m.scheduledAt.split("T")[0]);
      return isToday(d) && m.status !== "cancelled";
    }).length;
  }, [meetings]);

  const upcomingMeetings = useMemo(() => {
    return meetings
      .filter(m => m.status === "upcoming" && new Date(m.scheduledAt) >= now)
      .slice(0, 3);
  }, [meetings]);

  // Next meeting soon indicator (within 30 minutes)
  const nextMeetingSoon = useMemo(() => {
    const thirtyMinFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    return meetings.some(m => {
      if (m.status !== "upcoming") return false;
      const sched = new Date(m.scheduledAt);
      return sched >= now && sched <= thirtyMinFromNow;
    });
  }, [meetings]);

  const nextMeetingSubtext = useMemo(() => {
    const upcoming = meetings
      .filter(m => m.status === "upcoming" && new Date(m.scheduledAt) >= now)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    if (upcoming.length === 0) return "None scheduled";
    return `Next: ${format(new Date(upcoming[0].scheduledAt), "h:mm a")}`;
  }, [meetings]);

  // "This Week at a Glance" data
  const weekGlanceTasks = useMemo(() => {
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    return tasks.filter(t => {
      if (t.status === "done" || !t.deadline) return false;
      const d = new Date(t.deadline);
      return isWithinInterval(d, { start, end });
    });
  }, [tasks]);

  const weekGlanceSpendSummary = useMemo(() => {
    const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
    const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 });
    const startOfLastWeek = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const endOfLastWeek = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    const thisWeekSpend = expenses
      .filter(e => {
        const d = parseISO(e.date);
        return isWithinInterval(d, { start: startOfThisWeek, end: endOfThisWeek });
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const lastWeekSpend = expenses
      .filter(e => {
        const d = parseISO(e.date);
        return isWithinInterval(d, { start: startOfLastWeek, end: endOfLastWeek });
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const diff = thisWeekSpend - lastWeekSpend;
    return {
      thisWeekSpend,
      diff,
    };
  }, [expenses]);

  const handleCompleteTask = async (task: Task) => {
    try {
      await logActivity({
        type: "completed",
        entityId: task.id,
        entityType: "task",
        description: `Task "${task.title}" completed`
      });
      await storeDeleteTask(task.id);
    } catch (err) {
      console.error(err);
    }
  };

  const getDeadlineChip = (deadlineStr: string) => {
    const d = new Date(deadlineStr);
    if (isPast(d) && !isToday(d)) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30">Overdue</span>;
    }
    if (isToday(d)) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-[#FFC107] border border-amber-500/30">Today</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-muted-foreground border border-white/08">{format(d, "d MMM")}</span>;
  };

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto space-y-6">
      {/* Greeting */}
      <motion.div initial="hidden" animate="show" variants={staggerContainer}>
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground/95">
              {greeting} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {format(now, "EEEE, d MMMM yyyy")}
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => setQuickAddOpen(true, "task")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bee-gradient text-[#111] text-sm font-semibold shadow-md"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Quick Add
          </motion.button>
        </motion.div>



        {/* Overdue alert */}
        {overdueCount > 0 && (
          <motion.div
            variants={fadeUp}
            className="mt-4 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm"
          >
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-red-300 font-medium">{overdueCount} overdue task{overdueCount > 1 ? "s" : ""} need attention</span>
            <Link href="/tasks" className="ml-auto text-red-400 text-xs flex items-center gap-1 hover:text-red-300">
              View <ArrowRight className="w-3 h-3" />
            </Link>
          </motion.div>
        )}
        {/* Executive Roadmap Strategy Widget */}
        {phases.length > 0 && (
          <motion.div
            variants={fadeUp}
            className="mt-4 p-5 rounded-2xl glass border border-white/05 grid grid-cols-1 md:grid-cols-3 gap-5 relative overflow-hidden"
          >
            <div className="absolute right-0 top-0 w-24 h-24 bg-[#FFC107]/05 rounded-full blur-2xl pointer-events-none" />

            {/* Col 1: Overall progress ring & Phase details */}
            <div className="flex items-center gap-4 border-r border-white/05 pr-2 last:border-0">
              <div className="w-14 h-14 rounded-full flex items-center justify-center relative bg-white/5 flex-shrink-0">
                <svg className="w-14 h-14 transform -rotate-90">
                  <circle cx="28" cy="28" r="22" stroke="rgba(255,255,255,0.05)" strokeWidth="3.5" fill="transparent" />
                  <circle cx="28" cy="28" r="22" stroke="#FFC107" strokeWidth="3.5" fill="transparent"
                    strokeDasharray={2 * Math.PI * 22}
                    strokeDashoffset={2 * Math.PI * 22 * (1 - overallProgress / 100)} />
                </svg>
                <span className="absolute text-xs font-bold text-foreground">{overallProgress}%</span>
              </div>
              <div className="min-w-0">
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-semibold">Active Phase</span>
                <h4 className="text-xs font-bold text-[#FFC107] truncate mt-0.5">{activePhase?.title || "Phase 1"}</h4>
                <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{activePhase?.description}</p>
              </div>
            </div>

            {/* Col 2: Current & Next Milestone */}
            <div className="flex flex-col justify-center border-r border-white/05 pr-2 last:border-0">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                <Milestone className="w-3.5 h-3.5 text-blue-400" />
                <span className="uppercase tracking-widest font-semibold text-muted-foreground/60">Milestones</span>
                <span className="ml-auto font-bold text-white">{milestoneStats.completed}/{milestoneStats.total}</span>
              </div>
              <h5 className="text-[11px] font-semibold text-white/90 truncate mt-1">{milestoneStats.next}</h5>
              {milestoneStats.deadline && (
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  Target: {format(new Date(milestoneStats.deadline), "d MMM yyyy")}
                </p>
              )}
            </div>

            {/* Col 3: Revenue & Hiring status */}
            <div className="flex flex-col justify-center gap-2">
              {/* Revenue */}
              {financeStats.target > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Revenue:</span>
                    <span className="font-semibold text-white">₹{financeStats.actual.toLocaleString()} / ₹{financeStats.target.toLocaleString()}</span>
                  </div>
                  <Progress value={Math.min(100, (financeStats.actual / financeStats.target) * 100)} className="h-1 bg-white/5" />
                </div>
              )}
              {/* Hiring */}
              {hiringStats.total > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Hiring:</span>
                    <span className="font-semibold text-white">{hiringStats.filled} / {hiringStats.total} filled</span>
                  </div>
                  <Progress value={(hiringStats.filled / hiringStats.total) * 100} className="h-1 bg-white/5" />
                </div>
              )}
              {financeStats.target === 0 && hiringStats.total === 0 && (
                <Link href="/roadmap" className="text-[11px] text-[#FFC107] hover:underline font-semibold flex items-center gap-1">
                  Configure Roadmap Projections & Hiring <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </motion.div>
        )}

        {/* Stats Row (Responsive 2x2 on Mobile, 4 columns on desktop) */}
        <motion.div
          variants={staggerContainer}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4"
        >
          {/* Stat Card 1: Open Tasks */}
          <motion.div variants={fadeUp} className="rounded-2xl p-4 flex flex-col justify-between gap-2 stat-card-amber">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Open Tasks</span>
              <CheckCircle2 className="w-4 h-4 text-[#FFC107]" />
            </div>
            <div>
              <p className="text-3xl font-bold tabular-nums">{openTasksCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{urgentOpenCount} urgent · {doingCount} doing</p>
            </div>
            <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-white/5 mt-1">
              <div className="bg-gray-500" style={{ width: `${(todoCount / (openTasksCount || 1)) * 100}%` }} title="Todo" />
              <div className="bg-[#FFC107]" style={{ width: `${(doingCount / (openTasksCount || 1)) * 100}%` }} title="Doing" />
              <div className="bg-green-500" style={{ width: `${(doneCount / ((openTasksCount + doneCount) || 1)) * 100}%` }} title="Done" />
            </div>
          </motion.div>

          {/* Stat Card 2: Active Goals */}
          <motion.div variants={fadeUp} className="rounded-2xl p-4 flex flex-col justify-between gap-2 glass">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Goals</span>
              <div className="w-8 h-8 flex items-center justify-center relative bg-white/5 rounded-full">
                <svg className="w-8 h-8 transform -rotate-90">
                  <circle cx="16" cy="16" r="10" stroke="rgba(255,255,255,0.05)" strokeWidth="2" fill="transparent" />
                  <circle cx="16" cy="16" r="10" stroke="#FFC107" strokeWidth="2" fill="transparent"
                    strokeDasharray={2 * Math.PI * 10}
                    strokeDashoffset={2 * Math.PI * 10 * (1 - avgGoalProgress / 100)} />
                </svg>
                <span className="absolute text-[8px] font-semibold text-foreground/80">{avgGoalProgress}%</span>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold tabular-nums">{activeGoalsCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">avg {avgGoalProgress}% progress</p>
            </div>
          </motion.div>

          {/* Stat Card 3: Spent This Month */}
          <motion.div variants={fadeUp} className="rounded-2xl p-4 flex flex-col justify-between gap-2 glass">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Spent This Month</span>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className={cn("text-3xl font-bold tabular-nums", spentNumberColor)}>₹{monthExpenses.toLocaleString("en-IN")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{topCategoryThisMonth ? `Top: ${topCategoryThisMonth}` : "No expenses yet"}</p>
            </div>
          </motion.div>

          {/* Stat Card 4: Meetings Today */}
          <motion.div 
            variants={fadeUp} 
            className={cn(
              "rounded-2xl p-4 flex flex-col justify-between gap-2 glass transition-all border",
              nextMeetingSoon ? "animate-[pulse_1.5s_infinite] border-amber-500/50" : "border-white/07"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Meetings Today</span>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-3xl font-bold tabular-nums">{meetingsTodayCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{nextMeetingSubtext}</p>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Priority Tasks */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={staggerContainer}
          className="lg:col-span-2 space-y-4"
        >
          {/* Today's Priorities */}
          <motion.div
            variants={fadeUp}
            className="rounded-2xl p-5 glass"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest">Today&apos;s Priorities</span>
              <Link href="/tasks" className="text-xs text-muted-foreground hover:text-[#FFC107] flex items-center gap-1 transition-colors">
                All tasks <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {tasksLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
              </div>
            ) : todayTasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-10 h-10 text-[#FFC107] mx-auto mb-2 opacity-60 animate-bounce" />
                <p className="text-sm text-muted-foreground">All clear — nothing on the agenda</p>
                <button
                  onClick={() => setQuickAddOpen(true, "task")}
                  className="mt-3 text-xs text-[#FFC107] hover:underline"
                >
                  + Add a task
                </button>
              </div>
            ) : (
              <div className="overflow-hidden">
                <AnimatePresence mode="popLayout">
                  {todayTasks.map(task => (
                    <motion.div
                      key={task.id}
                      variants={fadeUp}
                      exit={taskComplete.exit}
                      layout
                      className="flex items-start gap-3 py-2.5 border-b border-white/05 last:border-0 group"
                    >
                      <button 
                        onClick={() => handleCompleteTask(task)} 
                        className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-green-400 transition-colors"
                      >
                        <Circle className="w-4 h-4" />
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate text-foreground/90">
                            {task.title}
                          </p>
                          <span className={cn("text-[9px] px-1.5 py-0.2 rounded font-medium capitalize border", PRIORITY_BADGE_STYLE[task.priority])}>
                            {task.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{task.assignee}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {task.deadline && getDeadlineChip(task.deadline)}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

          {/* This Week at a Glance (New Section) */}
          <motion.div
            variants={fadeUp}
            className="rounded-2xl p-5 glass"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest">This Week at a Glance</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Due This Week */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/05 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground/80 mb-2">Tasks Due</h4>
                  {weekGlanceTasks.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">No tasks due this week.</p>
                  ) : (
                    <div className="space-y-1 max-h-24 overflow-y-auto no-scrollbar">
                      {weekGlanceTasks.slice(0, 3).map(t => (
                        <p key={t.id} className="text-[11px] text-muted-foreground truncate">· {t.title}</p>
                      ))}
                      {weekGlanceTasks.length > 3 && (
                        <p className="text-[10px] text-[#FFC107] font-medium">+{weekGlanceTasks.length - 3} more</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-3 text-xs font-bold text-[#FFC107]">
                  {weekGlanceTasks.length} Task{weekGlanceTasks.length !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Upcoming Meetings */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/05 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground/80 mb-2">Meetings</h4>
                  {upcomingMeetings.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">None scheduled.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {upcomingMeetings.map(m => (
                        <div key={m.id} className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground truncate max-w-[80px]">{m.title}</span>
                          <span className="text-muted-foreground/60">{format(parseISO(m.scheduledAt), "h:mm a")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-3 text-xs font-bold text-blue-400">
                  {upcomingMeetings.length} Upcoming
                </div>
              </div>

              {/* Money Summary */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/05 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground/80 mb-2">Money Flow</h4>
                  <p className="text-[10px] text-muted-foreground">Spent this week:</p>
                  <p className="text-sm font-bold text-foreground/90 mt-0.5">₹{weekGlanceSpendSummary.thisWeekSpend.toLocaleString("en-IN")}</p>
                </div>
                <div className={cn(
                  "mt-3 text-xs font-bold flex items-center gap-1",
                  weekGlanceSpendSummary.diff > 0 ? "text-red-400" : weekGlanceSpendSummary.diff < 0 ? "text-green-400" : "text-muted-foreground"
                )}>
                  {weekGlanceSpendSummary.diff > 0 ? "+" : ""}
                  ₹{weekGlanceSpendSummary.diff.toLocaleString("en-IN")} vs last week
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Right column */}
        <motion.div initial="hidden" animate="show" variants={staggerContainer} className="space-y-4">
          {/* Goals progress */}
          <motion.div
            variants={fadeUp}
            className="rounded-2xl p-5 glass"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest">Active Goals</span>
              <Link href="/goals" className="text-xs text-muted-foreground hover:text-[#FFC107] flex items-center gap-1 transition-colors">
                All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {goalsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
              </div>
            ) : activeGoals.length === 0 ? (
              <p className="text-xs text-muted-foreground">No active goals yet.</p>
            ) : (
              <div className="space-y-4">
                {activeGoals.map(goal => (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium truncate max-w-[150px]">{goal.title}</p>
                      <span className="text-xs text-[#FFC107] font-semibold ml-2">{goal.progress}%</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#FFC107]" style={{ width: `${goal.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Partners Leads CRM Section (New) */}
          <motion.div
            variants={fadeUp}
            className="rounded-2xl p-5 glass"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest flex items-center gap-1">
                <Handshake className="w-3.5 h-3.5 text-[#FFC107]" /> Partners CRM
              </span>
              <Link href="/partners" className="text-xs text-muted-foreground hover:text-[#FFC107] flex items-center gap-1 transition-colors">
                All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            
            {partnersLoading ? (
              <div className="space-y-2.5">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
              </div>
            ) : (
              <div className="space-y-3">
                <Link href="/partners?filter=interested" className="flex items-center justify-between p-2 rounded-xl bg-green-500/5 hover:bg-green-500/10 border border-green-500/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                    <span className="text-xs font-semibold text-foreground/90">Interested Leads</span>
                  </div>
                  <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">{interestedPartnersCount}</span>
                </Link>
                
                <Link href="/partners?filter=followup" className="flex items-center justify-between p-2 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                    <span className="text-xs font-semibold text-foreground/90">Follow-ups Due</span>
                  </div>
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">{followUpPartnersCount}</span>
                </Link>

                <Link href="/partners?filter=joined" className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                    <span className="text-xs font-semibold text-foreground/90">Joined Partners</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-muted-foreground">₹{totalPartnerCommission.toLocaleString("en-IN")} cut</span>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">{joinedPartnersCount}</span>
                  </div>
                </Link>
              </div>
            )}
          </motion.div>

          {/* Recent expenses */}
          <motion.div
            variants={fadeUp}
            className="rounded-2xl p-5 glass"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest">Recent Expenses</span>
              <Link href="/money" className="text-xs text-muted-foreground hover:text-[#FFC107] flex items-center gap-1 transition-colors">
                All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {expLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
              </div>
            ) : recentExpenses.length === 0 ? (
              <p className="text-xs text-muted-foreground">No expenses tracked yet.</p>
            ) : (
              <div className="space-y-3">
                {recentExpenses.map(exp => {
                  const Icon = CAT_ICONS[exp.category] || HelpCircle;
                  return (
                    <div key={exp.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 text-muted-foreground border border-white/05">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate text-foreground/90">{exp.purpose}</p>
                        <p className="text-[9px] text-muted-foreground capitalize mt-0.5">{exp.category} · paid by {exp.person}</p>
                      </div>
                      <span className="text-sm font-semibold text-foreground/80">₹{exp.amount.toLocaleString("en-IN")}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
