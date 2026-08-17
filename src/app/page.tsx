"use client";
// src/app/page.tsx — AutoBee OS Home Screen Personalized Founder Dashboard
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  format, isToday, isPast, startOfMonth, endOfMonth,
  isWithinInterval, parseISO
} from "date-fns";
import {
  CheckCircle2, Circle, Target, ArrowRight, Plus,
  AlertCircle, DollarSign, Calendar, Handshake, Zap, ChevronRight
} from "lucide-react";
import Link from "next/link";
import { useTaskStore } from "@/store/useTaskStore";
import { useGoalStore } from "@/store/useGoalStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useMeetingStore } from "@/store/useMeetingStore";
import { usePartnerStore } from "@/store/usePartnerStore";
import { useUIStore } from "@/store/useUIStore";
import { useWorkdayStore } from "@/store/useWorkdayStore";
import { getISTDateInfo } from "@/lib/supabase/workday";
import { logActivity } from "@/lib/supabase/activity";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";
import { fadeUp, staggerContainer, taskComplete } from "@/lib/animations";
import { WorkdayCard } from "@/components/workday/WorkdayCard";
import { OfficePresenceCard } from "@/components/workday/OfficePresenceCard";
import { AttendanceHistoryModal } from "@/components/workday/AttendanceHistoryModal";

const PRIORITY_BADGE_STYLE: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-400 border border-red-500/30",
  high: "bg-amber-500/15 text-[#FFC107] border border-amber-500/30",
  medium: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  low: "bg-gray-500/15 text-gray-400 border border-gray-500/30",
};

