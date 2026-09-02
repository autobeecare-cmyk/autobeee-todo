"use client";
// src/app/insights/page.tsx — Startup Intelligence Dashboard
import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from "recharts";
import {
  CheckCircle2, AlertCircle, Users, Target,
  Clock, Award, Activity as ActivityIcon, Check
} from "lucide-react";
import { format, isPast, parseISO, startOfWeek, endOfWeek, subWeeks, isWithinInterval, startOfMonth, endOfMonth, isToday } from "date-fns";
import { useTaskStore } from "@/store/useTaskStore";
import { useGoalStore } from "@/store/useGoalStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { subscribeActivity } from "@/lib/supabase/activity";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Task, Activity } from "@/lib/types";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { SectionHeader } from "@/components/common/SectionHeader";
import { AutoBeeBadge } from "@/components/common/AutoBeeBadge";

const PERSON_COLOR: Record<string, string> = {
  Sourabh: "#FFC107", Asher: "#6366f1", Subin: "#22c55e",
};

const PRIORITY_BADGE_STYLE: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-400 border border-red-500/20",
  high: "bg-amber-500/10 text-[#FFC107] border border-amber-500/20",
  medium: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  low: "bg-gray-500/10 text-gray-400 border border-gray-500/20",
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name?: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl px-3 py-2 text-xs bg-[#161616] border border-white/08 glass shadow-lg">
        {label && <p className="text-muted-foreground mb-1 font-semibold">{label}</p>}
        {payload.map((p, i) => (
          <p key={i} className="font-semibold text-foreground/90">
            {p.name ? `${p.name}: ` : ""}
            {typeof p.value === "number" && p.value > 100 ? `₹${p.value.toLocaleString("en-IN")}` : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl px-3 py-2 text-xs bg-[#161616] border border-white/08 glass shadow-lg">
        <p className="text-muted-foreground font-semibold mb-1">{payload[0].payload.week}</p>
        <p className="font-semibold text-foreground">Done: {payload[0].value}</p>
        <p className="font-semibold text-muted-foreground">Total: {payload[1].value}</p>
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

  const [activities, setActivities] = useState<Activity[]>([]);
  const now = new Date();

  // Load activity feed
  useEffect(() => {
    const unsub = subscribeActivity((items) => {
      setActivities(items.slice(0, 10));
    }, 10);

    const fetchInitial = async () => {
      try {
        const { data, error } = await supabase
          .from("activity")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);
        if (data) {
          setActivities(data.map((dbAct: any) => ({
            id: dbAct.id,
            type: dbAct.metadata?.type || "created",
            entityId: dbAct.entity_id,
            entityType: dbAct.entity_type as any,
            description: dbAct.action,
            timestamp: dbAct.created_at,
          })));
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchInitial();
    return () => {
      unsub();
    };
  }, []);

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
    const entries = Object.entries(map).map(([name, count]) => ({ name, count }));
    const totalCount = entries.reduce((s, e) => s + e.count, 0);
    return {
      entries,
      totalCount,
    };
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
    tasks.filter(t => t.deadline && isPast(parseISO(t.deadline)) && !isToday(parseISO(t.deadline)) && t.status !== "done")
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

  const isTomorrow = (d: Date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return d.getDate() === tomorrow.getDate() && d.getMonth() === tomorrow.getMonth() && d.getFullYear() === tomorrow.getFullYear();
  };

  const groupedUpcoming = useMemo(() => {
    const map: Record<string, typeof upcomingDeadlines> = {};
    upcomingDeadlines.forEach(t => {
      if (!t.deadline) return;
      const d = parseISO(t.deadline);
      let key = format(d, "EEE d MMM");
      if (isToday(d)) key = "Today";
      else if (isTomorrow(d)) key = "Tomorrow";
      
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return Object.entries(map);
  }, [upcomingDeadlines]);

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

  const daysOverdue = (deadlineStr: string) => {
    const diffTime = now.getTime() - new Date(deadlineStr).getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const formatRelativeTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 max-w-[1560px] w-full mx-auto space-y-5">
        <Skeleton className="h-8 w-40 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
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
      initial="hidden" animate="show" variants={staggerContainer}
      className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 max-w-[1560px] w-full mx-auto space-y-5"
    >
      <PageHeader
        title="Insights"
        subtitle={`Startup intelligence · ${format(now, "MMMM yyyy")}`}
      />

      {/* Top stats */}
      <motion.div variants={staggerContainer} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Completion Rate"
          value={`${completionRate}%`}
          subtitle={`${doneTasks}/${totalTasks} tasks done`}
          highlight={false}
          icon={<CheckCircle2 className="w-3.5 h-3.5 text-[#FFC107]" />}
        />

        <StatCard
          label="Active Goals"
          value={goalStats.active}
          subtitle={`${goalStats.avgProgress}% avg progress`}
          highlight={false}
          icon={<Target className="w-3.5 h-3.5 text-muted-foreground" />}
        />

        <StatCard
          label="Month Spend"
          value={`₹${monthTotal.toLocaleString("en-IN")}`}
          subtitle="Corporate spend"
          highlight={false}
          icon={<ActivityIcon className="w-3.5 h-3.5 text-muted-foreground" />}
        />

        <StatCard
          label="Overdue Tasks"
          value={overdueTasks.length}
          subtitle={overdueTasks.length > 0 ? "Requires attention" : "All on schedule"}
          highlight={overdueTasks.length > 0}
          className={overdueTasks.length > 0 ? "border-red-500/40" : ""}
          icon={<AlertCircle className={cn("w-3.5 h-3.5", overdueTasks.length > 0 ? "text-red-400" : "text-muted-foreground")} />}
        />
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weekly task completion */}
        <motion.div variants={fadeUp} className="rounded-2xl p-5 glass">
          <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest block mb-4">Weekly Task Activity</span>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weeklyCompletion} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFC107" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#FFC107" stopOpacity={0.15} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#888" }} />
              <YAxis tick={{ fontSize: 10, fill: "#888" }} />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar dataKey="done" name="Done" fill="url(#barGrad)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="total" name="Total" fill="rgba(255,255,255,0.05)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Expense trend AreaChart */}
        <motion.div variants={fadeUp} className="rounded-2xl p-5 glass">
          <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest block mb-4">Expense Trend</span>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={expenseTrend} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFC107" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#FFC107" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#888" }} />
              <YAxis tick={{ fontSize: 10, fill: "#888" }} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="total"
                name="Spend"
                stroke="#FFC107"
                fill="url(#expGrad)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#FFC107", stroke: "#fff", strokeWidth: 1 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Member workload + goal progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Workload balance */}
        <motion.div variants={fadeUp} className="rounded-2xl p-5 glass relative flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest">Workload Balance</span>
          </div>
          {workloadData.totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground text-xs h-[120px]">
              No active tasks assigned
            </div>
          ) : (
            <div className="relative">
              <div className="h-[120px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={workloadData.entries}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="count"
                    >
                      {workloadData.entries.map((entry, i) => {
                        const activeCount = workloadData.entries.filter(e => e.count > 0);
                        const fillCol = (activeCount.length === 1 && activeCount[0].name === entry.name) 
                          ? "#FFC107" 
                          : PERSON_COLOR[entry.name] || "#6b7280";
                        return <Cell key={i} fill={fillCol} />;
                      })}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                  <span className="text-base font-bold tabular-nums">{workloadData.totalCount}</span>
                  <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider">Open Tasks</span>
                </div>
              </div>

              <div className="space-y-2 mt-3 pt-3 border-t border-white/05">
                {memberStats.map(({ person, open, rate }) => (
                  <div key={person} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-[#111]" style={{ background: PERSON_COLOR[person] }}>
                        {person === "Subin" ? "Su" : person.charAt(0)}
                      </div>
                      <span className="text-muted-foreground">{person}</span>
                    </div>
                    <span className="font-semibold text-foreground/80">{open} open · <span style={{ color: PERSON_COLOR[person] }}>{rate}% rate</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Overdue tasks */}
        <motion.div variants={fadeUp} className="rounded-2xl p-5 glass flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest">Overdue Tasks</span>
          </div>
          {overdueTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-xs flex-1">
              <Check className="w-8 h-8 text-green-400 mb-2 opacity-80" />
              Nothing overdue — great work!
            </div>
          ) : (
            <div className="space-y-2.5 flex-1 max-h-48 overflow-y-auto no-scrollbar">
              {overdueTasks.map(t => {
                const days = daysOverdue(t.deadline!);
                return (
                  <div key={t.id} className="flex items-center justify-between p-2 bg-white/[0.01] border-l-[3px] border-[#EF4444] rounded-r-xl border border-white/05 border-l-0">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold truncate text-foreground/90">{t.title}</p>
                      <p className="text-[9px] text-red-400 font-medium mt-0.5">{days} day{days !== 1 ? "s" : ""} overdue</p>
                    </div>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-[#111]" style={{ background: PERSON_COLOR[t.assignee] }}>
                      {t.assignee === "Subin" ? "Su" : t.assignee.charAt(0)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Upcoming deadlines */}
        <motion.div variants={fadeUp} className="rounded-2xl p-5 glass flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-[#FFC107]" />
            <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest">Upcoming (7 days)</span>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-xs flex-1">
              <span className="text-2xl mb-1">🎯</span>
              Clear week ahead
            </div>
          ) : (
            <div className="space-y-3 flex-1 max-h-48 overflow-y-auto no-scrollbar">
              {groupedUpcoming.map(([dayLabel, items]) => (
                <div key={dayLabel} className="space-y-1">
                  <span className="text-[9px] text-muted-foreground/60 uppercase font-semibold tracking-wider block">{dayLabel}</span>
                  <div className="space-y-1">
                    {items.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-1.5 bg-white/[0.01] border border-white/05 rounded-lg text-[11px]">
                        <span className="truncate text-foreground/80 font-medium pr-2">{t.title}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={cn("text-[8px] px-1 rounded uppercase font-bold", PRIORITY_BADGE_STYLE[t.priority])}>
                            {t.priority}
                          </span>
                          <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-[#111]" style={{ background: PERSON_COLOR[t.assignee] }}>
                            {t.assignee === "Subin" ? "Su" : t.assignee.charAt(0)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Activity Feed (Task 5f) */}
      <motion.div variants={fadeUp} className="rounded-2xl p-5 glass">
        <div className="flex items-center gap-2 mb-4">
          <ActivityIcon className="w-4 h-4 text-[#FFC107]" />
          <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest">Recent Activity</span>
        </div>
        
        {activities.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No recent activity logged.</p>
        ) : (
          <motion.div 
            variants={staggerContainer} 
            className="space-y-3 max-h-80 overflow-y-auto pr-1 no-scrollbar"
          >
            {activities.map(act => {
              // Attempt to parse who initiated from description
              const matchWho = act.description.split(" ")[0];
              const nameKey = ["Sourabh", "Asher", "Subin"].includes(matchWho) ? matchWho : "Sourabh";
              const avatarColor = PERSON_COLOR[nameKey] || "#FFC107";
              return (
                <motion.div 
                  key={act.id} 
                  variants={fadeUp}
                  className="flex items-center justify-between py-2 border-b border-white/05 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-[#111]"
                      style={{ background: avatarColor }}
                    >
                      {nameKey === "Subin" ? "Su" : nameKey.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground/90">{act.description}</p>
                      <p className="text-[9px] text-muted-foreground capitalize mt-0.2">{act.entityType} · {formatRelativeTime(act.timestamp)}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-semibold">{formatRelativeTime(act.timestamp)}</span>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
