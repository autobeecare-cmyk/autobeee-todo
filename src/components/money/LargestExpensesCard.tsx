"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Award, ChevronRight } from "lucide-react";
import type { Expense } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface LargestExpensesCardProps {
  expenses: Expense[];
  onSelectExpense: (expense: Expense) => void;
}

export function LargestExpensesCard({
  expenses,
  onSelectExpense,
}: LargestExpensesCardProps) {
  const topExpenses = useMemo(() => {
    return [...expenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [expenses]);

  if (topExpenses.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      className="rounded-2xl bg-[#121212]/90 backdrop-blur-xl border border-white/[0.08] p-4 sm:p-5 space-y-3.5 shadow-xl"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#FFC107]/10 text-[#FFC107]">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-foreground uppercase tracking-wider">
              Largest Expenses
            </h3>
            <p className="text-[10px] text-muted-foreground">Top capital outlays</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {topExpenses.map((exp, idx) => {
          let dateStr = exp.date;
          try {
            dateStr = format(parseISO(exp.date), "dd MMM yyyy");
          } catch {
            dateStr = exp.date;
          }

          const isSourabh = exp.person === "Sourabh";

          return (
            <div
              key={exp.id}
              onClick={() => onSelectExpense(exp)}
              className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                <span className="w-5 h-5 rounded-md bg-white/[0.06] text-muted-foreground font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                  #{idx + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground/95 truncate">
                    {exp.purpose}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                    <span className="capitalize">{exp.category}</span>
                    <span>·</span>
                    <span
                      className={cn(
                        "font-semibold",
                        isSourabh ? "text-[#FFC107]" : "text-[#60A5FA]"
                      )}
                    >
                      {exp.person}
                    </span>
                    <span className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline font-mono text-[9px] text-muted-foreground/70">
                      {dateStr}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs sm:text-sm font-bold text-foreground font-mono tabular-nums">
                  ₹{exp.amount.toLocaleString("en-IN")}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
