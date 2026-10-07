"use client";

import Link from "next/link";
import { Target, ChevronRight } from "lucide-react";
import type { Goal } from "@/lib/types";

interface GoalsProgressCardProps {
  goals: Goal[];
}

export function GoalsProgressCard({ goals }: GoalsProgressCardProps) {
  const activeGoals = goals
    .filter((g) => g.status === "active")
    .slice(0, 4);

  return (
    <div className="glass-card-premium p-4 sm:p-5 rounded-2xl space-y-3.5 border border-white/[0.08] shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-purple-400" />
          <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">
            STRATEGIC GOALS
          </h3>
        </div>
        <Link
          href="/goals"
          className="text-xs text-purple-400 font-semibold hover:underline flex items-center gap-0.5"
        >
          View all ({goals.length}) <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-3">
        {activeGoals.map((goal) => (
          <div key={goal.id} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-foreground/90 truncate">
                {goal.title}
              </span>
              <span className="font-mono text-[11px] text-purple-300 shrink-0">
                {goal.progress}%
              </span>
            </div>

            <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-[#FFC107] rounded-full transition-all duration-500"
                style={{ width: `${Math.max(5, goal.progress)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
