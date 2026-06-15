"use client";
// src/app/money/page.tsx — Company Financial Ledger Redesign
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Search, Trash2, Edit3, TrendingUp, TrendingDown, DollarSign, Wallet, ArrowRight, Activity
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip
} from "recharts";
import {
  format, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfWeek, endOfWeek,
  isWithinInterval, parseISO, subMonths,
  isToday as fnsIsToday, isYesterday as fnsIsYesterday, isThisWeek as fnsIsThisWeek
} from "date-fns";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useIncomeStore } from "@/store/useIncomeStore";
import { usePartnerStore } from "@/store/usePartnerStore";
import { createExpense, updateExpense, deleteExpense } from "@/lib/supabase/expenses";
import { createIncome, updateIncome, deleteIncome } from "@/lib/supabase/income";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Expense, Income, Person, ExpenseCategory, IncomeCategory, PaymentMethod, IncomePaymentMethod } from "@/lib/types";

const PERSONS: Person[] = ["Sourabh", "Asher", "Subin"];
const EXP_CATEGORIES: ExpenseCategory[] = [
  "fuel","travel","marketing","food","meetings",
  "software","subscriptions","development","equipment","operations","misc"
];
const INC_CATEGORIES: IncomeCategory[] = [
  "Client", "Investment", "Grant", "Loan", "Revenue", "Other"
];

const PAYMENT_METHODS: PaymentMethod[] = ["cash","upi","card","bank"];
const INC_PAYMENT_METHODS: IncomePaymentMethod[] = ["Cash", "UPI", "Card", "Bank transfer"];

const CAT_COLORS: Record<string, string> = {
  fuel: "#f97316", travel: "#6366f1", marketing: "#3b82f6", food: "#22c55e",
  meetings: "#06b6d4", software: "#8b5cf6", subscriptions: "#ec4899",
  development: "#14b8a6", equipment: "#f59e0b", operations: "#84cc16", misc: "#6b7280",
  // Income categories:
  Client: "#10b981", Investment: "#3b82f6", Grant: "#8b5cf6", Loan: "#f59e0b", Revenue: "#06b6d4", Other: "#6b7280"
};

const PERSON_COLOR: Record<string, string> = {
  Sourabh: "#FFC107", Asher: "#3B82F6", Subin: "#10B981",
};

// ── Modals ──

