"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { X, AlertCircle, Check, Trash2 } from "lucide-react";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useSettlementStore } from "@/store/useSettlementStore";
import { createExpense, updateExpense, deleteExpense } from "@/lib/supabase/expenses";
import { saveExpenseSplit, deleteExpenseSplit } from "@/lib/supabase/settlements";
import type {
  Expense,
  ExpenseCategory,
  PaymentMethod,
  FounderName,
  ExpenseType,
  SplitMethod,
  SplitDetail,
} from "@/lib/types";

const ALL_FOUNDERS: FounderName[] = ["Sourabh", "Asher"];

const EXP_CATEGORIES: ExpenseCategory[] = [
  "fuel", "travel", "marketing", "food", "meetings",
  "software", "subscriptions", "development", "equipment", "operations", "misc"
];

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "upi", "card", "bank"];

export function SharedExpenseModal({
  expense,
  onClose,
}: {
  expense: Expense | null;
  onClose: () => void;
}) {
  const { splits } = useSettlementStore();
  const existingSplit = useMemo(() => {
    return expense ? splits.find((s) => s.expenseId === expense.id) : null;
  }, [expense, splits]);

  const [amount, setAmount] = useState(expense?.amount?.toString() ?? "");
  const [purpose, setPurpose] = useState(expense?.purpose ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "operations");
  const [paidBy, setPaidBy] = useState<FounderName | "Company Account">(
    (expense?.person as any) || "Sourabh"
  );
  const [date, setDate] = useState(expense?.date ?? new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState<PaymentMethod>(expense?.paymentMethod ?? "upi");

  // Extended Shared Expense state
  const [expenseType, setExpenseType] = useState<ExpenseType>(
    existingSplit?.expenseType ?? ((expense?.person as string) === "Company Account" ? "company" : "shared_founder")
  );
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(
    existingSplit?.splitMethod ?? "equal"
  );
  const [selectedFounders, setSelectedFounders] = useState<FounderName[]>(() => {
    if (existingSplit?.splitDetails?.length) {
      const active = existingSplit.splitDetails
        .map((d) => d.founder)
        .filter((f): f is FounderName => f === "Sourabh" || f === "Asher");
      if (active.length > 0) return active;
    }
    return ["Sourabh", "Asher"];
  });

  // Custom percentages & amounts
  const [percentages, setPercentages] = useState<Record<FounderName, string>>(() => {
    if (existingSplit?.splitMethod === "percentage" && existingSplit.splitDetails) {
      const s = existingSplit.splitDetails.find((d) => d.founder === "Sourabh")?.percentage?.toString() ?? "50";
      const a = existingSplit.splitDetails.find((d) => d.founder === "Asher")?.percentage?.toString() ?? "50";
      return { Sourabh: s, Asher: a };
    }
    return { Sourabh: "50", Asher: "50" };
  });

  const [customAmounts, setCustomAmounts] = useState<Record<FounderName, string>>(() => {
    if (existingSplit?.splitDetails) {
      const s = existingSplit.splitDetails.find((d) => d.founder === "Sourabh")?.amount?.toString() ?? "";
      const a = existingSplit.splitDetails.find((d) => d.founder === "Asher")?.amount?.toString() ?? "";
      return { Sourabh: s, Asher: a };
    }
    return { Sourabh: "", Asher: "" };
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Compute calculated split breakdown
  const computedSplitDetails = useMemo<SplitDetail[]>(() => {
    const total = parseFloat(amount) || 0;
    if (total <= 0 || selectedFounders.length === 0) return [];

    if (splitMethod === "equal") {
      const share = Math.round((total / selectedFounders.length) * 100) / 100;
      let sum = 0;
      return selectedFounders.map((f, idx) => {
        if (idx === selectedFounders.length - 1) {
          const remainder = Math.round((total - sum) * 100) / 100;
          return { founder: f, amount: remainder };
        }
        sum += share;
        return { founder: f, amount: share };
      });
    }

    if (splitMethod === "percentage") {
      return selectedFounders.map((f) => {
        const pct = parseFloat(percentages[f]) || 0;
        const share = Math.round(((total * pct) / 100) * 100) / 100;
        return { founder: f, amount: share, percentage: pct };
      });
    }

    if (splitMethod === "custom") {
      return selectedFounders.map((f) => {
        const share = parseFloat(customAmounts[f]) || 0;
        return { founder: f, amount: share };
      });
    }

    return [];
  }, [amount, selectedFounders, splitMethod, percentages, customAmounts]);

  // Validation
  const splitTotal = useMemo(() => {
    return computedSplitDetails.reduce((sum, d) => sum + d.amount, 0);
  }, [computedSplitDetails]);

  const isValid = useMemo(() => {
    const total = parseFloat(amount) || 0;
    if (!amount || total <= 0 || !purpose.trim()) return false;
    if (expenseType === "shared_founder" || expenseType === "founder_specific") {
      if (selectedFounders.length === 0) return false;
      if (Math.abs(splitTotal - total) > 1) return false;
    }
    return true;
  }, [amount, purpose, expenseType, selectedFounders, splitTotal]);

  const toggleFounder = (f: FounderName) => {
    if (selectedFounders.includes(f)) {
      if (selectedFounders.length > 1) {
        setSelectedFounders(selectedFounders.filter((item) => item !== f));
      }
    } else {
      setSelectedFounders([...selectedFounders, f]);
    }
  };

  const handleSave = async () => {
    if (!isValid) return;
    setErrorMsg(null);
    setSaving(true);
    try {
      const numAmount = parseFloat(amount);

      // Create or Update Expense
      const expData = {
        amount: numAmount,
        purpose: purpose.trim(),
        category,
        person: paidBy as any,
        date,
        paymentMethod: method,
        recurring: false,
      };

      let savedExpense: Expense;
      if (expense) {
        savedExpense = await updateExpense(expense.id, expData);
      } else {
        savedExpense = await createExpense(expData);
      }

      // Upsert Expense Split entry if shared or founder paid
      if (expenseType !== "company") {
        await saveExpenseSplit({
          expenseId: savedExpense.id,
          expenseType,
          paidBy,
          splitMethod,
          splitDetails: computedSplitDetails,
        });
      } else if (expense) {
        // If switched to company account, delete any stale split
        await deleteExpenseSplit(savedExpense.id);
      }

      // Refresh stores
      await Promise.all([
        useExpenseStore.getState().fetchExpenses(),
        useSettlementStore.getState().fetchSplitsAndSettlements(),
      ]);

      setSaving(false);
      onClose();
    } catch (err: any) {
      const detailedError =
        err?.message ||
        err?.details ||
        err?.error_description ||
        (typeof err === "object" ? JSON.stringify(err) : String(err));
      console.error("Save expense error:", detailedError, err);
      setErrorMsg(detailedError || "Failed to save expense.");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!expense) return;
    setErrorMsg(null);
    setDeleting(true);
    try {
      await deleteExpenseSplit(expense.id);
      await deleteExpense(expense.id);
      await Promise.all([
        useExpenseStore.getState().fetchExpenses(),
        useSettlementStore.getState().fetchSplitsAndSettlements(),
      ]);
      setDeleting(false);
      onClose();
    } catch (err: any) {
      const detailedError =
        err?.message ||
        err?.details ||
        (typeof err === "object" ? JSON.stringify(err) : String(err));
      console.error("Delete expense error:", detailedError);
      setErrorMsg(detailedError || "Failed to delete expense.");
      setDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="w-full sm:max-w-lg rounded-2xl bg-[#141414] border border-white/10 p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/05 pb-3">
          <h2 className="font-bold text-lg text-foreground">
            {expense ? "Edit Expense" : "Add Expense"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Expense Type Selector */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium block">Expense Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setExpenseType("shared_founder")}
              className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                expenseType === "shared_founder"
                  ? "bg-[#FFC107]/10 border-[#FFC107] text-[#FFC107]"
                  : "bg-white/5 border-white/08 text-muted-foreground"
              }`}
            >
              🤝 Shared Founder
            </button>
            <button
              type="button"
              onClick={() => setExpenseType("founder_paid_company")}
              className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                expenseType === "founder_paid_company"
                  ? "bg-green-500/10 border-green-500 text-green-400"
                  : "bg-white/5 border-white/08 text-muted-foreground"
              }`}
            >
              💳 Founder Paid Company
            </button>
            <button
              type="button"
              onClick={() => setExpenseType("company")}
              className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                expenseType === "company"
                  ? "bg-blue-500/10 border-blue-500 text-blue-400"
                  : "bg-white/5 border-white/08 text-muted-foreground"
              }`}
            >
              🏢 Company Account
            </button>
            <button
              type="button"
              onClick={() => setExpenseType("founder_specific")}
              className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                expenseType === "founder_specific"
                  ? "bg-purple-500/10 border-purple-500 text-purple-400"
                  : "bg-white/5 border-white/08 text-muted-foreground"
              }`}
            >
              👤 Founder Specific
            </button>
          </div>
        </div>

        {/* Amount */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-lg">
            ₹
          </span>
          <input
            autoFocus
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full pl-8 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xl font-bold outline-none focus:border-[#FFC107]/50 text-foreground font-mono"
          />
        </div>

        {/* Purpose */}
        <input
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="Purpose (e.g. Office Rent, Cloud Server, Printing)"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-[#FFC107]/50 text-foreground"
        />

        {/* Paid By & Category */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Paid By</label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#1c1c1c] border border-white/10 text-sm outline-none text-foreground"
            >
              <option value="Sourabh">Sourabh</option>
              <option value="Asher">Asher</option>
              <option value="Company Account">Company Account</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#1c1c1c] border border-white/10 text-sm outline-none text-foreground capitalize"
            >
              {EXP_CATEGORIES.map((c) => (
                <option key={c} value={c} className="capitalize">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date & Payment Method */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#1c1c1c] border border-white/10 text-sm outline-none text-foreground"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Payment Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#1c1c1c] border border-white/10 text-sm outline-none text-foreground uppercase"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Split Details (For Shared Founder or Founder Specific) */}
        {(expenseType === "shared_founder" || expenseType === "founder_specific") && (
          <div className="p-4 rounded-xl bg-white/5 border border-white/08 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">Split Between</label>
              <div className="flex gap-1.5">
                {(["equal", "percentage", "custom"] as SplitMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSplitMethod(m)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold transition-all ${
                      splitMethod === m
                        ? "bg-[#FFC107] text-[#111]"
                        : "bg-white/5 text-muted-foreground"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Founder Checkboxes */}
            <div className="flex gap-2">
              {ALL_FOUNDERS.map((f) => {
                const selected = selectedFounders.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFounder(f)}
                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      selected
                        ? "bg-[#FFC107]/10 border-[#FFC107] text-[#FFC107]"
                        : "bg-white/5 border-white/08 text-muted-foreground"
                    }`}
                  >
                    {selected && <Check className="w-3.5 h-3.5" />}
                    {f}
                  </button>
                );
              })}
            </div>

            {/* If percentage: custom percentage inputs */}
            {splitMethod === "percentage" && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {selectedFounders.map((f) => (
                  <div key={f} className="flex items-center gap-1.5 bg-black/20 p-2 rounded-xl border border-white/5">
                    <span className="text-xs text-muted-foreground font-medium">{f}:</span>
                    <input
                      type="number"
                      value={percentages[f] || ""}
                      onChange={(e) => setPercentages({ ...percentages, [f]: e.target.value })}
                      className="w-full bg-white/5 rounded px-2 py-1 text-xs text-right font-mono text-foreground outline-none"
                      placeholder="50"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                ))}
              </div>
            )}

            {/* If custom: custom amount inputs */}
            {splitMethod === "custom" && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {selectedFounders.map((f) => (
                  <div key={f} className="flex items-center gap-1.5 bg-black/20 p-2 rounded-xl border border-white/5">
                    <span className="text-xs text-muted-foreground font-medium">{f}:</span>
                    <span className="text-xs text-muted-foreground">₹</span>
                    <input
                      type="number"
                      value={customAmounts[f] || ""}
                      onChange={(e) => setCustomAmounts({ ...customAmounts, [f]: e.target.value })}
                      className="w-full bg-white/5 rounded px-2 py-1 text-xs text-right font-mono text-foreground outline-none"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Calculated Breakdown Display */}
            <div className="space-y-1.5 pt-2 border-t border-white/05">
              {computedSplitDetails.map((d) => (
                <div key={d.founder} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{d.founder} share:</span>
                  <span className="font-mono text-foreground font-semibold">
                    ₹{d.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/05 font-bold">
                <span>Total Split:</span>
                <span
                  className={
                    Math.abs(splitTotal - (parseFloat(amount) || 0)) <= 1
                      ? "text-green-400 font-mono"
                      : "text-red-400 font-mono"
                  }
                >
                  ₹{splitTotal.toLocaleString("en-IN")} / ₹{(parseFloat(amount) || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="break-all">{errorMsg}</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          {expense && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-sm font-semibold hover:bg-red-500/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              {deleting ? (
                <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || deleting || !isValid}
            className="flex-1 py-2.5 rounded-xl bee-gradient text-[#111] font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-[#111]/30 border-t-[#111] rounded-full animate-spin" />
            ) : expense ? (
              "Save Expense"
            ) : (
              "Add Shared Expense"
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
