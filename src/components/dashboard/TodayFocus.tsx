"use client";

import Link from "next/link";
import { format, isToday, isPast } from "date-fns";
import { CheckCircle2, ArrowRight, Zap, Target, Calendar } from "lucide-react";
import { AutoBeeBadge } from "@/components/common/AutoBeeBadge";
import type { Task, Goal, Meeting } from "@/lib/types";

interface TodayFocusProps {
  focusTask: Task | null;
  topGoal: Goal | null;
  nextMeeting: Meeting | null;
  onCompleteTask: (task: Task) => void;
  completedTaskId: string | null;
  onAddTask: () => void;
}

export function TodayFocus({
  focusTask,
  topGoal,
  nextMeeting,
  onCompleteTask,
  completedTaskId,
  onAddTask,
}: TodayFocusProps) {
  return (
    <div className="glass-card-premium p-4 sm:p-5 space-y-3 border border-white/[0.08] shadow-md relative overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FFC107]" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            TODAY'S PRIMARY FOCUS
          </span>
        </div>

        {focusTask && (
          <AutoBeeBadge variant="priority" priority={focusTask.priority} size="sm" />
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
                : "High-priority execution"}
              {" · "}
              <span className="capitalize">{focusTask.priority} priority</span>
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={() => onCompleteTask(focusTask)}
              disabled={completedTaskId === focusTask.id}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/30 text-[11px] font-semibold text-muted-foreground hover:text-emerald-400 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
            <Link
              href="/tasks"
              className="px-3 py-1.5 rounded-lg bee-gradient text-[#111] font-bold text-[11px] flex items-center gap-1 hover:scale-[1.02] transition-transform cursor-pointer shadow-sm"
            >
              <span>View</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      ) : topGoal ? (
        /* Intelligent Strategic Momentum State (Not empty!) */
        <div className="flex items-center justify-between gap-3 py-0.5">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                Strategic Goal
              </span>
              <span className="text-[11px] text-muted-foreground">Queue clear · Drive milestone:</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-foreground leading-snug truncate">
              {topGoal.title}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={onAddTask}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[11px] font-semibold text-foreground/80 hover:text-foreground transition-all cursor-pointer"
            >
              + Create Task
            </button>
            <Link
              href="/goals"
              className="px-3 py-1.5 rounded-lg bee-gradient text-[#111] font-bold text-[11px] flex items-center gap-1 hover:scale-[1.02] transition-transform cursor-pointer shadow-sm"
            >
              <span>Goal</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between py-1">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-foreground">All systems clear.</p>
            <p className="text-[10px] text-muted-foreground">Great time for strategic planning or partner follow-ups.</p>
          </div>
          <button
            onClick={onAddTask}
            className="px-3 py-1 rounded-lg bee-gradient text-[#111] font-bold text-xs"
          >
            + Task
          </button>
        </div>
      )}
    </div>
  );
}
