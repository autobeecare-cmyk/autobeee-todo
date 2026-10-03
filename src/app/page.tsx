"use client";

// src/app/page.tsx — AutoBee OS Optimized Founder Dashboard
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  format,
  isToday,
  isPast,
  parseISO,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from "date-fns";
import {
  CheckCircle2,
  Target,
  ArrowRight,
  Plus,
  Calendar,
  CheckSquare,
  Circle,
  Bot,
  DollarSign,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useTaskStore } from "@/store/useTaskStore";
import { useGoalStore } from "@/store/useGoalStore";
import { useMeetingStore } from "@/store/useMeetingStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useUIStore } from "@/store/useUIStore";
import { logActivity } from "@/lib/supabase/activity";
import { Skeleton } from "@/components/ui/skeleton";
import type { Task, FounderName } from "@/lib/types";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { AutoBeeBadge } from "@/components/common/AutoBeeBadge";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";

export default function Dashboard() {
  const currentUser = useUIStore((s) => s.currentUser) as FounderName;
  const { setQuickAddOpen } = useUIStore();

  const { tasks, loading: tasksLoading, deleteTask: storeDeleteTask } = useTaskStore();
  const { goals, loading: goalsLoading } = useGoalStore();
  const { meetings, loading: meetingsLoading } = useMeetingStore();
  const { expenses, loading: expensesLoading } = useExpenseStore();

  // ──────────────────────────────────────────────
  // 1. STRICT FOUNDER-SPECIFIC TASK PERSONALIZATION
  // ──────────────────────────────────────────────
  const myOpenTasks = useMemo(() => {
    return tasks.filter(
      (t) => t.status !== "done" && (t.assignee === currentUser || t.assignee === "All")
    );
  }, [tasks, currentUser]);

  const myCompletedTasksToday = useMemo(() => {
    return tasks.filter(
      (t) =>
        t.status === "done" &&
        (t.assignee === currentUser || t.assignee === "All") &&
        t.updatedAt &&
        isToday(new Date(t.updatedAt))
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

  // Contextual status headline
  const contextualLine = useMemo(() => {
    if (myUrgentTasks.length > 0) {
      return `${myUrgentTasks.length} urgent task${myUrgentTasks.length > 1 ? "s need" : " needs"} attention.`;
    }
    if (myDueTodayTasks.length > 0) {
      return `${myDueTodayTasks.length} thing${myDueTodayTasks.length > 1 ? "s" : ""} due today.`;
    }
    if (myOverdueTasks.length > 0) {
      return `${myOverdueTasks.length} task${myOverdueTasks.length > 1 ? "s are" : " is"} overdue.`;
    }
    if (myCompletedTasksToday.length > 0) {
      return `${myCompletedTasksToday.length} completed today. Keep up the momentum!`;
    }
    if (myOpenTasks.length > 0) {
      return `${myOpenTasks.length} task${myOpenTasks.length > 1 ? "s" : ""} in your queue.`;
    }
    return "You're all clear for now. Great time for deep strategic work.";
  }, [myUrgentTasks, myDueTodayTasks, myOverdueTasks, myCompletedTasksToday, myOpenTasks]);

  // ──────────────────────────────────────────────
  // 2. TODAY'S FOCUS (Strictly Founder-Specific)
  // ──────────────────────────────────────────────
  const focusTask = useMemo(() => {
    if (myOpenTasks.length === 0) return null;

    const urgentToday = myOpenTasks.find(
      (t) => t.priority === "urgent" && t.deadline && isToday(new Date(t.deadline))
    );
    if (urgentToday) return urgentToday;

    const highToday = myOpenTasks.find(
      (t) => t.priority === "high" && t.deadline && isToday(new Date(t.deadline))
    );
    if (highToday) return highToday;

    const urgentOverdue = myOpenTasks.find(
      (t) => t.priority === "urgent" && t.deadline && isPast(new Date(t.deadline))
    );
    if (urgentOverdue) return urgentOverdue;

    const highOverdue = myOpenTasks.find(
      (t) => t.priority === "high" && t.deadline && isPast(new Date(t.deadline))
    );
    if (highOverdue) return highOverdue;

    const medToday = myOpenTasks.find(
      (t) => t.priority === "medium" && t.deadline && isToday(new Date(t.deadline))
    );
    if (medToday) return medToday;

    const urgentOrHigh = myOpenTasks.find(
      (t) => t.priority === "urgent" || t.priority === "high"
    );
    if (urgentOrHigh) return urgentOrHigh;

    return myOpenTasks[0];
  }, [myOpenTasks]);

  // ──────────────────────────────────────────────
  // 3. STATS DATA
  // ──────────────────────────────────────────────
  const activeGoals = useMemo(() => goals.filter((g) => g.status === "active"), [goals]);
  const activeGoalsCount = activeGoals.length;
  const avgGoalProgress = useMemo(() => {
    return activeGoals.length > 0
      ? Math.round(activeGoals.reduce((s, g) => s + g.progress, 0) / activeGoals.length)
      : 0;
  }, [activeGoals]);

  const meetingsTodayCount = useMemo(() => {
    return meetings.filter((m) => {
      const d = parseISO(m.scheduledAt.split("T")[0]);
      return isToday(d) && m.status !== "cancelled";
    }).length;
  }, [meetings]);

  const upcomingMeetingsCount = useMemo(() => {
    return meetings.filter((m) => m.status === "upcoming").length;
  }, [meetings]);

  // Current month company spend
  const monthSpending = useMemo(() => {
    const now = new Date();
    const interval = { start: startOfMonth(now), end: endOfMonth(now) };
    return expenses
      .filter((e) => {
        try {
          return isWithinInterval(parseISO(e.date), interval);
        } catch {
          return false;
        }
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  // Complete Task handler
  const [completedTaskId, setCompletedTaskId] = useState<string | null>(null);

  const handleCompleteTask = async (task: Task) => {
    try {
      setCompletedTaskId(task.id);
      await logActivity({
        type: "completed",
        entityId: task.id,
        entityType: "task",
        description: `Task "${task.title}" completed by ${currentUser}`,
      });
      setTimeout(async () => {
        await storeDeleteTask(task.id);
        setCompletedTaskId(null);
      }, 350);
    } catch (err) {
      console.error(err);
      setCompletedTaskId(null);
    }
  };

  // Shared Subcomponents for Desktop & Mobile
  const FocusCard = (
    <div className="glass-card-premium p-4 sm:p-5 space-y-3 shadow-md border border-white/[0.08]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[#FFC107] font-bold text-xs">⚡</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            TODAY'S FOCUS
          </span>
        </div>

        {focusTask && (
          <AutoBeeBadge variant="priority" priority={focusTask.priority} />
        )}
      </div>

      {focusTask ? (
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <p className="text-xs sm:text-sm font-bold text-foreground leading-snug truncate">
              {focusTask.title}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
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

          <div className="shrink-0 flex items-center gap-1.5">
            <button
              onClick={() => handleCompleteTask(focusTask)}
              disabled={completedTaskId === focusTask.id}
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/30 text-[11px] font-semibold text-muted-foreground hover:text-emerald-400 transition-all cursor-pointer flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Done</span>
            </button>
            <Link
              href="/tasks"
              className="px-2.5 py-1 rounded-lg bee-gradient text-[#111] font-bold text-[11px] flex items-center gap-1 hover:scale-[1.02] transition-transform cursor-pointer shadow-sm"
            >
              <span>View</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between py-1">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-foreground">You're clear for now.</p>
            <p className="text-[10px] text-muted-foreground">Nice work. All priority tasks completed.</p>
          </div>
          <Link
            href="/tasks"
            className="text-xs text-[#FFC107] hover:underline flex items-center gap-0.5 font-semibold"
          >
            Tasks <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );

  const QuickStatsGrid = (
    <div className="grid grid-cols-2 gap-2.5">
      {/* TASKS */}
      <Link href="/tasks" className="block group">
        <div className="glass-card-premium p-3.5 rounded-xl border border-white/[0.07] hover:border-[#FFC107]/30 transition-all space-y-0.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider">TASKS</span>
            <CheckSquare className="w-3.5 h-3.5 text-[#FFC107] group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-lg font-black text-foreground tabular-nums">
            {tasksLoading ? <Skeleton className="h-6 w-10 rounded-md" /> : myOpenTasks.length}
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            {myDueTodayTasks.length > 0
              ? `${myDueTodayTasks.length} due today`
              : `${myCompletedTasksToday.length} done today`}
          </p>
        </div>
      </Link>

      {/* GOALS */}
      <Link href="/goals" className="block group">
        <div className="glass-card-premium p-3.5 rounded-xl border border-white/[0.07] hover:border-purple-500/30 transition-all space-y-0.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider">GOALS</span>
            <Target className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-lg font-black text-foreground tabular-nums">
            {goalsLoading ? <Skeleton className="h-6 w-10 rounded-md" /> : activeGoalsCount}
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            {avgGoalProgress}% avg progress
          </p>
        </div>
      </Link>

      {/* MEETINGS */}
      <Link href="/meetings" className="block group">
        <div className="glass-card-premium p-3.5 rounded-xl border border-white/[0.07] hover:border-orange-500/30 transition-all space-y-0.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider">MEETINGS</span>
            <Calendar className="w-3.5 h-3.5 text-orange-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-lg font-black text-foreground tabular-nums">
            {meetingsLoading ? <Skeleton className="h-6 w-10 rounded-md" /> : meetingsTodayCount}
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            {meetingsTodayCount === 0 ? "None today" : `${upcomingMeetingsCount} upcoming`}
          </p>
        </div>
      </Link>

      {/* MONEY TRACKER */}
      <Link href="/money" className="block group">
        <div className="glass-card-premium p-3.5 rounded-xl border border-white/[0.07] hover:border-emerald-500/30 transition-all space-y-0.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider">SPENDING</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-lg font-black text-foreground tabular-nums">
            {expensesLoading ? (
              <Skeleton className="h-6 w-14 rounded-md" />
            ) : (
              `₹${monthSpending.toLocaleString("en-IN")}`
            )}
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            This month
          </p>
        </div>
      </Link>
    </div>
  );

  const QuickActionsSection = (
    <div className="glass-card-premium p-4 rounded-2xl space-y-2.5 border border-white/[0.07]">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
        QUICK ACTIONS
      </span>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setQuickAddOpen(true, "task")}
          className="flex items-center gap-1.5 p-2.5 rounded-xl bg-white/[0.02] hover:bg-[#FFC107]/15 border border-white/06 hover:border-[#FFC107]/30 text-xs font-semibold text-foreground hover:text-[#FFC107] transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-[#FFC107]" />
          <span>+ Task</span>
        </button>

        <Link
          href="/goals"
          className="flex items-center gap-1.5 p-2.5 rounded-xl bg-white/[0.02] hover:bg-purple-500/15 border border-white/06 hover:border-purple-500/30 text-xs font-semibold text-foreground hover:text-purple-300 transition-all cursor-pointer"
        >
          <Target className="w-3.5 h-3.5 text-purple-400" />
          <span>+ Goal</span>
        </Link>

        <Link
          href="/meetings"
          className="flex items-center gap-1.5 p-2.5 rounded-xl bg-white/[0.02] hover:bg-orange-500/15 border border-white/06 hover:border-orange-500/30 text-xs font-semibold text-foreground hover:text-orange-300 transition-all cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5 text-orange-400" />
          <span>+ Meeting</span>
        </Link>

        <button
          onClick={() => setQuickAddOpen(true, "expense")}
          className="flex items-center gap-1.5 p-2.5 rounded-xl bg-white/[0.02] hover:bg-emerald-500/15 border border-white/06 hover:border-emerald-500/30 text-xs font-semibold text-foreground hover:text-emerald-300 transition-all cursor-pointer"
        >
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          <span>+ Expense</span>
        </button>

        <Link
          href="/ai"
          className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-white/[0.02] hover:bg-cyan-500/15 border border-white/06 hover:border-cyan-500/30 text-xs font-semibold text-foreground hover:text-cyan-300 transition-all cursor-pointer col-span-2"
        >
          <Bot className="w-3.5 h-3.5 text-cyan-400" />
          <span>AI Assistant</span>
        </Link>
      </div>
    </div>
  );

  const ImportantTasksSection = (
    <div className="glass-card-premium p-4 sm:p-5 rounded-2xl space-y-3 border border-white/[0.08]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CheckSquare className="w-3.5 h-3.5 text-[#FFC107]" />
          <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">
            PRIORITY TASKS
          </h3>
        </div>
        <Link
          href="/tasks"
          className="text-xs text-[#FFC107] font-semibold hover:underline flex items-center gap-0.5"
        >
          View all ({myOpenTasks.length}) <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {myOpenTasks.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-xs text-muted-foreground">All priority tasks cleared! You're ready for new objectives.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {myOpenTasks.slice(0, 4).map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] transition-all group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                <button
                  onClick={() => handleCompleteTask(task)}
                  className="shrink-0 text-muted-foreground hover:text-emerald-400 transition-colors cursor-pointer"
                  title="Mark as done"
                >
                  <Circle className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground/90 truncate">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                    <AutoBeeBadge variant="priority" priority={task.priority} size="sm" />
                    {task.deadline && (
                      <span>· Due {format(new Date(task.deadline), "d MMM")}</span>
                    )}
                  </div>
                </div>
              </div>
              <Link
                href="/tasks"
                className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-[#FFC107] transition-opacity"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-[1560px] w-full mx-auto space-y-4">
      <motion.div
        initial="hidden"
        animate="show"
        variants={staggerContainer}
        className="space-y-4"
      >
        {/* ──────────────────────────────────────────────
            MOBILE LAYOUT (< 1024px)
            Natural flow without attendance gaps:
            Welcome Banner -> Focus Card -> Quick Stats (2x2) -> Tasks -> Quick Actions
        ────────────────────────────────────────────── */}
        <div className="lg:hidden space-y-3.5">
          <motion.div variants={fadeUp}>
            <WelcomeBanner
              currentUser={currentUser}
              contextualLine={contextualLine}
              onAddTask={() => setQuickAddOpen(true, "task")}
            />
          </motion.div>

          <motion.div variants={fadeUp}>
            {FocusCard}
          </motion.div>

          <motion.div variants={fadeUp}>
            {QuickStatsGrid}
          </motion.div>

          <motion.div variants={fadeUp}>
            {ImportantTasksSection}
          </motion.div>

          <motion.div variants={fadeUp}>
            {QuickActionsSection}
          </motion.div>
        </div>

        {/* ──────────────────────────────────────────────
            DESKTOP LAYOUT (>= 1024px)
            2-Column balanced executive grid:
            Left (7 cols): WelcomeBanner -> FocusCard -> ImportantTasksSection
            Right (5 cols): QuickStatsGrid -> QuickActionsSection
        ────────────────────────────────────────────── */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-4 items-start">
          {/* LEFT / MAIN COLUMN (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <motion.div variants={fadeUp}>
              <WelcomeBanner
                currentUser={currentUser}
                contextualLine={contextualLine}
                onAddTask={() => setQuickAddOpen(true, "task")}
              />
            </motion.div>

            <motion.div variants={fadeUp}>
              {FocusCard}
            </motion.div>

            <motion.div variants={fadeUp}>
              {ImportantTasksSection}
            </motion.div>
          </div>

          {/* RIGHT / SECONDARY COLUMN (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <motion.div variants={fadeUp}>
              {QuickStatsGrid}
            </motion.div>

            <motion.div variants={fadeUp}>
              {QuickActionsSection}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