function ExpenseModal({ expense, onClose }: { expense: Expense | null; onClose: () => void }) {
  const [amount, setAmount] = useState(expense?.amount?.toString() ?? "");
  const [purpose, setPurpose] = useState(expense?.purpose ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "misc");
  const [person, setPerson] = useState<Person>(expense?.person ?? "Sourabh");
  const [date, setDate] = useState(expense?.date ?? new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState<PaymentMethod>(expense?.paymentMethod ?? "upi");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!amount || !purpose) return;
    setSaving(true);
    const data = {
      amount: parseFloat(amount), purpose, category, person, date,
      paymentMethod: method, recurring: false,
    };
    if (expense) {
      await updateExpense(expense.id, data);
    } else {
      await createExpense(data);
    }
    setSaving(false);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 space-y-4 bg-[#141414] border border-white/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground/90">{expense ? "Edit Expense" : "Add Expense"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-lg">₹</span>
          <input
            autoFocus type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="0"
            className="w-full pl-8 pr-4 py-3 rounded-xl bg-white/5 border border-white/08 text-lg font-bold outline-none focus:border-[rgba(255,193,7,0.4)] transition-colors text-foreground"
          />
        </div>

        <input
          value={purpose} onChange={e => setPurpose(e.target.value)}
          placeholder="Purpose (e.g. Google Ads)"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/08 text-sm outline-none focus:border-[rgba(255,193,7,0.4)] transition-colors text-foreground"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm outline-none text-foreground select-none">
              {EXP_CATEGORIES.map(c => <option key={c} value={c} className="bg-[#161616] text-[#f5f5f5] capitalize">{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Paid by</label>
            <select value={person} onChange={e => setPerson(e.target.value as Person)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm outline-none text-foreground">
              {PERSONS.map(p => <option key={p} value={p} className="bg-[#161616] text-[#f5f5f5]">{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm outline-none text-foreground" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Payment Method</label>
            <select value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm outline-none text-foreground capitalize">
              {PAYMENT_METHODS.map(m => <option key={m} value={m} className="bg-[#161616] text-[#f5f5f5] capitalize">{m.toUpperCase()}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          {expense && (
            <button
              onClick={async () => { await deleteExpense(expense.id); onClose(); }}
              className="px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20 transition-colors"
            >
              Delete
            </button>
          )}
          <button
            onClick={save} disabled={saving || !amount || !purpose}
            className="flex-1 py-2.5 rounded-xl bee-gradient text-[#111] font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <div className="w-4 h-4 border-2 border-[#111]/30 border-t-[#111] rounded-full animate-spin" /> : (expense ? "Save" : "Add Expense")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function IncomeModal({ incomeItem, onClose }: { incomeItem: Income | null; onClose: () => void }) {
  const [amount, setAmount] = useState(incomeItem?.amount?.toString() ?? "");
  const [source, setSource] = useState(incomeItem?.source ?? "");
  const [category, setCategory] = useState<IncomeCategory>(incomeItem?.category ?? "Client");
  const [receivedBy, setReceivedBy] = useState<Person>(incomeItem?.receivedBy ?? "Sourabh");
  const [date, setDate] = useState(incomeItem?.date ?? new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState<IncomePaymentMethod>(incomeItem?.paymentMethod ?? "UPI");
  const [saving, setSaving] = useState(false);

  const { partners } = usePartnerStore();
  const joinedPartners = useMemo(() => partners.filter(p => p.pipeline_status === "Joined"), [partners]);

  const [relatedPartnerId, setRelatedPartnerId] = useState(incomeItem?.relatedPartnerId ?? "");
  const [commissionRate, setCommissionRate] = useState(incomeItem?.commissionRate?.toString() ?? "");

  const handlePartnerChange = (partnerId: string) => {
    setRelatedPartnerId(partnerId);
    if (partnerId) {
      const partner = joinedPartners.find(p => p.id === partnerId);
      if (partner) {
        setCommissionRate(partner.commission_rate?.toString() ?? "0");
      }
    } else {
      setCommissionRate("");
    }
  };

  const save = async () => {
    if (!amount || !source) return;
    setSaving(true);
    const data = {
      amount: parseFloat(amount), source, category, receivedBy, date,
      paymentMethod: method, notes: "",
      relatedPartnerId: relatedPartnerId || undefined,
      commissionRate: commissionRate ? parseFloat(commissionRate) : undefined
    };
    if (incomeItem) {
      await updateIncome(incomeItem.id, data);
    } else {
      await createIncome(data);
    }
    setSaving(false);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 bg-[#141414] border border-white/10 flex flex-col gap-4 max-h-[95vh] overflow-y-auto no-scrollbar"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground/90">{incomeItem ? "Edit Income" : "Add Income"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-lg">₹</span>
            <input
              autoFocus type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="w-full pl-8 pr-4 py-3 rounded-xl bg-white/5 border border-white/08 text-lg font-bold outline-none focus:border-[rgba(255,193,7,0.4)] transition-colors text-foreground"
            />
          </div>

          <input
            value={source} onChange={e => setSource(e.target.value)}
            placeholder="Source (e.g. Client payment — ABC Car Wash)"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/08 text-sm outline-none focus:border-[rgba(255,193,7,0.4)] transition-colors text-foreground"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value as IncomeCategory)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm outline-none text-foreground select-none">
                {INC_CATEGORIES.map(c => <option key={c} value={c} className="bg-[#161616] text-[#f5f5f5] capitalize">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Received by</label>
              <select value={receivedBy} onChange={e => setReceivedBy(e.target.value as Person)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm outline-none text-foreground">
                {PERSONS.map(p => <option key={p} value={p} className="bg-[#161616] text-[#f5f5f5]">{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm outline-none text-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Payment Method</label>
              <select value={method} onChange={e => setMethod(e.target.value as IncomePaymentMethod)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm outline-none text-foreground">
                {INC_PAYMENT_METHODS.map(m => <option key={m} value={m} className="bg-[#161616] text-[#f5f5f5]">{m}</option>)}
              </select>
            </div>
            
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1.5 block">From Partner (Optional)</label>
              <select
                value={relatedPartnerId}
                onChange={e => handlePartnerChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm outline-none text-foreground cursor-pointer"
              >
                <option value="" className="bg-[#161616]">None</option>
                {joinedPartners.map(p => (
                  <option key={p.id} value={p.id} className="bg-[#161616]">
                    {p.name} ({p.area})
                  </option>
                ))}
              </select>
            </div>

            {relatedPartnerId && (
              <div className="col-span-2 p-3 rounded-xl bg-[#FFC107]/5 border border-[#FFC107]/15 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Autobee Booking Commission Rate:</span>
                <span className="font-bold text-[#FFC107]">{commissionRate}%</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          {incomeItem && (
            <button
              onClick={async () => { await deleteIncome(incomeItem.id); onClose(); }}
              className="px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20 transition-colors"
            >
              Delete
            </button>
          )}
          <button
            onClick={save} disabled={saving || !amount || !source}
            className="flex-1 py-2.5 rounded-xl bee-gradient text-[#111] font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <div className="w-4 h-4 border-2 border-[#111]/30 border-t-[#111] rounded-full animate-spin" /> : (incomeItem ? "Save" : "Add Income")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page Component ──

export default function MoneyPage() {
  const { expenses, loading: expLoading } = useExpenseStore();
  const { income, loading: incLoading } = useIncomeStore();
  const loading = expLoading || incLoading;

  const [editExp, setEditExp] = useState<Expense | null>(null);
  const [editInc, setEditInc] = useState<Income | null>(null);
  const [creatingExp, setCreatingExp] = useState(false);
  const [creatingInc, setCreatingInc] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterPerson, setFilterPerson] = useState<Person | "all">("all");
  const [filterCategory, setFilterCategory] = useState<string | "all">("all");

  // Flow chart highlight filter
  const [highlightCategory, setHighlightCategory] = useState<string | null>(null);

  // Quick add inline expense state
  const [quickAmount, setQuickAmount] = useState("");
  const [quickPurpose, setQuickPurpose] = useState("");
  const [quickCat, setQuickCat] = useState<ExpenseCategory>("misc");
  const [quickPerson, setQuickPerson] = useState<Person>("Sourabh");
  const [quickAdding, setQuickAdding] = useState(false);

  const now = new Date();

  // Filters State
  const [timeRange, setTimeRange] = useState<"all" | "year" | "month" | "week">("month");

  // Calculate start and end dates based on timeRange
  const dateRange = useMemo(() => {
    if (timeRange === "all") return null;
    if (timeRange === "year") {
      return { start: startOfYear(now), end: endOfYear(now) };
    }
    if (timeRange === "month") {
      return { start: startOfMonth(now), end: endOfMonth(now) };
    }
    if (timeRange === "week") {
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    }
    return null;
  }, [timeRange, now]);

  const isDateInSelectedRange = (dateStr: string) => {
    if (!dateRange) return true;
    try {
      return isWithinInterval(parseISO(dateStr), dateRange);
    } catch (e) {
      return false;
    }
  };

  const filteredIncome = useMemo(() => {
    return income.filter(i => isDateInSelectedRange(i.date));
  }, [income, dateRange]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => isDateInSelectedRange(e.date));
  }, [expenses, dateRange]);

  // 1. Calculations: Overview totals
  const currentMonthIncomeTotal = useMemo(() => {
    return filteredIncome.reduce((s, i) => s + i.amount, 0);
  }, [filteredIncome]);

  const currentMonthExpenseTotal = useMemo(() => {
    return filteredExpenses.reduce((s, e) => s + e.amount, 0);
  }, [filteredExpenses]);

  const currentMonthNetFlow = currentMonthIncomeTotal - currentMonthExpenseTotal;

  // Range text label for sub-headings
  const rangeLabel = {
    all: "in total",
    year: "this year",
    month: "this month",
    week: "this week",
  }[timeRange];

  const capitalizedRangeLabel = {
    all: "All Time",
    year: "This Year",
    month: "This Month",
    week: "This Week",
  }[timeRange];

  // 2. Calculations: Money Flow Visualization (Stacked totals)
  const incomeCategorySums = useMemo(() => {
    const map: Record<string, number> = {};
    filteredIncome.forEach(i => { map[i.category] = (map[i.category] ?? 0) + i.amount; });
    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredIncome]);

  const expenseCategorySums = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach(e => { map[e.category] = (map[e.category] ?? 0) + e.amount; });
    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);

  // 3. Recharts Donut Data & Bar Trend Memos
  const donutData = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredExpenses.forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.amount; });
    const sorted = Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    if (sorted.length <= 5) return sorted;
    const top5 = sorted.slice(0, 5);
    const otherVal = sorted.slice(5).reduce((sum, item) => sum + item.value, 0);
    top5.push({ name: "other", value: otherVal });
    return top5;
  }, [filteredExpenses]);

  const donutColors = useMemo(() => {
    return donutData.map((_, index) => {
      return index === 0 ? "#FFC107" : `rgba(255, 255, 255, ${0.45 - index * 0.08})`;
    });
  }, [donutData]);

  const barChartData = useMemo(() => {
    return [3, 2, 1, 0].map(monthsAgo => {
      const d = new Date();
      d.setMonth(d.getMonth() - monthsAgo);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      
      const incTotal = income
        .filter(i => isWithinInterval(parseISO(i.date), { start, end }))
        .reduce((sum, i) => sum + i.amount, 0);

      const expTotal = expenses
        .filter(e => isWithinInterval(parseISO(e.date), { start, end }))
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        month: format(d, "MMM"),
        Income: incTotal,
        Expenses: expTotal,
      };
    });
  }, [income, expenses]);

  // 5. Unified chronologic items merge
  const ledgerItems = useMemo(() => {
    const incItems = income.map(i => ({
      id: i.id,
      type: "income" as const,
      amount: i.amount,
      sourceOrPurpose: i.source,
      category: i.category,
      person: i.receivedBy,
      date: i.date,
      method: i.paymentMethod,
      rawDate: parseISO(i.date),
      notes: i.notes,
      rawItem: i,
    }));
    const expItems = expenses.map(e => ({
      id: e.id,
      type: "expense" as const,
      amount: e.amount,
      sourceOrPurpose: e.purpose,
      category: e.category,
      person: e.person,
      date: e.date,
      method: e.paymentMethod,
      rawDate: parseISO(e.date),
      notes: e.notes,
      rawItem: e,
    }));
    return [...incItems, ...expItems].sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
  }, [income, expenses]);

  const filteredLedger = useMemo(() => {
    let items = ledgerItems;
    items = items.filter(x => isDateInSelectedRange(x.date));
    if (filterType !== "all") {
      items = items.filter(x => x.type === filterType);
    }
    if (filterPerson !== "all") {
      items = items.filter(x => x.person === filterPerson);
    }
    if (filterCategory !== "all") {
      items = items.filter(x => x.category === filterCategory);
    }
    if (highlightCategory) {
      items = items.filter(x => x.category === highlightCategory);
    }
    if (search) {
      items = items.filter(x => x.sourceOrPurpose.toLowerCase().includes(search.toLowerCase()));
    }
    return items;
  }, [ledgerItems, filterType, filterPerson, filterCategory, highlightCategory, search, dateRange]);

  const groupedLedger = useMemo(() => {
    const groups = [
      { title: "Today", items: [] as typeof filteredLedger },
      { title: "Yesterday", items: [] as typeof filteredLedger },
      { title: "This Week", items: [] as typeof filteredLedger },
      { title: "Earlier", items: [] as typeof filteredLedger }
    ];
    
    filteredLedger.forEach(item => {
      const d = item.rawDate;
      if (fnsIsToday(d)) {
        groups[0].items.push(item);
      } else if (fnsIsYesterday(d)) {
        groups[1].items.push(item);
      } else if (fnsIsThisWeek(d, { weekStartsOn: 1 })) {
        groups[2].items.push(item);
      } else {
        groups[3].items.push(item);
      }
    });

    return groups.filter(g => g.items.length > 0);
  }, [filteredLedger]);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAmount || !quickPurpose || quickAdding) return;
    setQuickAdding(true);
    try {
      await createExpense({
        amount: parseFloat(quickAmount),
        purpose: quickPurpose,
        category: quickCat,
        person: quickPerson,
        date: new Date().toISOString().split("T")[0],
        paymentMethod: "upi",
        recurring: false,
      });
      setQuickAmount("");
      setQuickPurpose("");
    } finally {
      setQuickAdding(false);
    }
  };

  const handleDeleteLedgerItem = async (item: typeof ledgerItems[0]) => {
    if (item.type === "income") {
      await deleteIncome(item.id);
    } else {
      await deleteExpense(item.id);
    }
  };

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground/95 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#FFC107]" />
            Company Ledger
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Corporate Financial Book · ₹ INR</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setCreatingInc(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-semibold hover:bg-green-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            + Add Income
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setCreatingExp(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bee-gradient text-[#111] text-sm font-semibold shadow-md"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            + Add Expense
          </motion.button>
        </div>
      </div>

      {/* Time Range Filter (Segmented control) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.01] border border-white/05 p-3 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#FFC107]/10 text-[#FFC107]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground/90">Time-period Scope</p>
            <p className="text-[10px] text-muted-foreground">Adjust display range for ledger analytics</p>
          </div>
        </div>
        <div className="flex bg-white/5 border border-white/05 rounded-xl p-0.5 self-end sm:self-center">
          {(["all", "year", "month", "week"] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 min-w-[64px] text-center cursor-pointer",
                timeRange === range
                  ? "bg-[#FFC107] text-[#111] font-extrabold shadow-sm shadow-[#FFC107]/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: Company Financial Overview (Top Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Income */}
        <div className="rounded-2xl p-5 stat-card-amber">
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Income</span>
          <p className="text-3xl font-bold tracking-tight text-green-400 mt-2 tabular-nums">
            ₹{currentMonthIncomeTotal.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">received {rangeLabel}</p>
        </div>

        {/* Total Expenses */}
        <div className="rounded-2xl p-5 stat-card-amber">
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Expenses</span>
          <p className="text-3xl font-bold tracking-tight text-amber-500 mt-2 tabular-nums">
            ₹{currentMonthExpenseTotal.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">paid {rangeLabel}</p>
        </div>

        {/* Net Flow */}
        <div className="rounded-2xl p-5 stat-card-amber">
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Net Flow</span>
          <p className={cn(
            "text-3xl font-bold tracking-tight mt-2 tabular-nums",
            currentMonthNetFlow > 0 ? "text-green-400" : currentMonthNetFlow < 0 ? "text-red-400" : "text-amber-500"
          )}>
            ₹{currentMonthNetFlow.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{timeRange === "all" ? "total" : timeRange} net balance</p>
        </div>
      </div>

      {/* SECTION 2: Money Flow Visualization (Pure CSS diagram) */}
      <div className="rounded-2xl p-5 glass space-y-4">
        <div>
          <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest">Financial Flow Diagram</span>
          <p className="text-[10px] text-muted-foreground mt-0.5">Click category bars below to filter transaction ledger</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-stretch relative">
          {/* Income Sources Column */}
          <div className="md:col-span-2 space-y-2 flex flex-col justify-center">
            <h4 className="text-xs font-bold text-green-400/90 border-b border-green-500/10 pb-1 flex items-center justify-between">
              <span>Income Sources</span>
              <span className="text-[10px] text-muted-foreground">{capitalizedRangeLabel}</span>
            </h4>
            {incomeCategorySums.length === 0 ? (
              <p className="text-[10px] text-muted-foreground py-2">No income logged.</p>
            ) : (
              incomeCategorySums.map(i => {
                const pct = currentMonthIncomeTotal > 0 ? (i.amount / currentMonthIncomeTotal) * 100 : 0;
                return (
                  <button
                    key={i.category}
                    onClick={() => setHighlightCategory(highlightCategory === i.category ? null : i.category)}
                    className={cn(
                      "w-full text-left p-2 rounded-xl transition-all border text-xs",
                      highlightCategory === i.category 
                        ? "bg-green-500/20 border-green-500/60" 
                        : "bg-white/[0.02] border-white/05 hover:bg-white/[0.04] hover:border-white/10"
                    )}
                  >
                    <div className="flex justify-between font-medium">
                      <span className="truncate">{i.category}</span>
                      <span className="font-bold">₹{i.amount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-1.5">
                      <div className="bg-green-400 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Central Pool Column */}
          <div className="md:col-span-3 flex flex-col items-center justify-center p-6 rounded-2xl bg-white/[0.02] border border-white/05 relative min-h-[140px]">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <Activity className="w-20 h-20 text-muted-foreground stroke-[0.5]" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Company Pool</span>
            <p className="text-2xl font-bold tracking-tight text-foreground mt-2 tabular-nums">
              ₹{(currentMonthIncomeTotal).toLocaleString("en-IN")}
            </p>
            <span className="text-[9px] text-muted-foreground mt-1">total inputs {rangeLabel}</span>
          </div>

          {/* Expenses Columns */}
          <div className="md:col-span-2 space-y-2 flex flex-col justify-center">
            <h4 className="text-xs font-bold text-amber-500 border-b border-white/05 pb-1 flex items-center justify-between">
              <span>Expenses</span>
              <span className="text-[10px] text-muted-foreground">{capitalizedRangeLabel}</span>
            </h4>
            {expenseCategorySums.length === 0 ? (
              <p className="text-[10px] text-muted-foreground py-2">No expenses logged.</p>
            ) : (
              expenseCategorySums.slice(0, 5).map(e => {
                const pct = currentMonthExpenseTotal > 0 ? (e.amount / currentMonthExpenseTotal) * 100 : 0;
                return (
                  <button
                    key={e.category}
                    onClick={() => setHighlightCategory(highlightCategory === e.category ? null : e.category)}
                    className={cn(
                      "w-full text-left p-2 rounded-xl transition-all border text-xs",
                      highlightCategory === e.category
                        ? "bg-amber-500/10 border-amber-500/40"
                        : "bg-white/[0.02] border-white/05 hover:bg-white/[0.04] hover:border-white/10"
                    )}
                  >
                    <div className="flex justify-between font-medium">
                      <span className="truncate capitalize">{e.category}</span>
                      <span className="font-bold">₹{e.amount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-1.5">
                      <div className="bg-[#FFC107] h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </button>
                );
              })
            )}
            {expenseCategorySums.length > 5 && (
              <p className="text-[10px] text-muted-foreground text-center">+ {expenseCategorySums.length - 5} more categories</p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: Category Breakdown & Trend Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Expenses pie chart */}
        <div className="rounded-2xl p-5 glass flex flex-col justify-between">
          <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest mb-3">Expenses Breakdown</span>
          {donutData.length === 0 ? (
            <p className="text-xs text-muted-foreground py-12 text-center">No expenses logged {rangeLabel}.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
              <div className="sm:col-span-3 h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={52}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={index} fill={donutColors[index]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                {donutData.map(({ name, value }, index) => {
                  const pct = currentMonthExpenseTotal > 0 ? Math.round((value / currentMonthExpenseTotal) * 100) : 0;
                  return (
                    <div key={name} className="flex flex-col">
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: donutColors[index] }} />
                          <span className="text-muted-foreground capitalize truncate">{name}</span>
                        </div>
                        <span className="font-semibold text-foreground/90 ml-1">₹{value.toLocaleString("en-IN")}</span>
                      </div>
                      <span className="text-[8px] text-muted-foreground/50 pl-3.5 mt-0.2">{pct}% of total</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Month-on-Month Trend BarChart */}
        <div className="rounded-2xl p-5 glass flex flex-col justify-between">
          <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest mb-3">Income vs Expenses Trend</span>
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 0, right: 0, bottom: 0, left: -25 }}>
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#888" }} />
                <YAxis tick={{ fontSize: 9, fill: "#888" }} />
                <Tooltip 
                  contentStyle={{ background: "#161616", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "10px" }}
                  labelStyle={{ color: "#888" }}
                />
                <Bar dataKey="Income" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Expenses" fill="#FFC107" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION 5: Unified Transaction Ledger */}
      <div className="rounded-2xl glass overflow-hidden">
        {/* Ledger controls */}
        <div className="px-5 py-4 border-b border-white/05 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-sm text-foreground/90">Transaction Ledger</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Chronological ledger registry</p>
          </div>
          
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative col-span-2 sm:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-8 pr-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none w-full sm:w-32 focus:border-[rgba(255,193,7,0.3)] transition-colors text-foreground"
              />
            </div>
            
            {/* Type selector */}
            <select value={filterType} onChange={e => setFilterType(e.target.value as any)}
              className="px-2 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground w-full">
              <option value="all">All Types</option>
              <option value="income">Income Only</option>
              <option value="expense">Expenses Only</option>
            </select>

            {/* Person selector */}
            <select value={filterPerson} onChange={e => setFilterPerson(e.target.value as any)}
              className="px-2 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground w-full">
              <option value="all">All People</option>
              {PERSONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            {/* Category Filter */}
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="px-2 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground capitalize w-full col-span-2 sm:col-span-1">
              <option value="all">All Categories</option>
              <optgroup label="Income" className="bg-[#161616]">
                {INC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="Expense" className="bg-[#161616]">
                {EXP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
            </select>
            
            {highlightCategory && (
              <button 
                onClick={() => setHighlightCategory(null)}
                className="text-[9px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-2 rounded-xl flex items-center gap-1 col-span-2 sm:col-span-1 justify-center"
              >
                Filtered: {highlightCategory} <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Add Row (Expense) */}
        <form onSubmit={handleQuickAdd} className="px-5 py-3 border-b border-white/05 bg-white/[0.01] flex flex-col md:flex-row md:items-center gap-3">
          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest whitespace-nowrap">Quick Add Expense:</span>
          
          <div className="grid grid-cols-2 md:flex md:flex-1 gap-2.5 items-center w-full">
            <div className="relative col-span-1 md:max-w-[120px] w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-semibold">₹</span>
              <input
                type="number"
                value={quickAmount}
                onChange={e => setQuickAmount(e.target.value)}
                placeholder="Amount"
                required
                className="w-full pl-6 pr-2 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground focus:border-[rgba(255,193,7,0.3)]"
              />
            </div>
            
            <input
              value={quickPurpose}
              onChange={e => setQuickPurpose(e.target.value)}
              placeholder="Purpose (e.g., Servers)"
              required
              className="col-span-1 md:flex-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground focus:border-[rgba(255,193,7,0.3)]"
            />
            
            <select
              value={quickCat}
              onChange={e => setQuickCat(e.target.value as ExpenseCategory)}
              className="col-span-1 w-full px-2 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground capitalize"
            >
              {EXP_CATEGORIES.map(c => <option key={c} value={c} className="bg-[#161616] text-[#f5f5f5] capitalize">{c}</option>)}
            </select>
            
            <select
              value={quickPerson}
              onChange={e => setQuickPerson(e.target.value as Person)}
              className="col-span-1 w-full px-2 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
            >
              {PERSONS.map(p => <option key={p} value={p} className="bg-[#161616] text-[#f5f5f5]">{p}</option>)}
            </select>
          </div>
          
          <motion.button
            whileTap={{ scale: 0.94 }}
            type="submit"
            disabled={quickAdding}
            className="w-full md:w-auto px-4 py-2 rounded-xl bee-gradient text-[#111] hover:opacity-90 disabled:opacity-50 flex-shrink-0 flex items-center justify-center gap-1.5 font-semibold text-xs"
          >
            {quickAdding ? (
              <div className="w-3.5 h-3.5 border border-[#111]/30 border-t-[#111] rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                <span>Add Expense</span>
              </>
            )}
          </motion.button>
        </form>

        {/* Ledger List Grouped By Date */}
        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
          </div>
        ) : groupedLedger.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">No transactions found in this range.</div>
        ) : (
          <div className="p-4 space-y-4">
            {groupedLedger.map(group => (
              <div key={group.title} className="space-y-1.5">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">{group.title}</h4>
                <div className="space-y-1">
                  {group.items.map(item => (
                    <div
                      key={`${item.type}-${item.id}`}
                      onClick={() => item.type === "income" ? setEditInc(item.rawItem) : setEditExp(item.rawItem)}
                      className="group flex items-center justify-between px-4 py-3 bg-white/[0.02] border border-white/[0.04] rounded-xl hover:bg-white/[0.04] cursor-pointer transition-all text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Type badge */}
                        <span className={cn(
                          "px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[9px] flex-shrink-0",
                          item.type === "income" ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-[#FFC107]"
                        )}>
                          {item.type}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground/90 truncate pr-2">
                            {item.sourceOrPurpose}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground text-[10px]">
                            <span className="capitalize">{item.category}</span>
                            <span>·</span>
                            <span>{item.person}</span>
                            <span className="hidden sm:inline">·</span>
                            <span className="hidden sm:inline uppercase">{item.method}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "text-sm font-bold tabular-nums",
                          item.type === "income" ? "text-green-400" : "text-foreground/95"
                        )}>
                          {item.type === "income" ? "+" : "-"} ₹{item.amount.toLocaleString("en-IN")}
                        </span>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity max-md:hidden" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => item.type === "income" ? setEditInc(item.rawItem) : setEditExp(item.rawItem)}
                            className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={async () => { if(confirm("Delete this ledger transaction?")) await handleDeleteLedgerItem(item); }}
                            className="p-1 rounded hover:bg-red-500/15 text-muted-foreground hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals Container */}
      <AnimatePresence>
        {creatingExp && (
          <ExpenseModal
            expense={null}
            onClose={() => setCreatingExp(false)}
          />
        )}
        {editExp && (
          <ExpenseModal
            expense={editExp}
            onClose={() => setEditExp(null)}
          />
        )}
        {creatingInc && (
          <IncomeModal
            incomeItem={null}
            onClose={() => setCreatingInc(false)}
          />
        )}
        {editInc && (
          <IncomeModal
            incomeItem={editInc}
            onClose={() => setEditInc(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
