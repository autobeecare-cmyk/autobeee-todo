"use client";

import Link from "next/link";
import { CheckSquare, Target, Calendar, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TodayAtGlanceProps {
  tasksCount: number;
  tasksDueTodayCount: number;
  tasksCompletedTodayCount: number;
  tasksLoading: boolean;
  activeGoalsCount: number;
  avgGoalProgress: number;
  goalsLoading: boolean;
  meetingsTodayCount: number;
  upcomingMeetingsCount: number;
  meetingsLoading: boolean;
  monthSpending: number;
  expensesLoading: boolean;
}

export function TodayAtGlance({
  tasksCount,
  tasksDueTodayCount,
  tasksCompletedTodayCount,
  tasksLoading,
  activeGoalsCount,
  avgGoalProgress,
  goalsLoading,
  meetingsTodayCount,
  upcomingMeetingsCount,
  meetingsLoading,
  monthSpending,
  expensesLoading,
}: TodayAtGlanceProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. TASKS */}
      <Link href="/tasks" className="block group">
        <div className="glass-card-premium p-4 sm:p-5 rounded-2xl border border-white/[0.08] hover:border-[#FFC107]/40 hover:-translate-y-0.5 transition-all space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              MY QUEUE
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FFC107]/10 flex items-center justify-center text-[#FFC107] group-hover:scale-105 transition-transform">
              <CheckSquare className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground tabular-nums tracking-tight">
            {tasksLoading ? <Skeleton className="h-7 w-12 rounded-md" /> : tasksCount}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            {tasksDueTodayCount > 0
              ? `${tasksDueTodayCount} due today`
              : tasksCompletedTodayCount > 0
              ? `${tasksCompletedTodayCount} done today`
              : "Queue clear"}
          </p>
        </div>
      </Link>

      {/* 2. GOALS */}
      <Link href="/goals" className="block group">
        <div className="glass-card-premium p-4 sm:p-5 rounded-2xl border border-white/[0.08] hover:border-purple-500/40 hover:-translate-y-0.5 transition-all space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              ACTIVE GOALS
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
              <Target className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground tabular-nums tracking-tight">
            {goalsLoading ? <Skeleton className="h-7 w-12 rounded-md" /> : activeGoalsCount}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            {avgGoalProgress}% avg momentum
          </p>
        </div>
      </Link>

      {/* 3. MEETINGS */}
      <Link href="/meetings" className="block group">
        <div className="glass-card-premium p-4 sm:p-5 rounded-2xl border border-white/[0.08] hover:border-orange-500/40 hover:-translate-y-0.5 transition-all space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              MEETINGS
            </span>
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 group-hover:scale-105 transition-transform">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground tabular-nums tracking-tight">
            {meetingsLoading ? (
              <Skeleton className="h-7 w-12 rounded-md" />
            ) : meetingsTodayCount > 0 ? (
              meetingsTodayCount
            ) : (
              upcomingMeetingsCount
            )}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            {meetingsTodayCount > 0 ? "Scheduled today" : `${upcomingMeetingsCount} upcoming`}
          </p>
        </div>
      </Link>

      {/* 4. SPENDING */}
      <Link href="/money" className="block group">
        <div className="glass-card-premium p-4 sm:p-5 rounded-2xl border border-white/[0.08] hover:border-emerald-500/40 hover:-translate-y-0.5 transition-all space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              THIS MONTH
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground tabular-nums tracking-tight">
            {expensesLoading ? (
              <Skeleton className="h-7 w-20 rounded-md" />
            ) : (
              `₹${monthSpending.toLocaleString("en-IN")}`
            )}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">Company spending</p>
        </div>
      </Link>
    </div>
  );
}
