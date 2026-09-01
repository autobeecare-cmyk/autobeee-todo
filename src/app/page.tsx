"use client";

// src/app/page.tsx — AutoBee OS Optimized Founder Dashboard
import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  isToday,
  isPast,
  parseISO,
} from "date-fns";
import {
  CheckCircle2,
  Target,
  ArrowRight,
  Plus,
  Calendar,
  Clock,
  CheckSquare,
  Bot,
  DollarSign,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useTaskStore } from "@/store/useTaskStore";
import { useGoalStore } from "@/store/useGoalStore";
import { useMeetingStore } from "@/store/useMeetingStore";
import { useUIStore } from "@/store/useUIStore";
import { useWorkdayStore } from "@/store/useWorkdayStore";
import { getISTDateInfo } from "@/lib/supabase/workday";
import { logActivity } from "@/lib/supabase/activity";
import { Skeleton } from "@/components/ui/skeleton";
import type { Task, FounderName } from "@/lib/types";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { WorkdayCard } from "@/components/workday/WorkdayCard";
import { OfficePresenceCard } from "@/components/workday/OfficePresenceCard";
import { AttendanceHistoryModal } from "@/components/workday/AttendanceHistoryModal";
import { AutoBeeBadge } from "@/components/common/AutoBeeBadge";

const FOUNDER_ROLES: Record<string, string> = {
  Sourabh: "CEO",
  Asher: "CTO",
  Subin: "COO",
};

