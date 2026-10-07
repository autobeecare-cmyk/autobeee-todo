"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { X, Check, AlertCircle, Sparkles, User, Split } from "lucide-react";
import type { Expense, ExpenseSplit, FounderName } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ExpenseSplitModalProps {
  expense: Expense;
  existingSplit?: ExpenseSplit | null;
  onClose: () => void;
  onSave: (splitDetails: { founder: FounderName; amount: number }[]) => Promise<void>;
}

const FOUNDERS: FounderName[] = ["Sourabh", "Asher"];

export function ExpenseSplitModal({
  expense,
  existingSplit,
  onClose,
  onSave,
}: ExpenseSplitModalProps) {
  const totalAmount = expense.amount;

  // Initialize allocation amounts from existing split if available, otherwise default to blank custom
  const initialSourabh = useMemo(() => {
    if (!existingSplit?.splitDetails) return "";
    const d = existingSplit.splitDetails.find((x) => x.founder === "Sourabh");
    return d ? d.amount.toString() : "";
  }, [existingSplit]);

  const initialAsher = useMemo(() => {
    if (!existingSplit?.splitDetails) return "";
    const d = existingSplit.splitDetails.find((x) => x.founder === "Asher");
    return d ? d.amount.toString() : "";
  }, [existingSplit]);

  const [sourabhAmt, setSourabhAmt] = useState<string>(initialSourabh);
  const [asherAmt, setAsherAmt] = useState<string>(initialAsher);
  const [saving, setSaving] = useState(false);

  // Parse numbers
  const numSourabh = parseFloat(sourabhAmt) || 0;
  const numAsher = parseFloat(asherAmt) || 0;
  const totalAllocated = Math.round((numSourabh + numAsher) * 100) / 100;
  const difference = Math.round((totalAmount - totalAllocated) * 100) / 100;

  const isValid = Math.abs(difference) < 0.01 && totalAllocated > 0;

  // Preset handlers
  const applyEqual = () => {
    const half = Math.round((totalAmount / 2) * 100) / 100;
    const remainder = Math.round((totalAmount - half) * 100) / 100;
    setSourabhAmt(half.toString());
    setAsherAmt(remainder.toString());
  };

  const applyCompanyShare = () => {
    // 33.333% Sourabh, 66.667% Asher
    const sShare = Math.round((totalAmount * 0.333333) * 100) / 100;
    const aShare = Math.round((totalAmount - sShare) * 100) / 100;
    setSourabhAmt(sShare.toString());
    setAsherAmt(aShare.toString());
  };

  const applySoleSourabh = () => {
    setSourabhAmt(totalAmount.toString());
    setAsherAmt("0");
  };

  const applySoleAsher = () => {
    setSourabhAmt("0");
    setAsherAmt(totalAmount.toString());
  };

  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      await onSave([
        { founder: "Sourabh", amount: numSourabh },
        { founder: "Asher", amount: numAsher },
      ]);
      onClose();
    } catch (e) {
      console.error("Error saving expense split:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.98 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 bg-[#141414] border border-white/10 flex flex-col gap-4 max-h-[92vh] overflow-y-auto no-scrollbar shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FFC107]/10 text-[#FFC107]">
              <Split className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Split Expense Allocation
              </h2>
              <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                {expense.purpose}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Expense Header Card */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Total Expense Amount
            </span>
            <div className="text-2xl font-black text-foreground font-mono mt-0.5">
              ₹{totalAmount.toLocaleString("en-IN")}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Paid By (Payer)
            </span>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/[0.06] text-foreground border border-white/[0.08]">
              {expense.person}
            </span>
          </div>
        </div>

        {/* Presets */}
        <div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
            Quick Split Presets
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={applyCompanyShare}
              className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-muted-foreground hover:text-foreground transition font-medium text-left cursor-pointer"
            >
              <span className="font-bold block text-foreground">Company Share</span>
              <span className="text-[10px] text-muted-foreground">33.3% / 66.7%</span>
            </button>
            <button
              type="button"
              onClick={applyEqual}
              className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-muted-foreground hover:text-foreground transition font-medium text-left cursor-pointer"
            >
              <span className="font-bold block text-foreground">50 / 50 Equal</span>
              <span className="text-[10px] text-muted-foreground">₹{(totalAmount / 2).toFixed(0)} each</span>
            </button>
          </div>
        </div>

        {/* Allocation Inputs */}
        <div className="space-y-3">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Allocate to Company Shares
          </span>

          {/* Sourabh Share */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-[#FFC107]/20 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-[#FFC107]/10 text-[#FFC107] font-bold flex items-center justify-center text-[10px]">
                  S
                </div>
                <span className="font-semibold text-foreground">Sourabh Share</span>
              </div>
              <button
                type="button"
                onClick={applySoleSourabh}
                className="text-[10px] text-amber-400/80 hover:text-amber-400 hover:underline cursor-pointer"
              >
                100% to Sourabh
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
                ₹
              </span>
              <input
                type="number"
                step="any"
                value={sourabhAmt}
                onChange={(e) => setSourabhAmt(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-bold font-mono outline-none focus:border-[#FFC107]/50 text-foreground"
              />
            </div>
          </div>

          {/* Asher Share */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-[#3B82F6]/20 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-[#3B82F6]/10 text-[#60A5FA] font-bold flex items-center justify-center text-[10px]">
                  A
                </div>
                <span className="font-semibold text-foreground">Asher Share</span>
              </div>
              <button
                type="button"
                onClick={applySoleAsher}
                className="text-[10px] text-blue-400/80 hover:text-blue-400 hover:underline cursor-pointer"
              >
                100% to Asher
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
                ₹
              </span>
              <input
                type="number"
                step="any"
                value={asherAmt}
                onChange={(e) => setAsherAmt(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-bold font-mono outline-none focus:border-[#3B82F6]/50 text-foreground"
              />
            </div>
          </div>
        </div>

        {/* Validation Status Banner */}
        <div
          className={cn(
            "p-3 rounded-xl border text-xs flex items-center justify-between font-mono",
            isValid
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : difference > 0
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          )}
        >
          <div className="flex items-center gap-1.5">
            {isValid ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="font-medium">
              {isValid
                ? "Allocation matches expense amount ✓"
                : difference > 0
                ? `₹${difference.toLocaleString("en-IN", { minimumFractionDigits: 2 })} remaining to allocate`
                : `Allocation exceeds by ₹${(-difference).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
            </span>
          </div>
          <span className="font-bold">
            ₹{totalAllocated.toLocaleString("en-IN")} / ₹{totalAmount.toLocaleString("en-IN")}
          </span>
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center gap-2 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isValid || saving}
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bee-gradient text-[#111] text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-[#111]/30 border-t-[#111] rounded-full animate-spin" />
            ) : (
              "Save Split"
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}