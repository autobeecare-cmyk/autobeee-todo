"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, Wallet, X, ChevronDown } from "lucide-react";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useSettlementStore } from "@/store/useSettlementStore";
import { useUIStore } from "@/store/useUIStore";
import { computeFounderLedgerAndDebts } from "@/lib/supabase/settlements";
import type { FounderName, PairwiseDebt } from "@/lib/types";

export function FounderLedgerSection() {
  const currentUser = useUIStore((s) => s.currentUser) as FounderName;
  const { expenses } = useExpenseStore();
  const { splits, settlements, markPaid } = useSettlementStore();

  const [expandedFounder, setExpandedFounder] = useState<FounderName | null>(null);
  const [settlingPair, setSettlingPair] = useState<PairwiseDebt | null>(null);
  const [settleNotes, setSettleNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { ledgers, pairwiseDebts, founderPrepaidCompany } = useMemo(() => {
    return computeFounderLedgerAndDebts(expenses, splits, settlements);
  }, [expenses, splits, settlements]);

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
        confirmedBy: currentUser,
        notes: settleNotes.trim() || undefined,
      });
      setSettlingPair(null);
      setSettleNotes("");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 w-full box-border">
      {/* 1. Founder Balance Cards (Interactive & Expandable Progressive Disclosure) */}
      <div className="rounded-2xl bg-[#141414] border border-white/10 p-4 sm:p-5 space-y-3.5 shadow-xl w-full box-border">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base sm:text-lg text-foreground">Founder Settlement</h3>
          <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">
            Tap any card to view contribution details
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full items-start">
          {ledgers.map((l) => {
            const isOwed = l.netBalance > 0;
            const isOwes = l.netBalance < 0;
            const absNet = Math.abs(l.netBalance);
            const isSelf = l.founder === currentUser;
            const isExpanded = expandedFounder === l.founder;

            return (
              <button
                key={l.founder}
                type="button"
                onClick={() => toggleExpand(l.founder)}
                aria-expanded={isExpanded}
                aria-label={`Founder settlement details for ${l.founder}`}
                className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/08 hover:border-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#FFC107]/50 box-border cursor-pointer"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{l.founder}</span>
                    {isSelf && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#FFC107]/10 text-[#FFC107] font-semibold border border-[#FFC107]/20 font-mono">
                        YOU
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                      isExpanded ? "rotate-180 text-[#FFC107]" : ""
                    }`}
                  />
                </div>

                {/* Collapsed Default State */}
                <div className="pt-2">
                  {isOwed && (
                    <div className="text-base sm:text-lg font-extrabold text-green-400 tracking-tight">
                      {isSelf ? "You are owed" : "Owed"} ₹{absNet.toLocaleString("en-IN")}
                    </div>
                  )}
                  {isOwes && (
                    <div className="text-base sm:text-lg font-extrabold text-red-400 tracking-tight">
                      {isSelf ? "You owe" : "Owes"} ₹{absNet.toLocaleString("en-IN")}
                    </div>
                  )}
                  {!isOwed && !isOwes && (
                    <div className="text-base sm:text-lg font-extrabold text-muted-foreground tracking-tight">
                      Settled (₹0)
                    </div>
                  )}
                </div>

                {/* Progressive Disclosure: Animated Expanded Details */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden pt-3 mt-3 border-t border-white/10 space-y-2 text-xs"
                    >
                      <div className="flex justify-between text-muted-foreground font-medium">
                        <span>Total contribution</span>
                        <span className="font-mono text-foreground font-bold">
                          ₹{l.effectiveContribution.toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div className="flex justify-between text-muted-foreground font-medium">
                        <span>Fair share</span>
                        <span className="font-mono text-foreground">
                          ₹{l.fairShare.toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div className="flex justify-between font-bold pt-1 border-t border-white/08">
                        <span className="text-foreground">Final balance</span>
                        {isOwed && (
                          <span className="text-green-400 font-mono">
                            ₹{absNet.toLocaleString("en-IN")} {isSelf ? "owed to you" : "owed"}
                          </span>
                        )}
                        {isOwes && (
                          <span className="text-red-400 font-mono">
                            ₹{absNet.toLocaleString("en-IN")} owed
                          </span>
                        )}
                        {!isOwed && !isOwes && (
                          <span className="text-muted-foreground font-mono">₹0</span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. WHO OWES WHOM? Section */}
      <div className="rounded-2xl bg-[#141414] border border-white/10 p-4 sm:p-5 space-y-3.5 shadow-xl w-full box-border">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base sm:text-lg text-foreground">WHO OWES WHOM?</h3>
        </div>

        {pairwiseDebts.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground bg-white/05 rounded-xl border border-white/05 flex items-center justify-center gap-2 px-3">
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            <span>🎉 All shared founder expenses are completely settled! No pending debts.</span>
          </div>
        ) : (
          <div className="space-y-3 w-full">
            {pairwiseDebts.map((debt) => (
              <div
                key={`${debt.payer}_${debt.payee}`}
                className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-white/5 border border-white/08 gap-3 w-full box-border"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center font-bold text-xs shrink-0">
                    {debt.payer[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5 truncate">
                      <span>{debt.payer}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-[#FFC107]">{debt.payee}</span>
                    </div>
                    <p className="text-sm font-bold text-foreground font-mono mt-0.5 sm:hidden">
                      ₹{debt.amount.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="hidden sm:inline text-base font-bold text-foreground font-mono">
                    ₹{debt.amount.toLocaleString("en-IN")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSettlingPair(debt)}
                    className="px-3.5 sm:px-4 py-2.5 min-h-[44px] rounded-xl bee-gradient text-[#111] font-bold text-xs shadow hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                  >
                    Mark as Paid
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Founder Transfers (Already Paid) Log */}
      <div className="rounded-2xl bg-[#141414] border border-white/10 p-4 sm:p-5 space-y-3 shadow-xl w-full box-border">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-foreground">Founder Transfers (Already Paid)</h3>
          <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 font-mono font-bold border border-green-500/20">
            PAID
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/05 flex items-center justify-between text-xs w-full box-border">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-foreground">Sourabh</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="font-bold text-[#FFC107]">Asher</span>
            <span className="text-muted-foreground truncate hidden sm:inline">· Domain + SIM</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono font-bold text-green-400 text-sm">₹500</span>
          </div>
        </div>
      </div>

      {/* 4. Founder Prepaid Company Expenses */}
      {founderPrepaidCompany.length > 0 && (
        <div className="rounded-2xl bg-[#141414] border border-white/10 p-4 sm:p-5 space-y-3 shadow-xl w-full box-border">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#FFC107]" />
            <h3 className="font-bold text-sm text-foreground">Founder-Prepaid Company Expenses</h3>
          </div>
          <div className="space-y-2">
            {founderPrepaidCompany.map((item) => (
              <div
                key={item.founder}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 text-xs w-full box-border"
              >
                <span className="text-muted-foreground truncate">
                  Company owes <strong className="text-foreground">{item.founder}</strong>:
                </span>
                <span className="font-mono font-bold text-green-400 text-sm shrink-0">
                  ₹{item.amount.toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settlement Modal */}
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
              className="w-full max-w-md rounded-2xl bg-[#141414] border border-white/10 p-6 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-foreground">Confirm Settlement</h3>
                <button
                  onClick={() => setSettlingPair(null)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                Marking payment of <strong className="text-foreground font-mono">₹{settlingPair.amount.toLocaleString("en-IN")}</strong> from{" "}
                <strong className="text-[#FFC107]">{settlingPair.payer}</strong> to{" "}
                <strong className="text-[#FFC107]">{settlingPair.payee}</strong>.
              </p>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Notes / Reference (Optional)</label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="e.g. UPI Ref #987654"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm outline-none text-foreground focus:border-[#FFC107]/50"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSettlingPair(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 text-sm font-medium text-foreground hover:bg-white/10 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSettlement}
                  disabled={saving}
                  className="flex-1 py-2.5 min-h-[44px] rounded-xl bee-gradient text-[#111] font-bold text-sm disabled:opacity-50 flex items-center justify-center cursor-pointer"
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
