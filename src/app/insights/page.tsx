"use client";
// src/app/insights/page.tsx — Startup Intelligence Dashboard
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import {
  CheckCircle2, AlertCircle, TrendingUp, Users, Target,
  Clock, Award, Activity
} from "lucide-react";
import { format, isPast, parseISO, startOfWeek, endOfWeek, subWeeks, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { useTaskStore } from "@/store/useTaskStore";
import { useGoalStore } from "@/store/useGoalStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const FADE_UP = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};
const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

const PERSON_COLOR: Record<string, string> = {
  Sourabh: "#FFC107", Asher: "#6366f1", Subin: "#22c55e",
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name?: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl px-3 py-2 text-xs" style={{ background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.1)" }}>
        {label && <p className="text-muted-foreground mb-1">{label}</p>}
        {payload.map((p, i) => (
          <p key={i} className="font-semibold">{p.name ? `${p.name}: ` : ""}{typeof p.value === "number" && p.value > 100 ? `₹${p.value.toLocaleString("en-IN")}` : p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function InsightsPage() {
  const { tasks, loading: tasksLoading } = useTaskStore();
  const { goals, loading: goalsLoading } = useGoalStore();
  const { expenses, loading: expLoading } = useExpenseStore();
  const loading = tasksLoading || goalsLoading || expLoading;
  const now = new Date();

  // Weekly task completion (last 6 weeks)
  const weeklyCompletion = useMemo(() => {
    return [5, 4, 3, 2, 1, 0].map(weeksAgo => {
      const start = startOfWeek(subWeeks(now, weeksAgo), { weekStartsOn: 1 });
      const end = endOfWeek(subWeeks(now, weeksAgo), { weekStartsOn: 1 });
      const weekTasks = tasks.filter(t => {
        const updated = t.updatedAt ? parseISO(t.updatedAt) : null;
        return updated && isWithinInterval(updated, { start, end });
      });
      const done = weekTasks.filter(t => t.status === "done").length;
      return {
        week: format(start, "d MMM"),
        done,
        total: weekTasks.length,
      };
    });
  }, [tasks]);

  // Workload balance
  const workloadData = useMemo(() => {
    const map: Record<string, number> = { Sourabh: 0, Asher: 0, Subin: 0 };
    tasks.filter(t => t.status !== "done").forEach(t => { map[t.assignee] = (map[t.assignee] ?? 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [tasks]);

  // Member stats
  const memberStats = useMemo(() => {
    const people = ["Sourabh", "Asher", "Subin"];
    return people.map(person => {
      const myTasks = tasks.filter(t => t.assignee === person);
      const done = myTasks.filter(t => t.status === "done").length;
      const open = myTasks.filter(t => t.status !== "done").length;
      const rate = myTasks.length > 0 ? Math.round((done / myTasks.length) * 100) : 0;
      return { person, done, open, rate, total: myTasks.length };
    });
  }, [tasks]);

  // Overdue tasks
  const overdueTasks = useMemo(() =>
    tasks.filter(t => t.deadline && isPast(parseISO(t.deadline)) && t.status !== "done")
      .slice(0, 5),
    [tasks]
  );

  // Upcoming deadlines (next 7 days)
  const upcomingDeadlines = useMemo(() => {
    const in7 = new Date(now); in7.setDate(in7.getDate() + 7);
    return tasks
      .filter(t => t.deadline && !isPast(parseISO(t.deadline)) && t.status !== "done")
      .filter(t => parseISO(t.deadline!) <= in7)
      .sort((a, b) => parseISO(a.deadline!).getTime() - parseISO(b.deadline!).getTime())
      .slice(0, 5);
  }, [tasks]);

  // Monthly expense trend
  const expenseTrend = useMemo(() => {
    return [3, 2, 1, 0].map(monthsAgo => {
      const d = new Date(now); d.setMonth(d.getMonth() - monthsAgo);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const total = expenses
        .filter(e => isWithinInterval(parseISO(e.date), { start, end }))
        .reduce((s, e) => s + e.amount, 0);
      return { month: format(d, "MMM"), total };
    });
  }, [expenses]);

  // Goal progress summary
  const goalStats = useMemo(() => {
    const active = goals.filter(g => g.status === "active");
    const avgProgress = active.length > 0
      ? Math.round(active.reduce((s, g) => s + g.progress, 0) / active.length) : 0;
    return { active: active.length, completed: goals.filter(g => g.status === "completed").length, avgProgress };
  }, [goals]);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === "done").length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const monthTotal = expenses
    .filter(e => isWithinInterval(parseISO(e.date), { start: startOfMonth(now), end: endOfMonth(now) }))
    .reduce((s, e) => s + e.amount, 0);

  if (loading) {
    return (
      <div className="px-4 py-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden" animate="show" variants={STAGGER}
      className="px-4 py-6 max-w-5xl mx-auto space-y-6"
    >
      <motion.div variants={FADE_UP}>
        <h1 className="text-xl font-bold">Insights</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Startup intelligence · {format(now, "MMMM yyyy")}</p>
      </motion.div>

      {/* Top stats */}
      <motion.div variants={STAGGER} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Completion Rate", value: `${completionRate}%`, sub: `${doneTasks}/${totalTasks} tasks`, icon: CheckCircle2, accent: true },
          { label: "Active Goals", value: `${goalStats.active}`, sub: `${goalStats.avgProgress}% avg progress`, icon: Target },
          { label: "Month Spend", value: `₹${monthTotal.toLocaleString("en-IN")}`, sub: "this month", icon: Activity },
          { label: "Overdue", value: `${overdueTasks.length}`, sub: "tasks overdue", icon: AlertCircle, danger: overdueTasks.length > 0 },
        ].map(({ label, value, sub, icon: Icon, accent, danger }) => (
          <motion.div
            key={label}
            variants={FADE_UP}
            className={cn(
              "rounded-2xl p-4 border",
              danger && overdueTasks.length > 0
                ? "bg-red-500/08 border-red-500/20"
                : "bg-[var(--card)] border-[var(--border)]"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{label}</span>
              <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center", accent ? "bee-gradient" : "bg-white/5")}>
                <Icon className={cn("w-3.5 h-3.5", accent ? "text-[#111]" : danger && overdueTasks.length > 0 ? "text-red-400" : "text-muted-foreground")} />
              </div>
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly task completion */}
        <motion.div variants={FADE_UP} className="rounded-2xl p-5 bg-[var(--card)] border border-[var(--border)]">
          <h3 className="text-sm font-semibold mb-4">Weekly Task Activity</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weeklyCompletion} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#888" }} />
              <YAxis tick={{ fontSize: 10, fill: "#888" }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="done" name="Done" fill="#FFC107" radius={[4, 4, 0, 0]} />
              <Bar dataKey="total" name="Total" fill="rgba(255,193,7,0.2)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Expense trend */}
        <motion.div variants={FADE_UP} className="rounded-2xl p-5 bg-[var(--card)] border border-[var(--border)]">
          <h3 className="text-sm font-semibold mb-4">Expense Trend</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={expenseTrend} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#888" }} />
              <YAxis tick={{ fontSize: 10, fill: "#888" }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="total" name="Spend" stroke="#6366f1" fill="url(#expGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Member workload + goal progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Workload balance */}
        <motion.div variants={FADE_UP} className="rounded-2xl p-5 bg-[var(--card)] border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Workload Balance</h3>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={workloadData} cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={2} dataKey="count">
                {workloadData.map((entry, i) => (
                  <Cell key={i} fill={PERSON_COLOR[entry.name] ?? "#6b7280"} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-3">
            {memberStats.map(({ person, open, done, rate }) => (
              <div key={person} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: PERSON_COLOR[person] }} />
                  <span className="text-muted-foreground">{person}</span>
                </div>
                <span className="font-medium">{open} open · <span style={{ color: PERSON_COLOR[person] }}>{rate}%</span></span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Overdue tasks */}
        <motion.div variants={FADE_UP} className="rounded-2xl p-5 bg-[var(--card)] border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-semibold">Overdue Tasks</h3>
          </div>
          {overdueTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 text-muted-foreground text-xs">
              <CheckCircle2 className="w-8 h-8 text-green-400 mb-2 opacity-60" />
              No overdue tasks!
            </div>
          ) : (
            <div className="space-y-2.5">
              {overdueTasks.map(t => (
                <div key={t.id} className="flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium line-clamp-1">{t.title}</p>
                    <p className="text-[10px] text-red-400">{t.deadline && format(parseISO(t.deadline), "d MMM")} · {t.assignee}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Upcoming deadlines */}
        <motion.div variants={FADE_UP} className="rounded-2xl p-5 bg-[var(--card)] border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-[#FFC107]" />
            <h3 className="text-sm font-semibold">Upcoming (7 days)</h3>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-xs text-muted-foreground mt-4 text-center">No upcoming deadlines</p>
          ) : (
            <div className="space-y-2.5">
              {upcomingDeadlines.map(t => (
                <div key={t.id} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FFC107] mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium line-clamp-1">{t.title}</p>
                    <p className="text-[10px] text-muted-foreground">{t.deadline && format(parseISO(t.deadline), "d MMM")} · {t.assignee}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Goals summary */}
      {goals.length > 0 && (
        <motion.div variants={FADE_UP} className="rounded-2xl p-5 bg-[var(--card)] border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-5">
            <Award className="w-4 h-4 text-[#FFC107]" />
            <h3 className="text-sm font-semibold">Goal Progress</h3>
            <span className="ml-auto text-xs text-muted-foreground">{goalStats.avgProgress}% avg</span>
          </div>
          <div className="space-y-4">
            {goals.filter(g => g.status === "active").slice(0, 5).map(goal => (
              <div key={goal.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium">{goal.title}</p>
                  <span className="text-xs font-bold text-[#FFC107]">{goal.progress}%</span>
                </div>
                <div className="w-full bg-white/05 rounded-full h-1.5">
                  <div
                    className="h-full rounded-full bee-gradient transition-all duration-700"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
