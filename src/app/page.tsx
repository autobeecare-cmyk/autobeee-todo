"use client";
// src/app/page.tsx — Dashboard
import { useMemo } from "react";
import { motion } from "framer-motion";
import { format, isToday, isPast, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import {
  CheckCircle2, Circle, TrendingUp, Target, Flame,
  ArrowRight, Plus, AlertCircle, DollarSign
} from "lucide-react";
import Link from "next/link";
import { useTaskStore } from "@/store/useTaskStore";
import { useGoalStore } from "@/store/useGoalStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useUIStore } from "@/store/useUIStore";
import { updateTask } from "@/lib/firestore/tasks";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";

const FADE_UP = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-400",
  low: "bg-gray-500",
};

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent?: boolean;
}) {
  return (
    <motion.div
      variants={FADE_UP}
      className={cn(
        "rounded-2xl p-4 flex flex-col gap-2 card-hover",
        "bg-[var(--card)] border border-[var(--border)]"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", accent ? "bee-gradient" : "bg-white/5")}>
          <Icon className={cn("w-4 h-4", accent ? "text-[#111]" : "text-muted-foreground")} />
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </motion.div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const toggle = async () => {
    await updateTask(task.id, {
      status: task.status === "done" ? "todo" : "done",
    });
  };

  return (
    <motion.div
      variants={FADE_UP}
      className="flex items-start gap-3 py-2.5 border-b border-white/04 last:border-0 group"
    >
      <button onClick={toggle} className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-[#FFC107] transition-colors">
        {task.status === "done"
          ? <CheckCircle2 className="w-4 h-4 text-[#FFC107]" />
          : <Circle className="w-4 h-4" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium truncate", task.status === "done" && "line-through text-muted-foreground")}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground">{task.assignee}</span>
          {task.deadline && (
            <span className={cn("text-[10px]", isPast(new Date(task.deadline)) && task.status !== "done" ? "text-red-400" : "text-muted-foreground")}>
              {format(new Date(task.deadline), "d MMM")}
            </span>
          )}
        </div>
      </div>
      <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", PRIORITY_DOT[task.priority])} />
    </motion.div>
  );
}

export default function Dashboard() {
  const { tasks, loading: tasksLoading } = useTaskStore();
  const { goals, loading: goalsLoading } = useGoalStore();
  const { expenses, loading: expLoading } = useExpenseStore();
  const { setQuickAddOpen } = useUIStore();

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  const todayTasks = useMemo(() =>
    tasks.filter(t => t.status !== "done" && (t.priority === "urgent" || t.priority === "high"))
      .sort((a, b) => {
        const order = { urgent: 0, high: 1, medium: 2, low: 3 };
        return order[a.priority] - order[b.priority];
      })
      .slice(0, 5),
    [tasks]
  );

  const overdueCount = useMemo(() =>
    tasks.filter(t => t.deadline && isPast(new Date(t.deadline)) && t.status !== "done").length,
    [tasks]
  );

  const completedToday = useMemo(() =>
    tasks.filter(t => t.status === "done").length,
    [tasks]
  );

  const activeGoals = useMemo(() => goals.filter(g => g.status === "active").slice(0, 3), [goals]);

  const monthExpenses = useMemo(() => {
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return expenses
      .filter(e => isWithinInterval(new Date(e.date), { start, end }))
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const recentExpenses = useMemo(() => expenses.slice(0, 3), [expenses]);

  const doneTasks = tasks.filter(t => t.status === "done").length;
  const completionRate = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto space-y-6">
      {/* Greeting */}
      <motion.div initial="hidden" animate="show" variants={STAGGER}>
        <motion.div variants={FADE_UP} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {greeting} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {format(now, "EEEE, d MMMM yyyy")}
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setQuickAddOpen(true, "task")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bee-gradient text-[#111] text-sm font-semibold"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Quick Add
          </motion.button>
        </motion.div>

        {/* Overdue alert */}
        {overdueCount > 0 && (
          <motion.div
            variants={FADE_UP}
            className="mt-4 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm"
          >
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-red-300">{overdueCount} overdue task{overdueCount > 1 ? "s" : ""} need attention</span>
            <Link href="/tasks" className="ml-auto text-red-400 text-xs flex items-center gap-1 hover:text-red-300">
              View <ArrowRight className="w-3 h-3" />
            </Link>
          </motion.div>
        )}

        {/* Stats row */}
        <motion.div variants={STAGGER} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <StatCard
            label="Tasks Done"
            value={String(doneTasks)}
            sub={`${completionRate}% completion`}
            icon={CheckCircle2}
            accent
          />
          <StatCard
            label="Active Goals"
            value={String(goals.filter(g => g.status === "active").length)}
            sub="in progress"
            icon={Target}
          />
          <StatCard
            label="Spent This Month"
            value={`₹${monthExpenses.toLocaleString("en-IN")}`}
            sub="total expenses"
            icon={DollarSign}
          />
          <StatCard
            label="Streak"
            value="🔥 3 days"
            sub="keep it up!"
            icon={Flame}
          />
        </motion.div>
      </motion.div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Priority Tasks */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={STAGGER}
          className="lg:col-span-2"
        >
          <motion.div
            variants={FADE_UP}
            className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm">Today&apos;s Priorities</h2>
              <Link href="/tasks" className="text-[10px] text-muted-foreground hover:text-[#FFC107] flex items-center gap-1 transition-colors">
                All tasks <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {tasksLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
              </div>
            ) : todayTasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-10 h-10 text-[#FFC107] mx-auto mb-2 opacity-60" />
                <p className="text-sm text-muted-foreground">All caught up! No urgent tasks.</p>
                <button
                  onClick={() => setQuickAddOpen(true, "task")}
                  className="mt-3 text-xs text-[#FFC107] hover:underline"
                >
                  + Add a task
                </button>
              </div>
            ) : (
              <motion.div variants={STAGGER}>
                {todayTasks.map(task => <TaskRow key={task.id} task={task} />)}
              </motion.div>
            )}
          </motion.div>
        </motion.div>

        {/* Right column */}
        <motion.div initial="hidden" animate="show" variants={STAGGER} className="space-y-4">
          {/* Goals progress */}
          <motion.div
            variants={FADE_UP}
            className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm">Goals</h2>
              <Link href="/goals" className="text-[10px] text-muted-foreground hover:text-[#FFC107] flex items-center gap-1 transition-colors">
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
                      <p className="text-xs font-medium truncate">{goal.title}</p>
                      <span className="text-xs text-[#FFC107] font-semibold ml-2">{goal.progress}%</span>
                    </div>
                    <Progress value={goal.progress} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Recent expenses */}
          <motion.div
            variants={FADE_UP}
            className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm">Recent Expenses</h2>
              <Link href="/money" className="text-[10px] text-muted-foreground hover:text-[#FFC107] flex items-center gap-1 transition-colors">
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
              <div className="space-y-2.5">
                {recentExpenses.map(exp => (
                  <div key={exp.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium truncate max-w-[120px]">{exp.purpose}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{exp.category}</p>
                    </div>
                    <span className="text-sm font-semibold text-[#FFC107]">₹{exp.amount.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* AI insight teaser */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer card-hover"
        style={{
          background: "linear-gradient(135deg, rgba(255,193,7,0.08) 0%, rgba(255,213,79,0.04) 100%)",
          border: "1px solid rgba(255,193,7,0.15)",
        }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-white/5 border border-white/10">
          <img src="/logo.png" alt="Autobee Logo" className="w-full h-full object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#FFC107]">AI Assistant</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {tasks.filter(t => t.status !== "done").length} open tasks · Ask AI what to focus on today
          </p>
        </div>
        <Link href="/ai">
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      </motion.div>
    </div>
  );
}
