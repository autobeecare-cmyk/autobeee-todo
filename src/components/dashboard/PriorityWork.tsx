"use client";

import Link from "next/link";
import { format } from "date-fns";
import { CheckSquare, Circle, ArrowRight, ChevronRight, Plus } from "lucide-react";
import { AutoBeeBadge } from "@/components/common/AutoBeeBadge";
import type { Task } from "@/lib/types";

interface PriorityWorkProps {
  tasks: Task[];
  totalOpenTasksCount: number;
  onCompleteTask: (task: Task) => void;
  completedTaskId: string | null;
  onAddTask: () => void;
}

export function PriorityWork({
  tasks,
  totalOpenTasksCount,
  onCompleteTask,
  completedTaskId,
  onAddTask,
}: PriorityWorkProps) {
  return (
    <div className="glass-card-premium p-4 sm:p-5 rounded-2xl space-y-3.5 border border-white/[0.08] shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-[#FFC107]" />
          <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">
            PRIORITY WORK QUEUE
          </h3>
        </div>
        <Link
          href="/tasks"
          className="text-xs text-[#FFC107] font-semibold hover:underline flex items-center gap-0.5"
        >
          View all ({totalOpenTasksCount}) <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="py-7 text-center space-y-2 border border-dashed border-white/[0.07] rounded-xl bg-white/[0.01]">
          <p className="text-xs font-medium text-muted-foreground">
            All priority tasks cleared! You're ready for new objectives.
          </p>
          <button
            onClick={onAddTask}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-[#FFC107]/15 border border-white/10 hover:border-[#FFC107]/30 text-xs font-semibold text-foreground hover:text-[#FFC107] transition-all cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Create Next Task</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.slice(0, 4).map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                <button
                  onClick={() => onCompleteTask(task)}
                  disabled={completedTaskId === task.id}
                  className="shrink-0 text-muted-foreground hover:text-emerald-400 transition-colors cursor-pointer"
                  title="Mark as done"
                >
                  <Circle className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground/90 truncate">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                    <AutoBeeBadge variant="priority" priority={task.priority} size="sm" />
                    {task.deadline && (
                      <span>· Due {format(new Date(task.deadline), "d MMM")}</span>
                    )}
                    {task.assignee && (
                      <span className="text-muted-foreground/60">· {task.assignee}</span>
                    )}
                  </div>
                </div>
              </div>
              <Link
                href="/tasks"
                className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-[#FFC107] transition-opacity shrink-0"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