export default function Dashboard() {
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const currentUser = useUIStore((s) => s.currentUser);
  const { setQuickAddOpen } = useUIStore();

  const { tasks, loading: tasksLoading, deleteTask: storeDeleteTask } = useTaskStore();
  const { goals, loading: goalsLoading } = useGoalStore();
  const { expenses, loading: expLoading } = useExpenseStore();
  const { meetings, loading: meetingsLoading } = useMeetingStore();
  const { partners, loading: partnersLoading } = usePartnerStore();
  const { todayWorkdays } = useWorkdayStore();

  const now = new Date();
  const { hours } = getISTDateInfo(now);

  const myWorkday = todayWorkdays.find((w) => w.founderName === currentUser);

  // ── USER-SPECIFIC TASKS FILTERING (STRICT PERSONALIZATION) ──
  const myOpenTasks = useMemo(() => {
    return tasks.filter(
      (t) => t.status !== "done" && (t.assignee === currentUser || t.assignee === "All")
    );
  }, [tasks, currentUser]);

  const myUrgentTasks = useMemo(() => {
    return myOpenTasks.filter((t) => t.priority === "urgent");
  }, [myOpenTasks]);

  const myDueTodayTasks = useMemo(() => {
    return myOpenTasks.filter(
      (t) => t.deadline && isToday(new Date(t.deadline))
    );
  }, [myOpenTasks]);

  const myOverdueTasks = useMemo(() => {
    return myOpenTasks.filter(
      (t) => t.deadline && isPast(new Date(t.deadline)) && !isToday(new Date(t.deadline))
    );
  }, [myOpenTasks]);

  // Dynamic Time-of-Day Greeting with Emojis
  const greetingText = useMemo(() => {
    if (hours < 12) return `Good morning,\n${currentUser}. ☀️`;
    if (hours < 17) return `Good afternoon,\n${currentUser}. 👋`;
    return `Good evening,\n${currentUser}. 🌙`;
  }, [hours, currentUser]);

  // Contextual Subtitle based on User's Active State
  const contextualLine = useMemo(() => {
    if (myUrgentTasks.length > 0) {
      return `You have ${myUrgentTasks.length} urgent task${myUrgentTasks.length > 1 ? "s that need" : " that needs"} your attention.`;
    }
    if (myDueTodayTasks.length > 0) {
      return `${myDueTodayTasks.length} thing${myDueTodayTasks.length > 1 ? "s" : ""} need${myDueTodayTasks.length === 1 ? "s" : ""} your attention today.`;
    }
    if (myOverdueTasks.length > 0) {
      return `${myOverdueTasks.length} task${myOverdueTasks.length > 1 ? "s are" : " is"} overdue.`;
    }
    if (myOpenTasks.length > 0) {
      return `${myOpenTasks.length} task${myOpenTasks.length > 1 ? "s are" : ""} in your queue. Let's make today count.`;
    }
    return "You're clear for now. Let's make today count.";
  }, [myUrgentTasks, myDueTodayTasks, myOverdueTasks, myOpenTasks]);

  // ── TODAY'S FOCUS PRIORITY LOGIC ──
  // 1. Urgent + due today
  // 2. High priority + due today
  // 3. Urgent overdue
  // 4. High priority overdue
  // 5. Medium due today
  // 6. Upcoming task assigned to user
  const focusTask = useMemo(() => {
    if (myOpenTasks.length === 0) return null;

    // 1. Urgent + due today
    const urgentToday = myOpenTasks.find(
      (t) => t.priority === "urgent" && t.deadline && isToday(new Date(t.deadline))
    );
    if (urgentToday) return urgentToday;

    // 2. High + due today
    const highToday = myOpenTasks.find(
      (t) => t.priority === "high" && t.deadline && isToday(new Date(t.deadline))
    );
    if (highToday) return highToday;

    // 3. Urgent overdue
    const urgentOverdue = myOpenTasks.find(
      (t) => t.priority === "urgent" && t.deadline && isPast(new Date(t.deadline))
    );
    if (urgentOverdue) return urgentOverdue;

    // 4. High overdue
    const highOverdue = myOpenTasks.find(
      (t) => t.priority === "high" && t.deadline && isPast(new Date(t.deadline))
    );
    if (highOverdue) return highOverdue;

    // 5. Medium due today
    const medToday = myOpenTasks.find(
      (t) => t.priority === "medium" && t.deadline && isToday(new Date(t.deadline))
    );
    if (medToday) return medToday;

    // 6. Any urgent or high
    const urgentOrHigh = myOpenTasks.find(
      (t) => t.priority === "urgent" || t.priority === "high"
    );
    if (urgentOrHigh) return urgentOrHigh;

    // 7. First upcoming assigned task
    return myOpenTasks[0];
  }, [myOpenTasks]);

  // Goals Overview
  const activeGoals = useMemo(() => goals.filter((g) => g.status === "active"), [goals]);
  const activeGoalsCount = activeGoals.length;
  const topGoal = useMemo(() => activeGoals[0] || null, [activeGoals]);

  const avgGoalProgress = useMemo(() => {
    return activeGoals.length > 0
      ? Math.round(activeGoals.reduce((s, g) => s + g.progress, 0) / activeGoals.length)
      : 0;
  }, [activeGoals]);

  // Overall Task Previews for Home
  const allOpenTasksCount = useMemo(
    () => tasks.filter((t) => t.status !== "done").length,
    [tasks]
  );
  const allUrgentCount = useMemo(
    () => tasks.filter((t) => t.status !== "done" && t.priority === "urgent").length,
    [tasks]
  );

  const previewTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status !== "done")
      .sort((a, b) => {
        const order = { urgent: 0, high: 1, medium: 2, low: 3 };
        return order[a.priority] - order[b.priority];
      })
      .slice(0, 3);
  }, [tasks]);

  // Financial Summary
  const monthExpenses = useMemo(() => {
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return expenses
      .filter((e) => {
        const d = parseISO(e.date);
        return isWithinInterval(d, { start, end });
      })
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses, now]);

  // Meetings Today
  const meetingsTodayCount = useMemo(() => {
    return meetings.filter((m) => {
      const d = parseISO(m.scheduledAt.split("T")[0]);
      return isToday(d) && m.status !== "cancelled";
    }).length;
  }, [meetings]);

  // Partners CRM
  const interestedPartnersCount = useMemo(
    () => partners.filter((p) => p.pipeline_status === "Interested" || p.pipeline_status === "Negotiating").length,
    [partners]
  );
  const followUpPartnersCount = useMemo(
    () => partners.filter((p) => p.follow_up_needed || p.pipeline_status === "Follow-Up").length,
    [partners]
  );

  const handleCompleteTask = async (task: Task) => {
    try {
      await logActivity({
        type: "completed",
        entityId: task.id,
        entityType: "task",
        description: `Task "${task.title}" completed`,
      });
      await storeDeleteTask(task.id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="px-4 py-5 max-w-5xl mx-auto space-y-4">
      {/* 1. Personalized Header */}
      <motion.div initial="hidden" animate="show" variants={staggerContainer} className="space-y-4">
        <motion.div variants={fadeUp} className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground whitespace-pre-line leading-tight">
              {greetingText}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              {contextualLine}
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => setQuickAddOpen(true, "task")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-foreground text-xs font-semibold shadow-sm transition-all cursor-pointer shrink-0 mt-1"
          >
            <Plus className="w-3.5 h-3.5 text-[#FFC107]" strokeWidth={2.5} />
            <span>Quick Add</span>
          </motion.button>
        </motion.div>

        {/* 2. COMPACT HERO OFFICE CHECK-IN CARD */}
        <motion.div variants={fadeUp}>
          <WorkdayCard onOpenHistory={() => setHistoryModalOpen(true)} />
        </motion.div>

        {/* 3. ⚡ TODAY'S FOCUS (STRICTLY PERSONALIZED TO CURRENT USER) */}
        <motion.div variants={fadeUp}>
          <div className="rounded-2xl bg-[#141414]/90 border border-white/[0.08] p-4 sm:p-5 shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[#FFC107] font-bold text-xs">⚡</span>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  TODAY'S FOCUS
                </span>
              </div>

              {focusTask && (
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide",
                    focusTask.priority === "urgent"
                      ? "bg-red-500/15 text-red-400 border border-red-500/30"
                      : focusTask.priority === "high"
                      ? "bg-amber-500/15 text-[#FFC107] border border-amber-500/30"
                      : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                  )}
                >
                  {focusTask.priority === "urgent" ? "URGENT" : `${focusTask.priority.toUpperCase()} PRIORITY`}
                </span>
              )}
            </div>

            {focusTask ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5 max-w-xl">
                  <p className="text-sm sm:text-base font-bold text-foreground leading-snug">
                    {focusTask.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {focusTask.deadline
                      ? isToday(new Date(focusTask.deadline))
                        ? "Due today"
                        : isPast(new Date(focusTask.deadline))
                        ? `Overdue (${format(new Date(focusTask.deadline), "d MMM")})`
                        : `Due ${format(new Date(focusTask.deadline), "d MMM")}`
                      : "Priority task"}
                    {" · "}
                    <span className="capitalize">{focusTask.priority} priority</span>
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => handleCompleteTask(focusTask)}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-emerald-500/20 border border-white/08 hover:border-emerald-500/30 text-xs font-semibold text-muted-foreground hover:text-emerald-400 transition-all cursor-pointer"
                  >
                    Done
                  </button>
                  <Link
                    href="/tasks"
                    className="px-3 py-1.5 rounded-xl bee-gradient text-[#111] font-bold text-xs flex items-center gap-1 hover:scale-[1.02] transition-transform"
                  >
                    <span>View Task</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between py-1">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground/90">You're clear for now.</p>
                  <p className="text-xs text-muted-foreground">No tasks need your attention.</p>
                </div>
                <Link
                  href="/tasks"
                  className="text-xs text-[#FFC107] hover:underline flex items-center gap-1 font-medium"
                >
                  All tasks <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        {/* 4. TODAY AT THE OFFICE (FOUNDER ROLES & PRESENCE) */}
        <motion.div variants={fadeUp}>
          <OfficePresenceCard />
        </motion.div>

        {/* 5. Core Actions & Daily Previews Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* TODAY'S TASKS PREVIEW */}
          <motion.div
            variants={fadeUp}
            className="rounded-2xl bg-[#141414]/90 border border-white/[0.08] p-4 sm:p-5 space-y-3 shadow-sm backdrop-blur-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FFC107]" />
                <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">
                  TODAY'S TASKS
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {allOpenTasksCount} open {allUrgentCount > 0 && `· ${allUrgentCount} urgent`}
                </span>
                <Link
                  href="/tasks"
                  className="text-xs text-[#FFC107] font-semibold hover:underline flex items-center gap-0.5 ml-2"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {tasksLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full rounded-xl" />
                ))}
              </div>
            ) : previewTasks.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-400/80 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">All clear for today!</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <AnimatePresence mode="popLayout">
                  {previewTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      variants={fadeUp}
                      exit={taskComplete.exit}
                      layout
                      className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/10 transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          onClick={() => handleCompleteTask(task)}
                          className="shrink-0 text-muted-foreground hover:text-emerald-400 transition-colors cursor-pointer"
                        >
                          <Circle className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-semibold text-foreground/90 truncate">
                          {task.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn("text-[9px] font-semibold px-1.5 py-0.2 rounded capitalize", PRIORITY_BADGE_STYLE[task.priority])}>
                          {task.priority}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

          {/* GOALS PREVIEW */}
          <motion.div
            variants={fadeUp}
            className="rounded-2xl bg-[#141414]/90 border border-white/[0.08] p-4 sm:p-5 space-y-3 shadow-sm backdrop-blur-md flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-[#FFC107]" />
                  <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">
                    GOALS
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {activeGoalsCount} active
                  </span>
                  <Link
                    href="/goals"
                    className="text-xs text-[#FFC107] font-semibold hover:underline flex items-center gap-0.5 ml-2"
                  >
                    View goals <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {goalsLoading ? (
                <Skeleton className="h-12 w-full rounded-xl" />
              ) : topGoal ? (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground/90 truncate max-w-[200px]">
                      {topGoal.title}
                    </span>
                    <span className="text-xs font-bold text-[#FFC107]">
                      {topGoal.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#FFC107] transition-all duration-500"
                      style={{ width: `${topGoal.progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-2">No active goals tracked yet.</p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.05] text-xs text-muted-foreground">
              <span>Average Goal Progress</span>
              <span className="font-bold text-foreground/90 tabular-nums">{avgGoalProgress}%</span>
            </div>
          </motion.div>
        </div>

        {/* 6. SECONDARY METRICS SNAPSHOT */}
        <motion.div
          variants={fadeUp}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1"
        >
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Meetings Today</span>
              <Calendar className="w-3 h-3 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold tabular-nums text-foreground/90">{meetingsTodayCount}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Spent This Month</span>
              <DollarSign className="w-3 h-3 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold tabular-nums text-foreground/90">
              ₹{monthExpenses.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Partners Leads</span>
              <Handshake className="w-3 h-3 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold tabular-nums text-foreground/90">
              {interestedPartnersCount} <span className="text-xs font-normal text-muted-foreground">active</span>
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Attendance History Modal */}
      <AnimatePresence>
        {historyModalOpen && (
          <AttendanceHistoryModal onClose={() => setHistoryModalOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
