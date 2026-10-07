"use client";

import { motion } from "framer-motion";
import { X, Calendar, User, Tag, CreditCard, RefreshCw, Clock, FileText, Edit3, Trash2, Split } from "lucide-react";
import type { Expense, ExpenseSplit } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface ExpenseDetailModalProps {
  expense: Expense | null;
  split?: ExpenseSplit | null;
  onClose: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onOpenSplit: (expense: Expense) => void;
}

export function ExpenseDetailModal({
  expense,
  split,
  onClose,
  onEdit,
  onDelete,
  onOpenSplit,
}: ExpenseDetailModalProps) {
  if (!expense) return null;

  let formattedDate = expense.date;
  try {
    formattedDate = format(parseISO(expense.date), "dd MMMM yyyy");
  } catch {}

  let formattedCreatedAt = "";
  try {
    formattedCreatedAt = format(parseISO(expense.createdAt), "dd MMM yyyy, hh:mm a");
  } catch {}

  const isSourabh = expense.person === "Sourabh";

  // Check if split exists
  const hasSplit = split && split.splitDetails && split.splitDetails.length > 0;
  const sourabhSplit = split?.splitDetails?.find((d) => d.founder === "Sourabh");
  const asherSplit = split?.splitDetails?.find((d) => d.founder === "Asher");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
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
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Expense Details
            </span>
            <h2 className="text-base sm:text-lg font-bold text-foreground mt-0.5 leading-snug">
              {expense.purpose}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount Display */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Amount Paid
          </span>
          <div className="text-3xl sm:text-4xl font-black text-foreground font-mono mt-1">
            ₹{expense.amount.toLocaleString("en-IN")}
          </div>
        </div>

        {/* Payer vs Share Allocation Card */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
          {/* Payer Row */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-3.5 h-3.5" />
              <span>Paid By (Payer)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px]",
                  isSourabh
                    ? "bg-[#FFC107]/10 text-[#FFC107]"
                    : "bg-[#3B82F6]/10 text-[#60A5FA]"
                )}
              >
                {expense.person[0]}
              </div>
              <span className="font-semibold text-foreground">{expense.person}</span>
            </div>
          </div>

          {/* Share Allocation Row */}
          <div className="pt-2 border-t border-white/[0.05] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Company Share Allocation</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSplit(expense);
                }}
                className="text-[11px] font-bold text-[#FFC107] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Split className="w-3 h-3" />
                <span>{hasSplit ? "Edit Split" : "Split Expense"}</span>
              </button>
            </div>

            {hasSplit ? (
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded-lg bg-white/[0.03] border border-[#FFC107]/20 flex items-center justify-between">
                  <span className="text-muted-foreground text-[10px]">Sourabh:</span>
                  <span className="font-bold text-[#FFC107]">
                    ₹{(sourabhSplit?.amount || 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.03] border border-[#3B82F6]/20 flex items-center justify-between">
                  <span className="text-muted-foreground text-[10px]">Asher:</span>
                  <span className="font-bold text-[#60A5FA]">
                    ₹{(asherSplit?.amount || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground/70 italic">
                No custom company share split recorded yet.
              </p>
            )}
          </div>
        </div>

        {/* General Metadata Grid */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>Date</span>
            </div>
            <span className="font-semibold text-foreground font-mono">{formattedDate}</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Tag className="w-3.5 h-3.5" />
              <span>Category</span>
            </div>
            <span className="font-semibold text-foreground capitalize px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08]">
              {expense.category}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Payment Method</span>
            </div>
            <span className="font-semibold text-foreground uppercase font-mono">{expense.paymentMethod}</span>
          </div>

          {expense.notes && (
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <FileText className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold">Notes</span>
              </div>
              <p className="text-foreground/90 text-xs pl-5 whitespace-pre-wrap">{expense.notes}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center gap-2 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(expense);
            }}
            className="flex-1 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-bold text-foreground transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (confirm("Delete this expense transaction?")) {
                onClose();
                onDelete(expense);
              }
            }}
            className="py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-bold text-red-400 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bee-gradient text-[#111] text-xs font-bold transition flex items-center justify-center cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}