export default function Dashboard() {
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const currentUser = useUIStore((s) => s.currentUser) as FounderName;
  const { setQuickAddOpen } = useUIStore();

  const { tasks, loading: tasksLoading, deleteTask: storeDeleteTask } = useTaskStore();
  const { goals, loading: goalsLoading } = useGoalStore();
  const { meetings, loading: meetingsLoading } = useMeetingStore();
  const { todayWorkdays } = useWorkdayStore();

  const now = new Date();
  const { hours } = getISTDateInfo(now);

  const myWorkday = todayWorkdays.find((w) => w.founderName === currentUser);

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

  // ──────────────────────────────────────────────
  // 2. DYNAMIC GREETING & CONTEXT
  // ──────────────────────────────────────────────
  const greetingObj = useMemo(() => {
    if (hours < 12) {
      return { title: `Good morning,\n${currentUser}. ☀️` };
    }
    if (hours < 17) {
      return { title: `Good afternoon,\n${currentUser}. 👋` };
    }
    return { title: `Good evening,\n${currentUser}. 🌙` };
  }, [hours, currentUser]);

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
      return `${myCompletedTasksToday.length} completed today. Keep it up!`;
    }
    if (myOpenTasks.length > 0) {
      return `${myOpenTasks.length} task${myOpenTasks.length > 1 ? "s" : ""} in queue.`;
    }
    return "You're all clear for now.";
  }, [myUrgentTasks, myDueTodayTasks, myOverdueTasks, myCompletedTasksToday, myOpenTasks]);

  // ──────────────────────────────────────────────
  // 3. TODAY'S FOCUS (Strictly Founder-Specific)
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
  // 4. STATS DATA
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

  const [focusTimeStr, setFocusTimeStr] = useState("0h 00m");

  useEffect(() => {
    if (!myWorkday || myWorkday.status !== "working" || !myWorkday.checkInAt) {
      if (myWorkday?.status === "completed" && myWorkday.checkInAt && myWorkday.checkOutAt) {
        const start = new Date(myWorkday.checkInAt).getTime();
        const end = new Date(myWorkday.checkOutAt).getTime();
        const diffMs = Math.max(0, end - start);
        const h = Math.floor(diffMs / 3600000);
        const m = Math.floor((diffMs % 3600000) / 60000);
        setFocusTimeStr(`${h}h ${String(m).padStart(2, "0")}m`);
      } else {
        setFocusTimeStr("0h 00m");
      }
      return;
    }

    const calc = () => {
      const checkInTime = new Date(myWorkday.checkInAt).getTime();
      const diffMs = Math.max(0, Date.now() - checkInTime);
      const h = Math.floor(diffMs / 3600000);
      const m = Math.floor((diffMs % 3600000) / 60000);
      setFocusTimeStr(`${h}h ${String(m).padStart(2, "0")}m`);
    };
    calc();
    const interval = setInterval(calc, 60000);
    return () => clearInterval(interval);
  }, [myWorkday]);

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

  const userRole = FOUNDER_ROLES[currentUser] || "Founder";

  // Shared Subcomponents for Desktop & Mobile
  const FocusCard = (
    <div className="glass-card-premium p-3.5 sm:p-4 space-y-2.5 shadow-sm">
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
        <div className="flex items-center justify-between py-0.5">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-foreground">You're clear for now.</p>
            <p className="text-[10px] text-muted-foreground">Nice work. No pending items.</p>
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
    <div className="grid grid-cols-2 gap-2">
      {/* TASKS */}
      <Link href="/tasks" className="block group">
        <div className="glass-card-premium p-3 rounded-xl border border-white/[0.07] hover:border-[#FFC107]/30 transition-all space-y-0.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider">TASKS</span>
            <CheckSquare className="w-3 h-3 text-[#FFC107] group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-lg font-black text-foreground tabular-nums">
            {tasksLoading ? <Skeleton className="h-6 w-10 rounded-md" /> : myOpenTasks.length}
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            {myDueTodayTasks.length > 0
              ? `${myDueTodayTasks.length} due today`
              : `${myCompletedTasksToday.length} done`}
          </p>
        </div>
      </Link>

      {/* GOALS */}
      <Link href="/goals" className="block group">
        <div className="glass-card-premium p-3 rounded-xl border border-white/[0.07] hover:border-purple-500/30 transition-all space-y-0.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider">GOALS</span>
            <Target className="w-3 h-3 text-purple-400 group-hover:scale-110 transition-transform" />
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
        <div className="glass-card-premium p-3 rounded-xl border border-white/[0.07] hover:border-orange-500/30 transition-all space-y-0.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider">MEETINGS</span>
            <Calendar className="w-3 h-3 text-orange-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-lg font-black text-foreground tabular-nums">
            {meetingsLoading ? <Skeleton className="h-6 w-10 rounded-md" /> : meetingsTodayCount}
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            {meetingsTodayCount === 0 ? "None today" : `${upcomingMeetingsCount} upcoming`}
          </p>
        </div>
      </Link>

      {/* FOCUS */}
      <div className="glass-card-premium p-3 rounded-xl border border-white/[0.07] hover:border-emerald-500/30 transition-all space-y-0.5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[10px] font-bold uppercase tracking-wider">FOCUS</span>
          <Clock className="w-3 h-3 text-emerald-400" />
        </div>
        <div className="text-lg font-black text-foreground tabular-nums">
          {focusTimeStr}
        </div>
        <p className="text-[10px] text-muted-foreground truncate">
          {myWorkday?.status === "working" ? "Active today" : "Logged time"}
        </p>
      </div>
    </div>
  );

  const QuickActionsSection = (
    <div className="glass-card-premium p-3 rounded-xl space-y-2">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
        QUICK ACTIONS
      </span>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-1.5">
        <button
          onClick={() => setQuickAddOpen(true, "task")}
          className="flex items-center gap-1.5 p-2 rounded-lg bg-white/[0.02] hover:bg-[#FFC107]/15 border border-white/06 hover:border-[#FFC107]/30 text-[11px] font-semibold text-foreground hover:text-[#FFC107] transition-all cursor-pointer"
        >
          <Plus className="w-3 h-3 text-[#FFC107]" />
          <span>+ Task</span>
        </button>

        <Link
          href="/goals"
          className="flex items-center gap-1.5 p-2 rounded-lg bg-white/[0.02] hover:bg-purple-500/15 border border-white/06 hover:border-purple-500/30 text-[11px] font-semibold text-foreground hover:text-purple-300 transition-all cursor-pointer"
        >
          <Target className="w-3 h-3 text-purple-400" />
          <span>+ Goal</span>
        </Link>

        <Link
          href="/meetings"
          className="flex items-center gap-1.5 p-2 rounded-lg bg-white/[0.02] hover:bg-orange-500/15 border border-white/06 hover:border-orange-500/30 text-[11px] font-semibold text-foreground hover:text-orange-300 transition-all cursor-pointer"
        >
          <Calendar className="w-3 h-3 text-orange-400" />
          <span>+ Meeting</span>
        </Link>

        <button
          onClick={() => setQuickAddOpen(true, "expense")}
          className="flex items-center gap-1.5 p-2 rounded-lg bg-white/[0.02] hover:bg-emerald-500/15 border border-white/06 hover:border-emerald-500/30 text-[11px] font-semibold text-foreground hover:text-emerald-300 transition-all cursor-pointer"
        >
          <DollarSign className="w-3 h-3 text-emerald-400" />
          <span>+ Expense</span>
        </button>

        <Link
          href="/ai"
          className="flex items-center gap-1.5 p-2 rounded-lg bg-white/[0.02] hover:bg-cyan-500/15 border border-white/06 hover:border-cyan-500/30 text-[11px] font-semibold text-foreground hover:text-cyan-300 transition-all cursor-pointer col-span-2 sm:col-span-2 lg:col-span-2"
        >
          <Bot className="w-3 h-3 text-cyan-400" />
          <span>AI Assistant</span>
        </Link>
      </div>
    </div>
  );

  const AttendanceEntryPoint = (
    <div className="glass-card-premium p-3.5 sm:p-4 rounded-2xl border border-white/[0.07] hover:border-[#FFC107]/30 transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              ATTENDANCE
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-bold text-emerald-400">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
              Live Presence
            </span>
          </div>
          <p className="text-xs text-foreground font-semibold truncate">
            Track workdays & team presence
          </p>
        </div>

        <Link
          href="/attendance"
          className="shrink-0 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-[#FFC107]/15 border border-white/10 hover:border-[#FFC107]/30 text-[11px] font-bold text-[#FFC107] transition-all flex items-center gap-1 cursor-pointer group"
        >
          <span>View History</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );

  const heroCardElement = (
    <WorkdayCard
      greeting={{
        title: greetingObj.title,
        role: userRole,
        contextualLine: contextualLine,
        onAddClick: () => setQuickAddOpen(true, "task"),
      }}
    />
  );

  return (
    <div className="px-3.5 sm:px-5 py-4 max-w-6xl mx-auto space-y-3.5">
      <motion.div
        initial="hidden"
        animate="show"
        variants={staggerContainer}
        className="space-y-3.5"
      >
        {/* ──────────────────────────────────────────────
            MOBILE LAYOUT (< 1024px)
            Order: Hero Workday (with Greeting) -> Focus -> 2x2 Stats -> Office -> Attendance Entry -> Actions
        ────────────────────────────────────────────── */}
        <div className="lg:hidden space-y-3">
          <motion.div variants={fadeUp}>
            {heroCardElement}
          </motion.div>

          <motion.div variants={fadeUp}>
            {FocusCard}
          </motion.div>

          <motion.div variants={fadeUp}>
            {QuickStatsGrid}
          </motion.div>

          <motion.div variants={fadeUp}>
            <OfficePresenceCard />
          </motion.div>

          <motion.div variants={fadeUp}>
            {AttendanceEntryPoint}
          </motion.div>

          <motion.div variants={fadeUp}>
            {QuickActionsSection}
          </motion.div>
        </div>

        {/* ──────────────────────────────────────────────
            DESKTOP LAYOUT (>= 1024px)
            2-Column balanced grid
        ────────────────────────────────────────────── */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-3.5">
          {/* LEFT / MAIN COLUMN */}
          <div className="lg:col-span-7 space-y-3">
            <motion.div variants={fadeUp}>
              {heroCardElement}
            </motion.div>

            <motion.div variants={fadeUp}>
              {FocusCard}
            </motion.div>

            <motion.div variants={fadeUp}>
              {AttendanceEntryPoint}
            </motion.div>
          </div>

          {/* RIGHT / SECONDARY COLUMN */}
          <div className="lg:col-span-5 space-y-3">
            <motion.div variants={fadeUp}>
              {QuickStatsGrid}
            </motion.div>

            <motion.div variants={fadeUp}>
              <OfficePresenceCard />
            </motion.div>

            <motion.div variants={fadeUp}>
              {QuickActionsSection}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Attendance History Modal (Fallback) */}
      <AnimatePresence>
        {historyModalOpen && (
          <AttendanceHistoryModal onClose={() => setHistoryModalOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
