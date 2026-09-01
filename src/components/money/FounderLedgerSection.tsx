"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, Wallet, X, ChevronDown, Handshake, Users, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useSettlementStore } from "@/store/useSettlementStore";
import { useUIStore } from "@/store/useUIStore";
import { computeFounderLedgerAndDebts } from "@/lib/supabase/settlements";
import type { FounderName, PairwiseDebt } from "@/lib/types";
import { cn } from "@/lib/utils";

const FOUNDER_COLORS: Record<FounderName, { bg: string; text: string; bar: string; border: string }> = {
  Sourabh: {
    bg: "bg-[#FFC107]/10",
    text: "text-[#FFC107]",
    bar: "bg-gradient-to-r from-[#FFC107] to-[#FFD54F]",
    border: "border-[#FFC107]/30",
  },
  Asher: {
    bg: "bg-[#3B82F6]/10",
    text: "text-[#60A5FA]",
    bar: "bg-gradient-to-r from-[#3B82F6] to-[#60A5FA]",
    border: "border-[#3B82F6]/30",
  },
  Subin: {
    bg: "bg-[#10B981]/10",
    text: "text-[#34D399]",
    bar: "bg-gradient-to-r from-[#10B981] to-[#34D399]",
    border: "border-[#10B981]/30",
  },
};

