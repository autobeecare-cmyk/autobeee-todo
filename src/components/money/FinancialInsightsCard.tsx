"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, PieChart, TrendingUp, Layers } from "lucide-react";
import type { Expense } from "@/lib/types";

interface FinancialInsightsCardProps {
  expenses: Expense[];
}

export function FinancialInsightsCard({ expenses }: FinancialInsightsCardProps) {
  const insights = useMemo(() => {
    if (expenses.length === 0) return [];

    const list: { id: string; icon: any; title: string; desc: string }[] = [];
    const total = expenses.reduce((s, e) => s + e.amount, 0);

    // 1. Largest category insight
    const catMap: Record<string, number> = {};
    expenses.forEach((e) => {
      catMap[e.category] = (catMap[e.category] ?? 0) + e.amount;
    });
    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    if (sortedCats.length > 0) {
      const [topCat, topCatAmt] = sortedCats[0];
      const pct = Math.round((topCatAmt / total) * 100);
      list.push({
        id: "top-cat",
        icon: PieChart,
        title: "Category Dominance",
        desc: `${topCat.charAt(0).toUpperCase() + topCat.slice(1)} accounts for ${pct}% (₹${topCatAmt.toLocaleString("en-IN")}) of total spending.`,
      });
    }

    // 2. Single largest expense insight
    const topExp = [...expenses].sort((a, b) => b.amount - a.amount)[0];
    if (topExp) {
      list.push({
        id: "top-exp",
        icon: TrendingUp,
        title: "Peak Outlay",
        desc: `Largest single expense was ₹${topExp.amount.toLocaleString("en-IN")} for "${topExp.purpose.trim()}" paid by ${topExp.person}.`,
      });
    }

    // 3. Founders split insight
    const sourabhPaid = expenses
      .filter((e) => e.person === "Sourabh")
      .reduce((s, e) => s + e.amount, 0);
    const asherPaid = expenses
      .filter((e) => e.person === "Asher")
      .reduce((s, e) => s + e.amount, 0);
    const sourabhPct = total > 0 ? ((sourabhPaid / total) * 100).toFixed(1) : "0";
    const asherPct = total > 0 ? ((asherPaid / total) * 100).toFixed(1) : "0";

    list.push({
      id: "payer-split",
      icon: Layers,
      title: "Team Outlay Split",
      desc: `Sourabh paid ${sourabhPct}% (₹${sourabhPaid.toLocaleString("en-IN")}) and Asher paid ${asherPct}% (₹${asherPaid.toLocaleString("en-IN")}) of recorded spending.`,
    });

    return list;
  }, [expenses]);

  if (insights.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="rounded-2xl bg-gradient-to-br from-[#161616] to-[#111111] border border-amber-400/20 p-4 sm:p-5 space-y-3.5 shadow-xl relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFC107]/5 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-[#FFC107]/15 text-[#FFC107]">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-bold text-xs sm:text-sm text-foreground uppercase tracking-wider">
            Financial Insights
          </h3>
          <p className="text-[10px] text-muted-foreground">Factual ledger analytics</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {insights.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]"
            >
              <div className="p-1 rounded-md bg-white/[0.05] text-[#FFC107] shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-foreground/90">{item.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
