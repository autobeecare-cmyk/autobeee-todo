"use client";

// src/app/page.tsx — AutoBee OS Dashboard 2.0 Command Center
import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  isToday,
  isPast,
  parseISO,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from "date-fns";
import { useTaskStore } from "@/store/useTaskStore";
import { useGoalStore } from "@/store/useGoalStore";
import { useMeetingStore } from "@/store/useMeetingStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { usePartnerStore } from "@/store/usePartnerStore";
import { useUIStore } from "@/store/useUIStore";
import { logActivity, subscribeActivity } from "@/lib/supabase/activity";
import type { Task, FounderName, Activity } from "@/lib/types";
import { fadeUp, staggerContainer } from "@/lib/animations";

// Dashboard 2.0 Subcomponents
import { AiBriefingCard } from "@/components/dashboard/AiBriefingCard";
import { TodayAtGlance } from "@/components/dashboard/TodayAtGlance";
import { TodayFocus } from "@/components/dashboard/TodayFocus";
import { PriorityWork } from "@/components/dashboard/PriorityWork";
import { UpcomingMeetingsCard } from "@/components/dashboard/UpcomingMeetingsCard";
import { PartnerPipelinePulse } from "@/components/dashboard/PartnerPipelinePulse";
import { GoalsProgressCard } from "@/components/dashboard/GoalsProgressCard";
import { CompanyPulseCard } from "@/components/dashboard/CompanyPulseCard";
import { QuickActionsBar } from "@/components/dashboard/QuickActionsBar";