export function FounderLedgerSection() {
  const currentUser = useUIStore((s) => s.currentUser) as FounderName;
  const { expenses } = useExpenseStore();
  const { splits, settlements, markPaid } = useSettlementStore();

  const [expandedFounder, setExpandedFounder] = useState<FounderName | null>(null);
  const [settlingPair, setSettlingPair] = useState<PairwiseDebt | null>(null);
  const [settleNotes, setSettleNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showTransfers, setShowTransfers] = useState(false);

  const { ledgers, pairwiseDebts, founderPrepaidCompany, summary } = useMemo(() => {
    return computeFounderLedgerAndDebts(expenses, splits, settlements);
  }, [expenses, splits, settlements]);

  // Max contribution for relative bar percentage calculation
  const maxContribution = useMemo(() => {
    const max = Math.max(...ledgers.map((l) => l.effectiveContribution), 1);
    return max;
  }, [ledgers]);

  const totalEffectiveContributions = useMemo(() => {
    return ledgers.reduce((acc, l) => acc + l.effectiveContribution, 0);
  }, [ledgers]);

  const toggleExpand = (founder: FounderName) => {
    setExpandedFounder((prev) => (prev === founder ? null : founder));
  };

  const handleConfirmSettlement = async () => {
    if (!settlingPair) return;
    setSaving(true);
    try {
      await markPaid({
        payer: settlingPair.payer,
        payee: settlingPair.payee,
        amount: settlingPair.amount,
        confirmedBy: currentUser || "Sourabh",
        notes: settleNotes.trim() || undefined,
      });
      setSettlingPair(null);
      setSettleNotes("");
    } catch (e) {
      console.error("Error marking settlement paid:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 w-full">
      {/* ── 1. FOUNDER CONTRIBUTIONS ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl bg-[#121212]/90 backdrop-blur-xl border border-white/[0.08] p-4 sm:p-5 space-y-4 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#FFC107]/10 text-[#FFC107]">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-foreground uppercase tracking-wider">
                Founder Contributions
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Total contributed: ₹{totalEffectiveContributions.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        {/* Horizontal Contribution Bars */}
        <div className="space-y-3.5">
          {ledgers.map((l) => {
            const isSelf = l.founder === currentUser;
            const colors = FOUNDER_COLORS[l.founder] || {
              bg: "bg-white/10",
              text: "text-foreground",
              bar: "bg-[#FFC107]",
              border: "border-white/20",
            };
            const barWidthPercent = Math.max(
              8,
              Math.min(100, (l.effectiveContribution / maxContribution) * 100)
            );
            const sharePercent =
              totalEffectiveContributions > 0
                ? Math.round((l.effectiveContribution / totalEffectiveContributions) * 100)
                : 33;

            return (
              <div key={l.founder} className="space-y-1.5 group">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px]",
                        colors.bg,
                        colors.text
                      )}
                    >
                      {l.founder[0]}
                    </div>
                    <span className="font-semibold text-foreground/90">{l.founder}</span>
                    {isSelf && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#FFC107]/15 text-[#FFC107] font-bold border border-[#FFC107]/30">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{sharePercent}%</span>
                    <span className="font-bold text-foreground font-mono tabular-nums text-xs sm:text-sm">
                      ₹{l.effectiveContribution.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Progress bar container */}
                <div className="w-full bg-white/[0.04] h-2.5 rounded-full overflow-hidden p-0.5 border border-white/[0.04]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidthPercent}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={cn("h-full rounded-full", colors.bar)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── 2. FOUNDER SETTLEMENT ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="rounded-2xl bg-[#121212]/90 backdrop-blur-xl border border-white/[0.08] p-4 sm:p-5 space-y-3.5 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Handshake className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-foreground uppercase tracking-wider">
                Founder Settlement
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Equal split baseline: ₹{summary.equalSharePerFounder.toLocaleString("en-IN")} / founder
              </p>
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground/80 hidden sm:inline">
            Tap to expand details
          </span>
        </div>

        {/* Founder Settlement Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-start">
          {ledgers.map((l) => {
            const isOwed = l.netBalance > 0;
            const isOwes = l.netBalance < 0;
            const absNet = Math.abs(l.netBalance);
            const isSelf = l.founder === currentUser;
            const isExpanded = expandedFounder === l.founder;

            const debtsPaidByFounder = pairwiseDebts.filter((d) => d.payer === l.founder);
            const debtsOwedToFounder = pairwiseDebts.filter((d) => d.payee === l.founder);

            return (
              <button
                key={l.founder}
                type="button"
                onClick={() => toggleExpand(l.founder)}
                aria-expanded={isExpanded}
                className={cn(
                  "w-full text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer focus:outline-none",
                  isExpanded
                    ? "bg-white/[0.06] border-white/20 shadow-lg ring-1 ring-[#FFC107]/40"
                    : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/10"
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs sm:text-sm text-foreground">
                      {l.founder}
                    </span>
                    {isSelf && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#FFC107]/15 text-[#FFC107] font-bold border border-[#FFC107]/30">
                        YOU
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={cn(
                      "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
                      isExpanded && "rotate-180 text-[#FFC107]"
                    )}
                  />
                </div>

                {/* Primary Settlement Status */}
                <div className="pt-2">
                  {isOwed && (
                    <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-sm sm:text-base tracking-tight font-mono">
                      <ArrowDownLeft className="w-3.5 h-3.5 shrink-0" />
                      <span>{isSelf ? "You are owed" : "Owed"} ₹{absNet.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {isOwes && (
                    <div className="flex items-center gap-1.5 text-rose-400 font-extrabold text-sm sm:text-base tracking-tight font-mono">
                      <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                      <span>{isSelf ? "You owe" : "Owes"} ₹{absNet.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {!isOwed && !isOwes && (
                    <div className="text-muted-foreground font-bold text-sm sm:text-base tracking-tight">
                      Settled (₹0)
                    </div>
                  )}
                </div>

                {/* Progressive Disclosure (Expandable) */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden pt-2.5 mt-2.5 border-t border-white/10 space-y-1.5 text-[11px]"
                    >
                      <div className="flex justify-between text-muted-foreground">
                        <span>Contributed:</span>
                        <span className="font-mono text-foreground font-semibold">
                          ₹{l.effectiveContribution.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Fair share:</span>
                        <span className="font-mono text-foreground">
                          ₹{l.fairShare.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold pt-1 border-t border-white/05">
                        <span className="text-foreground">Balance:</span>
                        <span
                          className={cn(
                            "font-mono",
                            isOwed ? "text-emerald-400" : isOwes ? "text-rose-400" : "text-muted-foreground"
                          )}
                        >
                          {isOwed ? "+" : isOwes ? "-" : ""}₹{absNet.toLocaleString("en-IN")}
                        </span>
                      </div>

                      {/* Debts breakdown line */}
                      {isOwes && debtsPaidByFounder.length > 0 && (
                        <p className="pt-1 text-[10px] text-muted-foreground">
                          {isSelf ? "You owe" : `${l.founder} owes`}:{" "}
                          {debtsPaidByFounder.map((d, i) => (
                            <span key={d.payee} className="text-rose-300 font-semibold">
                              {i > 0 && ", "}₹{d.amount.toLocaleString("en-IN")} to {d.payee}
                            </span>
                          ))}
                        </p>
                      )}
                      {isOwed && debtsOwedToFounder.length > 0 && (
                        <p className="pt-1 text-[10px] text-muted-foreground">
                          {isSelf ? "You receive" : `${l.founder} receives`}:{" "}
                          {debtsOwedToFounder.map((d, i) => (
                            <span key={d.payer} className="text-emerald-300 font-semibold">
                              {i > 0 && " & "}₹{d.amount.toLocaleString("en-IN")} from {d.payer}
                            </span>
                          ))}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ── 3. WHO OWES WHOM? ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-2xl bg-[#121212]/90 backdrop-blur-xl border border-white/[0.08] p-4 sm:p-5 space-y-3 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-foreground uppercase tracking-wider">
                Who Owes Whom?
              </h3>
              <p className="text-[10px] text-muted-foreground">
                {pairwiseDebts.length > 0
                  ? `${pairwiseDebts.length} pending transfer${pairwiseDebts.length > 1 ? "s" : ""}`
                  : "All settled"}
              </p>
            </div>
          </div>
        </div>

        {pairwiseDebts.length === 0 ? (
          <div className="py-4 px-3 text-center text-xs text-muted-foreground bg-emerald-500/5 rounded-xl border border-emerald-500/15 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>🎉 All founder shared expenses are completely settled!</span>
          </div>
        ) : (
          <div className="space-y-2">
            {pairwiseDebts.map((debt) => (
              <div
                key={`${debt.payer}_${debt.payee}`}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-all gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-xs shrink-0">
                    {debt.payer[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5 truncate">
                      <span>{debt.payer}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-[#FFC107] font-bold">{debt.payee}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-xs sm:text-sm font-bold text-foreground font-mono tabular-nums">
                    ₹{debt.amount.toLocaleString("en-IN")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSettlingPair(debt)}
                    className="px-3 py-1.5 rounded-lg bee-gradient text-[#111] font-bold text-xs shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                  >
                    Mark as Paid
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Collapsible Founder Transfers (Already Paid) & Prepaid */}
        <div className="pt-2 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={() => setShowTransfers(!showTransfers)}
            className="flex items-center justify-between w-full text-[11px] text-muted-foreground hover:text-foreground font-medium py-1 transition-colors cursor-pointer"
          >
            <span>Past transfers & prepaid records</span>
            <ChevronDown
              className={cn("w-3.5 h-3.5 transition-transform duration-200", showTransfers && "rotate-180")}
            />
          </button>

          <AnimatePresence>
            {showTransfers && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden space-y-2 pt-2"
              >
                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="font-semibold text-foreground">Sourabh</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground/60" />
                    <span className="font-semibold text-[#FFC107]">Asher</span>
                    <span>· Domain + SIM split</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 text-xs">₹500 (PAID)</span>
                </div>

                {founderPrepaidCompany.map((item) => (
                  <div
                    key={item.founder}
                    className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-between text-[11px]"
                  >
                    <span className="text-muted-foreground">
                      Company owes <strong className="text-foreground">{item.founder}</strong>:
                    </span>
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      ₹{item.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Settlement Confirmation Modal ── */}
      <AnimatePresence>
        {settlingPair && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSettlingPair(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-2xl bg-[#141414] border border-white/10 p-5 sm:p-6 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base sm:text-lg text-foreground">Confirm Settlement</h3>
                <button
                  onClick={() => setSettlingPair(null)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-muted-foreground space-y-1">
                <p>
                  Mark payment of{" "}
                  <strong className="text-foreground font-mono text-sm">
                    ₹{settlingPair.amount.toLocaleString("en-IN")}
                  </strong>{" "}
                  from <strong className="text-[#FFC107]">{settlingPair.payer}</strong> to{" "}
                  <strong className="text-[#FFC107]">{settlingPair.payee}</strong> as settled.
                </p>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Payment Reference / Note (Optional)
                </label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="e.g. UPI Ref #123456"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm outline-none text-foreground focus:border-[#FFC107]/50"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSettlingPair(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 text-xs font-semibold text-foreground hover:bg-white/10 min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSettlement}
                  disabled={saving}
                  className="flex-1 py-2.5 min-h-[40px] rounded-xl bee-gradient text-[#111] font-bold text-xs disabled:opacity-50 flex items-center justify-center cursor-pointer"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-[#111]/30 border-t-[#111] rounded-full animate-spin" />
                  ) : (
                    "Confirm Paid"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
