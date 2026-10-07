"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { PieChart, Users } from "lucide-react";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useSettlementStore } from "@/store/useSettlementStore";
import { useUIStore } from "@/store/useUIStore";
import type { FounderName } from "@/lib/types";
import { cn } from "@/lib/utils";

const COMPANY_TOTAL = 39562;
const SHARES_CONFIG: Record<FounderName, {
  name: FounderName;
  shareAmount: number;
  sharePercentFormatted: string;
  shareRatio: number;
  bg: string;
  text: string;
  bar: string;
  border: string;
  tagBg: string;
  indicator: string;
}> = {
  Sourabh: {
    name: "Sourabh",
    shareAmount: 13187.33,
    sharePercentFormatted: "33.3%",
    shareRatio: 0.333333,
    bg: "bg-[#FFC107]/10",
    text: "text-[#FFC107]",
    bar: "bg-gradient-to-r from-[#FFC107] to-[#FFD54F]",
    border: "border-[#FFC107]/30",
    tagBg: "bg-[#FFC107]/15",
    indicator: "from-[#FFC107] to-amber-500/20",
  },
  Asher: {
    name: "Asher",
    shareAmount: 26374.67,
    sharePercentFormatted: "66.7%",
    shareRatio: 0.666667,
    bg: "bg-[#3B82F6]/10",
    text: "text-[#60A5FA]",
    bar: "bg-gradient-to-r from-[#3B82F6] to-[#60A5FA]",
    border: "border-[#3B82F6]/30",
    tagBg: "bg-[#3B82F6]/15",
    indicator: "from-[#3B82F6] to-blue-500/20",
  },
};

const TWO_FOUNDERS: FounderName[] = ["Sourabh", "Asher"];

export function CompanyShareSection() {
  const currentUser = useUIStore((s) => s.currentUser) as FounderName;
  const { expenses } = useExpenseStore();
  const { splits } = useSettlementStore();

  const totalCompanySpending = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0) || COMPANY_TOTAL;
  }, [expenses]);

  // Compute allocated amounts from existing splits (if any)
  const allocationStats = useMemo(() => {
    const allocated: Record<FounderName, number> = { Sourabh: 0, Asher: 0 };
    splits.forEach((s) => {
      s.splitDetails?.forEach((d) => {
        if (TWO_FOUNDERS.includes(d.founder as FounderName)) {
          allocated[d.founder as FounderName] += d.amount || 0;
        }
      });
    });
    return allocated;
  }, [splits]);

  const hasAnySplits = useMemo(() => {
    return splits.length > 0 && (allocationStats.Sourabh > 0 || allocationStats.Asher > 0);
  }, [splits, allocationStats]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl bg-[#121212]/90 backdrop-blur-xl border border-white/[0.08] p-4 sm:p-5 space-y-4 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#FFC107]/10 text-[#FFC107]">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs sm:text-sm text-foreground uppercase tracking-wider">
                Company Share
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-muted-foreground border border-white/[0.08] font-mono">
                Fixed 2-person responsibility
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Total company spending: ₹{totalCompanySpending.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* Two Clean Company Share Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {TWO_FOUNDERS.map((founder) => {
          const cfg = SHARES_CONFIG[founder];
          const isSelf = founder === currentUser;
          const barPercent = Math.round(cfg.shareRatio * 100);
          const allocatedAmt = allocationStats[founder];
          const remainingAmt = Math.max(0, cfg.shareAmount - allocatedAmt);

          return (
            <div
              key={founder}
              className="relative rounded-xl p-4 sm:p-4.5 bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.03] transition-all overflow-hidden"
            >
              {/* Top Accent Strip */}
              <div
                className={cn(
                  "absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r",
                  cfg.indicator
                )}
              />

              {/* Founder Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs",
                      cfg.bg,
                      cfg.text
                    )}
                  >
                    {founder[0]}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs sm:text-sm text-foreground">
                      {founder}
                    </span>
                    {isSelf && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#FFC107]/15 text-[#FFC107] font-bold border border-[#FFC107]/30">
                        YOU
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-mono font-bold text-muted-foreground">
                    {cfg.sharePercentFormatted} of company
                  </span>
                </div>
              </div>

              {/* Fixed Company Share Figure */}
              <div className="mt-3">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Company Share
                </span>
                <div className="text-xl sm:text-2xl font-black text-foreground font-mono tracking-tight tabular-nums mt-0.5">
                  ₹{cfg.shareAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Share Visual Bar */}
              <div className="w-full bg-white/[0.04] h-2.5 rounded-full overflow-hidden p-0.5 border border-white/[0.04] mt-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barPercent}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={cn("h-full rounded-full", cfg.bar)}
                />
              </div>

              {/* Share Allocation (if split data exists) */}
              {hasAnySplits ? (
                <div className="mt-3 pt-2.5 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                  <span>
                    Allocated: <span className="font-semibold text-foreground">₹{allocatedAmt.toLocaleString("en-IN")}</span>
                  </span>
                  <span>
                    Remaining: <span className="font-semibold text-[#FFC107]">₹{remainingAmt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                  </span>
                </div>
              ) : (
                <div className="mt-3 pt-2.5 border-t border-white/[0.05] text-[10px] text-muted-foreground">
                  Fixed company responsibility
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="text-[10px] text-muted-foreground/80 flex items-center justify-between px-1">
        <span>
          Sourabh ₹13,187.33 (33.3%) + Asher ₹26,374.67 (66.7%)
        </span>
        <span className="font-mono text-foreground font-semibold">
          = ₹39,562 Total
        </span>
      </div>
    </motion.div>
  );
}