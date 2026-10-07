"use client";

import Link from "next/link";
import { Plus, Target, Calendar, DollarSign, Bot } from "lucide-react";

interface QuickActionsBarProps {
  onAddTask: () => void;
  onAddExpense: () => void;
}

export function QuickActionsBar({ onAddTask, onAddExpense }: QuickActionsBarProps) {
  return (
    <div className="glass-card-premium p-4 rounded-2xl border border-white/[0.08] shadow-md flex items-center justify-between gap-3 flex-wrap">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">
        EXECUTIVE LAUNCHER:
      </span>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onAddTask}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-[#FFC107]/15 border border-white/08 hover:border-[#FFC107]/40 text-xs font-semibold text-foreground hover:text-[#FFC107] transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-[#FFC107]" />
          <span>+ Task</span>
        </button>

        <Link
          href="/goals"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-purple-500/15 border border-white/08 hover:border-purple-500/40 text-xs font-semibold text-foreground hover:text-purple-300 transition-all cursor-pointer"
        >
          <Target className="w-3.5 h-3.5 text-purple-400" />
          <span>+ Goal</span>
        </Link>

        <Link
          href="/meetings"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-orange-500/15 border border-white/08 hover:border-orange-500/40 text-xs font-semibold text-foreground hover:text-orange-300 transition-all cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5 text-orange-400" />
          <span>+ Meeting</span>
        </Link>

        <button
          onClick={onAddExpense}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-emerald-500/15 border border-white/08 hover:border-emerald-500/40 text-xs font-semibold text-foreground hover:text-emerald-300 transition-all cursor-pointer"
        >
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          <span>+ Expense</span>
        </button>

        <Link
          href="/ai"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bee-gradient text-[#111] text-xs font-bold shadow-sm hover:scale-[1.02] transition-transform cursor-pointer"
        >
          <Bot className="w-3.5 h-3.5" />
          <span>AI Intelligence</span>
        </Link>
      </div>
    </div>
  );
}