export default function Dashboard() {
  const currentUser = useUIStore((s) => s.currentUser) as FounderName;
  const { setQuickAddOpen } = useUIStore();

  const { tasks, loading: tasksLoading, deleteTask: storeDeleteTask } = useTaskStore();
  const { goals, loading: goalsLoading } = useGoalStore();
  const { meetings, loading: meetingsLoading } = useMeetingStore();
  const { expenses, loading: expensesLoading } = useExpenseStore();
  const { partners, loading: partnersLoading } = usePartnerStore();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [completedTaskId, setCompletedTaskId] = useState<string | null>(null);

  // Subscribe to live company activity
  useEffect(() => {
    const unsub = subscribeActivity((items) => {
      setActivities(items);
    }, 10);
    return () => { void unsub(); };
  }, []);

  // 1. Personalized Task Queue
  const myOpenTasks = useMemo(() => {
    return tasks.filter(
      (t) => t.status !== "done" && (t.assignee === currentUser || t.assignee === "All")
    );
  }, [tasks, currentUser]);

  const myDueTodayTasks = useMemo(() => {
    return myOpenTasks.filter(
      (t) => t.deadline && isToday(new Date(t.deadline))
    );
  }, [myOpenTasks]);

  const myCompletedTasksToday = useMemo(() => {
    return tasks.filter(
      (t) =>
        t.status === "done" &&
        (t.assignee === currentUser || t.assignee === "All") &&
        t.updatedAt &&
        isToday(new Date(t.updatedAt))
    );
  }, [tasks, currentUser]);

  // 2. Primary Focus Selection
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

    return myOpenTasks[0];
  }, [myOpenTasks]);

  // Top Active Goal (for strategic fallback)
  const topActiveGoal = useMemo(() => {
    return goals.find((g) => g.status === "active") || null;
  }, [goals]);

  // 3. Metric Calculations
  const activeGoals = useMemo(() => goals.filter((g) => g.status === "active"), [goals]);
  const avgGoalProgress = useMemo(() => {
    return activeGoals.length > 0
      ? Math.round(activeGoals.reduce((s, g) => s + g.progress, 0) / activeGoals.length)
      : 0;
  }, [activeGoals]);

  const meetingsTodayCount = useMemo(() => {
    return meetings.filter((m) => {
      try {
        const d = parseISO(m.scheduledAt.split("T")[0]);
        return isToday(d) && m.status !== "cancelled";
      } catch {
        return false;
      }
    }).length;
  }, [meetings]);

  const upcomingMeetingsCount = useMemo(() => {
    return meetings.filter((m) => m.status === "upcoming").length;
  }, [meetings]);

  const nextMeeting = useMemo(() => {
    return meetings.find((m) => m.status === "upcoming") || null;
  }, [meetings]);

  // Month spending
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

  // Task complete handler
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

  return (
    <div className="px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-[1560px] w-full mx-auto space-y-4 sm:space-y-5">
      <motion.div
        initial="hidden"
        animate="show"
        variants={staggerContainer}
        className="space-y-4 sm:space-y-5"
      >
        {/* 1. TOP: AUTO BEE INTELLIGENCE / DAILY BRIEFING */}
        <motion.div variants={fadeUp}>
          <AiBriefingCard
            currentUser={currentUser}
            tasks={myOpenTasks}
            goals={activeGoals}
            meetings={meetings}
            expenses={expenses}
            partners={partners}
            onAddTask={() => setQuickAddOpen(true, "task")}
          />
        </motion.div>

        {/* 2. TODAY AT A GLANCE RIBBON */}
        <motion.div variants={fadeUp}>
          <TodayAtGlance
            tasksCount={myOpenTasks.length}
            tasksDueTodayCount={myDueTodayTasks.length}
            tasksCompletedTodayCount={myCompletedTasksToday.length}
            tasksLoading={tasksLoading}
            activeGoalsCount={activeGoals.length}
            avgGoalProgress={avgGoalProgress}
            goalsLoading={goalsLoading}
            meetingsTodayCount={meetingsTodayCount}
            upcomingMeetingsCount={upcomingMeetingsCount}
            meetingsLoading={meetingsLoading}
            monthSpending={monthSpending}
            expensesLoading={expensesLoading}
          />
        </motion.div>

        {/* 3. MAIN 12-COLUMN EXECUTIVE COMMAND GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
          {/* LEFT COLUMN: CORE EXECUTION (7 cols) */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5">
            {/* Primary Focus */}
            <motion.div variants={fadeUp}>
              <TodayFocus
                focusTask={focusTask}
                topGoal={topActiveGoal}
                nextMeeting={nextMeeting}
                onCompleteTask={handleCompleteTask}
                completedTaskId={completedTaskId}
                onAddTask={() => setQuickAddOpen(true, "task")}
              />
            </motion.div>

            {/* Priority Tasks */}
            <motion.div variants={fadeUp}>
              <PriorityWork
                tasks={myOpenTasks}
                totalOpenTasksCount={myOpenTasks.length}
                onCompleteTask={handleCompleteTask}
                completedTaskId={completedTaskId}
                onAddTask={() => setQuickAddOpen(true, "task")}
              />
            </motion.div>

            {/* Strategic Goals Progress */}
            <motion.div variants={fadeUp}>
              <GoalsProgressCard goals={goals} />
            </motion.div>
          </div>

          {/* RIGHT COLUMN: INTELLIGENCE & PULSE (5 cols) */}
          <div className="lg:col-span-5 space-y-4 sm:space-y-5">
            {/* Upcoming Commitments / Meetings */}
            <motion.div variants={fadeUp}>
              <UpcomingMeetingsCard meetings={meetings} />
            </motion.div>

            {/* Partner CRM Pipeline Pulse */}
            <motion.div variants={fadeUp}>
              <PartnerPipelinePulse partners={partners} />
            </motion.div>

            {/* Company Pulse / Live Activity Stream */}
            <motion.div variants={fadeUp}>
              <CompanyPulseCard activities={activities} />
            </motion.div>
          </div>
        </div>

        {/* 4. EXECUTIVE QUICK ACTIONS LAUNCHER */}
        <motion.div variants={fadeUp}>
          <QuickActionsBar
            onAddTask={() => setQuickAddOpen(true, "task")}
            onAddExpense={() => setQuickAddOpen(true, "expense")}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
