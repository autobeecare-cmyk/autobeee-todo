"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Search,
  Trash2,
  Edit3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  ArrowRight,
  Activity,
  Package,
  Building2,
  Repeat,
  Megaphone,
  Car,
  Fuel,
  Utensils,
  Users,
  Code,
  Laptop,
  Layers,
  Briefcase,
  SlidersHorizontal,
  ChevronRight,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  parseISO,
  isToday as fnsIsToday,
  isYesterday as fnsIsYesterday,
  isThisWeek as fnsIsThisWeek,
} from "date-fns";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useIncomeStore } from "@/store/useIncomeStore";
import { usePartnerStore } from "@/store/usePartnerStore";
import { createExpense, deleteExpense } from "@/lib/supabase/expenses";
import { createIncome, updateIncome, deleteIncome } from "@/lib/supabase/income";
import { FounderLedgerSection } from "@/components/money/FounderLedgerSection";
import { SharedExpenseModal } from "@/components/money/SharedExpenseModal";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  Expense,
  Income,
  Person,
  ExpenseCategory,
  IncomeCategory,
  PaymentMethod,
  IncomePaymentMethod,
} from "@/lib/types";

const PERSONS: Person[] = ["Sourabh", "Asher", "Subin"];
const EXP_CATEGORIES: ExpenseCategory[] = [
  "equipment",
  "operations",
  "subscriptions",
  "software",
  "development",
  "marketing",
  "travel",
  "fuel",
  "food",
  "meetings",
  "misc",
];
const INC_CATEGORIES: IncomeCategory[] = [
  "Client",
  "Investment",
  "Grant",
  "Loan",
  "Revenue",
  "Other",
];

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "upi", "card", "bank"];
const INC_PAYMENT_METHODS: IncomePaymentMethod[] = ["Cash", "UPI", "Card", "Bank transfer"];

// Category icon mapper
function getCategoryIcon(category: string) {
  const c = category.toLowerCase();
  switch (c) {
    case "equipment":
      return <Package className="w-4 h-4 text-amber-400" />;
    case "operations":
      return <Building2 className="w-4 h-4 text-lime-400" />;
    case "subscriptions":
      return <Repeat className="w-4 h-4 text-pink-400" />;
    case "software":
      return <Laptop className="w-4 h-4 text-purple-400" />;
    case "development":
      return <Code className="w-4 h-4 text-teal-400" />;
    case "marketing":
      return <Megaphone className="w-4 h-4 text-blue-400" />;
    case "travel":
      return <Car className="w-4 h-4 text-indigo-400" />;
    case "fuel":
      return <Fuel className="w-4 h-4 text-orange-400" />;
    case "food":
      return <Utensils className="w-4 h-4 text-green-400" />;
    case "meetings":
      return <Users className="w-4 h-4 text-cyan-400" />;
    case "client":
    case "revenue":
      return <Briefcase className="w-4 h-4 text-emerald-400" />;
    case "investment":
    case "grant":
      return <TrendingUp className="w-4 h-4 text-blue-400" />;
    default:
      return <Layers className="w-4 h-4 text-muted-foreground" />;
  }
}

// Income Modal
function IncomeModal({
  incomeItem,
  onClose,
}: {
  incomeItem: Income | null;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(incomeItem?.amount?.toString() ?? "");
  const [source, setSource] = useState(incomeItem?.source ?? "");
  const [category, setCategory] = useState<IncomeCategory>(incomeItem?.category ?? "Client");
  const [receivedBy, setReceivedBy] = useState<Person>(incomeItem?.receivedBy ?? "Sourabh");
  const [date, setDate] = useState(incomeItem?.date ?? new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState<IncomePaymentMethod>(
    incomeItem?.paymentMethod ?? "UPI"
  );
  const [saving, setSaving] = useState(false);

  const { partners } = usePartnerStore();
  const joinedPartners = useMemo(
    () => partners.filter((p) => p.pipeline_status === "Joined"),
    [partners]
  );

  const [relatedPartnerId, setRelatedPartnerId] = useState(incomeItem?.relatedPartnerId ?? "");
  const [commissionRate, setCommissionRate] = useState(
    incomeItem?.commissionRate?.toString() ?? ""
  );

  const handlePartnerChange = (partnerId: string) => {
    setRelatedPartnerId(partnerId);
    if (partnerId) {
      const partner = joinedPartners.find((p) => p.id === partnerId);
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
      amount: parseFloat(amount),
      source,
      category,
      receivedBy,
      date,
      paymentMethod: method,
      notes: "",
      relatedPartnerId: relatedPartnerId || undefined,
      commissionRate: commissionRate ? parseFloat(commissionRate) : undefined,
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center sm:px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 bg-[#141414] border border-white/10 flex flex-col gap-4 max-h-[95vh] overflow-y-auto no-scrollbar shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base text-foreground/90">
            {incomeItem ? "Edit Income" : "Add Company Income"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
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
              className="w-full pl-8 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-lg font-bold outline-none focus:border-[#FFC107]/50 transition-colors text-foreground"
            />
          </div>

          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Source (e.g. Client payment — ABC Car Wash)"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-[#FFC107]/50 transition-colors text-foreground"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as IncomeCategory)}
                className="w-full px-3 py-2 rounded-xl bg-[#1a1a1a] border border-white/10 text-sm outline-none text-foreground select-none"
              >
                {INC_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-[#1a1a1a] text-[#f5f5f5] capitalize">
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Received by</label>
              <select
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value as Person)}
                className="w-full px-3 py-2 rounded-xl bg-[#1a1a1a] border border-white/10 text-sm outline-none text-foreground"
              >
                {PERSONS.map((p) => (
                  <option key={p} value={p} className="bg-[#1a1a1a] text-[#f5f5f5]">
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#1a1a1a] border border-white/10 text-sm outline-none text-foreground"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Payment Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as IncomePaymentMethod)}
                className="w-full px-3 py-2 rounded-xl bg-[#1a1a1a] border border-white/10 text-sm outline-none text-foreground"
              >
                {INC_PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m} className="bg-[#1a1a1a] text-[#f5f5f5]">
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1.5 block">
                From Partner (Optional)
              </label>
              <select
                value={relatedPartnerId}
                onChange={(e) => handlePartnerChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#1a1a1a] border border-white/10 text-sm outline-none text-foreground cursor-pointer"
              >
                <option value="" className="bg-[#1a1a1a]">
                  None
                </option>
                {joinedPartners.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#1a1a1a]">
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
              onClick={async () => {
                await deleteIncome(incomeItem.id);
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20 transition-colors"
            >
              Delete
            </button>
          )}
          <button
            onClick={save}
            disabled={saving || !amount || !source}
            className="flex-1 py-2.5 rounded-xl bee-gradient text-[#111] font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-[#111]/30 border-t-[#111] rounded-full animate-spin" />
            ) : incomeItem ? (
              "Save Income"
            ) : (
              "Add Income"
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ──

export default function MoneyPage() {
  const { expenses, loading: expLoading } = useExpenseStore();
  const { income, loading: incLoading } = useIncomeStore();
  const loading = expLoading || incLoading;

  const [editExp, setEditExp] = useState<Expense | null>(null);
  const [editInc, setEditInc] = useState<Income | null>(null);
  const [creatingExp, setCreatingExp] = useState(false);
  const [creatingInc, setCreatingInc] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterPerson, setFilterPerson] = useState<Person | "all">("all");
  const [filterCategory, setFilterCategory] = useState<string | "all">("all");
  const [highlightCategory, setHighlightCategory] = useState<string | null>(null);

  // Quick add inline expense state
  const [quickAmount, setQuickAmount] = useState("");
  const [quickPurpose, setQuickPurpose] = useState("");
  const [quickCat, setQuickCat] = useState<ExpenseCategory>("misc");
  const [quickPerson, setQuickPerson] = useState<Person>("Sourabh");
  const [quickAdding, setQuickAdding] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const now = new Date();

  // Time Range Filter State
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
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
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
    return income.filter((i) => isDateInSelectedRange(i.date));
  }, [income, dateRange]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => isDateInSelectedRange(e.date));
  }, [expenses, dateRange]);

  // All-time and Month totals
  const allTimeExpenseTotal = useMemo(() => {
    return expenses.reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const currentMonthExpenseTotal = useMemo(() => {
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return expenses
      .filter((e) => {
        try {
          return isWithinInterval(parseISO(e.date), { start, end });
        } catch {
          return false;
        }
      })
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses, now]);

  const displayedExpenseTotal = useMemo(() => {
    return filteredExpenses.reduce((s, e) => s + e.amount, 0);
  }, [filteredExpenses]);

  const displayedIncomeTotal = useMemo(() => {
    return filteredIncome.reduce((s, i) => s + i.amount, 0);
  }, [filteredIncome]);

  const displayedNetFlow = displayedIncomeTotal - displayedExpenseTotal;

  // Range label
  const rangeLabel = {
    all: "All time",
    year: "This year",
    month: "This month",
    week: "This week",
  }[timeRange];

  // Category sums for Expense Breakdown
  const expenseCategorySums = useMemo(() => {
    const map: Record<string, number> = {};
    const dataset = filteredExpenses.length > 0 ? filteredExpenses : expenses;
    dataset.forEach((e) => {
      map[e.category] = (map[e.category] ?? 0) + e.amount;
    });
    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, expenses]);

  const totalCategoryExpenses = useMemo(() => {
    return expenseCategorySums.reduce((sum, item) => sum + item.amount, 0);
  }, [expenseCategorySums]);

  // Spending Bar Chart Data (Month-on-Month Trend)
  const barChartData = useMemo(() => {
    return [3, 2, 1, 0].map((monthsAgo) => {
      const d = new Date();
      d.setMonth(d.getMonth() - monthsAgo);
      const start = startOfMonth(d);
      const end = endOfMonth(d);

      const expTotal = expenses
        .filter((e) => {
          try {
            return isWithinInterval(parseISO(e.date), { start, end });
          } catch {
            return false;
          }
        })
        .reduce((sum, e) => sum + e.amount, 0);

      const incTotal = income
        .filter((i) => {
          try {
            return isWithinInterval(parseISO(i.date), { start, end });
          } catch {
            return false;
          }
        })
        .reduce((sum, i) => sum + i.amount, 0);

      return {
        period: format(d, "MMM"),
        Expenses: expTotal,
        Income: incTotal,
      };
    });
  }, [expenses, income]);

  // Unified Chronological Ledger
  const ledgerItems = useMemo(() => {
    const incItems = income.map((i) => ({
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
    const expItems = expenses.map((e) => ({
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
    items = items.filter((x) => isDateInSelectedRange(x.date));
    if (filterType !== "all") {
      items = items.filter((x) => x.type === filterType);
    }
    if (filterPerson !== "all") {
      items = items.filter((x) => x.person === filterPerson);
    }
    if (filterCategory !== "all") {
      items = items.filter((x) => x.category === filterCategory);
    }
    if (highlightCategory) {
      items = items.filter((x) => x.category === highlightCategory);
    }
    if (search) {
      items = items.filter((x) =>
        x.sourceOrPurpose.toLowerCase().includes(search.toLowerCase())
      );
    }
    return items;
  }, [
    ledgerItems,
    filterType,
    filterPerson,
    filterCategory,
    highlightCategory,
    search,
    dateRange,
  ]);

  const groupedLedger = useMemo(() => {
    const groups = [
      { title: "Today", items: [] as typeof filteredLedger },
      { title: "Yesterday", items: [] as typeof filteredLedger },
      { title: "This Week", items: [] as typeof filteredLedger },
      { title: "Earlier", items: [] as typeof filteredLedger },
    ];

    filteredLedger.forEach((item) => {
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

    return groups.filter((g) => g.items.length > 0);
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
      setShowQuickAdd(false);
    } finally {
      setQuickAdding(false);
    }
  };

  const handleDeleteLedgerItem = async (item: (typeof ledgerItems)[0]) => {
    if (item.type === "income") {
      await deleteIncome(item.id);
    } else {
      await deleteExpense(item.id);
    }
  };

  return (
    <div className="px-3.5 sm:px-6 lg:px-8 py-5 sm:py-6 max-w-[1560px] w-full mx-auto space-y-5 sm:space-y-6">
      {/* ── TOP HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <span>Company Money</span>
            <span className="inline-block w-2 h-2 rounded-full bg-[#FFC107] animate-pulse" />
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Corporate Financial Book · ₹ INR
          </p>
        </div>

        {/* Time Scope Segmented Control & + Add Action */}
        <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-between sm:justify-end">
          {/* Segmented Control */}
          <div className="flex bg-white/[0.04] border border-white/[0.08] rounded-xl p-1 backdrop-blur-md">
            {(["all", "year", "month", "week"] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer",
                  timeRange === range
                    ? "bg-[#FFC107] text-[#111] shadow-md shadow-[#FFC107]/20 font-extrabold"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                {range}
              </button>
            ))}
          </div>

          {/* + Add Trigger */}
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bee-gradient text-[#111] text-xs font-bold shadow-lg shadow-[#FFC107]/15 cursor-pointer"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              <span>Add</span>
            </motion.button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {showAddMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowAddMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-44 z-50 rounded-2xl bg-[#161616] border border-white/10 p-1.5 shadow-2xl space-y-1"
                  >
                    <button
                      onClick={() => {
                        setShowAddMenu(false);
                        setCreatingExp(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-white/5 text-left transition-colors cursor-pointer"
                    >
                      <div className="w-5 h-5 rounded-lg bg-amber-500/15 text-[#FFC107] flex items-center justify-center">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                      <span>+ Expense</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowAddMenu(false);
                        setCreatingInc(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-white/5 text-left transition-colors cursor-pointer"
                    >
                      <div className="w-5 h-5 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                        <TrendingUp className="w-3.5 h-3.5" />
                      </div>
                      <span>+ Income</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── RESPONSIVE GRID LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* ── LEFT COLUMN (Main: Spending Hero, Graph, Recent Expenses) ── */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-5 w-full">
          {/* 1. PRIMARY FINANCIAL CARD */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative overflow-hidden rounded-[22px] bg-[#121212]/95 backdrop-blur-xl border border-white/[0.09] p-5 sm:p-6 shadow-2xl"
          >
            {/* Subtle glow background */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#FFC107]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative space-y-4">
              {/* Header pill */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-widest text-[#FFC107] uppercase">
                  COMPANY SPENDING
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-muted-foreground font-mono font-medium">
                  {rangeLabel}
                </span>
              </div>

              {/* Main Spending Figure */}
              <div>
                <div className="text-3xl sm:text-4xl font-black tracking-tight text-foreground font-mono">
                  ₹{displayedExpenseTotal.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total company expenses {rangeLabel.toLowerCase()}
                </p>
              </div>

              {/* Comparative Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-white/[0.06]">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-[10px] font-medium text-muted-foreground block">
                    This month
                  </span>
                  <span className="text-sm sm:text-base font-bold text-foreground font-mono mt-0.5 block">
                    ₹{currentMonthExpenseTotal.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-[10px] font-medium text-muted-foreground block">
                    All time
                  </span>
                  <span className="text-sm sm:text-base font-bold text-foreground font-mono mt-0.5 block">
                    ₹{allTimeExpenseTotal.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-[10px] font-medium text-muted-foreground block">
                    Net Flow
                  </span>
                  <span
                    className={cn(
                      "text-sm sm:text-base font-bold font-mono mt-0.5 block",
                      displayedNetFlow >= 0 ? "text-emerald-400" : "text-amber-400"
                    )}
                  >
                    {displayedNetFlow >= 0 ? "+" : ""}₹{displayedNetFlow.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── MOBILE-ONLY INSERTION: FOUNDER CONTRIBUTIONS & SETTLEMENTS ── */}
          {/* On mobile, founder sections display here right below company spending */}
          <div className="block lg:hidden space-y-4">
            <FounderLedgerSection />
          </div>

          {/* 2. SPENDING VISUALIZATION (BAR GRAPH) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="rounded-[22px] bg-[#121212]/90 backdrop-blur-xl border border-white/[0.08] p-5 sm:p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-foreground uppercase tracking-wider">
                  Spending Trend
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  Month-on-month expense & income overview
                </p>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#FFC107]" />
                  <span className="text-muted-foreground">Expenses</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                  <span className="text-muted-foreground">Income</span>
                </div>
              </div>
            </div>

            <div className="h-[170px] sm:h-[190px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
                  barGap={6}
                >
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11, fill: "#888" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#666" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                    contentStyle={{
                      background: "#161616",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      fontSize: "11px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                    }}
                    labelStyle={{ color: "#aaa", fontWeight: "bold" }}
                  />
                  <Bar dataKey="Expenses" fill="#FFC107" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="Income" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* ── MOBILE-ONLY INSERTION: EXPENSE BREAKDOWN ── */}
          <div className="block lg:hidden">
            <ExpenseBreakdownCard
              expenseCategorySums={expenseCategorySums}
              totalCategoryExpenses={totalCategoryExpenses}
              highlightCategory={highlightCategory}
              setHighlightCategory={setHighlightCategory}
            />
          </div>

          {/* 3. RECENT EXPENSES & TRANSACTIONS */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="rounded-[22px] bg-[#121212]/90 backdrop-blur-xl border border-white/[0.08] overflow-hidden shadow-xl"
          >
            {/* Header & Controls */}
            <div className="p-4 sm:p-5 border-b border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-foreground uppercase tracking-wider">
                    Recent Expenses
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Chronological financial records
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-foreground hover:bg-white/[0.08] transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#FFC107]" />
                  <span>Quick Add</span>
                </button>
              </div>

              {/* Quick Add Inline Form */}
              <AnimatePresence>
                {showQuickAdd && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleQuickAdd}
                    className="pt-2 space-y-2 overflow-hidden border-t border-white/[0.06]"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="relative col-span-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">
                          ₹
                        </span>
                        <input
                          type="number"
                          value={quickAmount}
                          onChange={(e) => setQuickAmount(e.target.value)}
                          placeholder="Amount"
                          required
                          className="w-full pl-6 pr-2 py-2 rounded-xl bg-white/5 border border-white/10 text-xs outline-none text-foreground focus:border-[#FFC107]/50"
                        />
                      </div>
                      <input
                        value={quickPurpose}
                        onChange={(e) => setQuickPurpose(e.target.value)}
                        placeholder="Purpose (e.g. Domain)"
                        required
                        className="col-span-1 sm:col-span-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs outline-none text-foreground focus:border-[#FFC107]/50"
                      />
                      <select
                        value={quickCat}
                        onChange={(e) => setQuickCat(e.target.value as ExpenseCategory)}
                        className="col-span-1 px-2 py-2 rounded-xl bg-[#1a1a1a] border border-white/10 text-xs outline-none text-foreground capitalize"
                      >
                        {EXP_CATEGORIES.map((c) => (
                          <option key={c} value={c} className="bg-[#1a1a1a] text-[#f5f5f5] capitalize">
                            {c}
                          </option>
                        ))}
                      </select>
                      <select
                        value={quickPerson}
                        onChange={(e) => setQuickPerson(e.target.value as Person)}
                        className="col-span-1 px-2 py-2 rounded-xl bg-[#1a1a1a] border border-white/10 text-xs outline-none text-foreground"
                      >
                        {PERSONS.map((p) => (
                          <option key={p} value={p} className="bg-[#1a1a1a] text-[#f5f5f5]">
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowQuickAdd(false)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={quickAdding || !quickAmount || !quickPurpose}
                        className="px-3.5 py-1.5 rounded-lg bee-gradient text-[#111] font-bold text-xs disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {quickAdding ? (
                          <div className="w-3 h-3 border-2 border-[#111]/30 border-t-[#111] rounded-full animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Search & Filter Bar */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-1">
                <div className="relative flex-1 min-w-[140px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search expenses..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs outline-none focus:border-[#FFC107]/40 text-foreground"
                  />
                </div>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl bg-[#1a1a1a] border border-white/10 text-xs outline-none text-foreground"
                >
                  <option value="all">All Types</option>
                  <option value="expense">Expenses Only</option>
                  <option value="income">Income Only</option>
                </select>

                <select
                  value={filterPerson}
                  onChange={(e) => setFilterPerson(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl bg-[#1a1a1a] border border-white/10 text-xs outline-none text-foreground"
                >
                  <option value="all">All Founders</option>
                  {PERSONS.map((p) => (
                    <option key={p} value={p} className="bg-[#1a1a1a] text-[#f5f5f5]">
                      {p}
                    </option>
                  ))}
                </select>

                {highlightCategory && (
                  <button
                    onClick={() => setHighlightCategory(null)}
                    className="text-[10px] font-bold text-[#FFC107] bg-[#FFC107]/10 border border-[#FFC107]/20 px-2 py-1.5 rounded-xl flex items-center gap-1"
                  >
                    <span>{highlightCategory}</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Transactions List */}
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : groupedLedger.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs">
                No financial transactions found for this selection.
              </div>
            ) : (
              <div className="p-3 sm:p-4 space-y-3.5">
                {groupedLedger.map((group) => (
                  <div key={group.title} className="space-y-1.5">
                    <h4 className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider px-1">
                      {group.title}
                    </h4>
                    <div className="space-y-1">
                      {group.items.map((item) => (
                        <div
                          key={`${item.type}-${item.id}`}
                          onClick={() =>
                            item.type === "income"
                              ? setEditInc(item.rawItem as Income)
                              : setEditExp(item.rawItem as Expense)
                          }
                          className="group flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl hover:bg-white/[0.05] hover:border-white/10 cursor-pointer transition-all text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Icon badge */}
                            <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                              {getCategoryIcon(item.category)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm font-semibold text-foreground/95 truncate pr-2">
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

                          <div className="flex items-center gap-3 shrink-0">
                            <span
                              className={cn(
                                "text-xs sm:text-sm font-bold font-mono tabular-nums",
                                item.type === "income" ? "text-emerald-400" : "text-foreground"
                              )}
                            >
                              {item.type === "income" ? "+" : "-"}₹
                              {item.amount.toLocaleString("en-IN")}
                            </span>

                            <div
                              className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity max-sm:hidden"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() =>
                                  item.type === "income"
                                    ? setEditInc(item.rawItem as Income)
                                    : setEditExp(item.rawItem as Expense)
                                }
                                className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm("Delete this transaction?")) {
                                    await handleDeleteLedgerItem(item);
                                  }
                                }}
                                className="p-1 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400"
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
          </motion.div>
        </div>

        {/* ── RIGHT COLUMN (Desktop Sidebar: Founder Contributions, Settlements, Debts, Breakdown) ── */}
        <div className="hidden lg:block lg:col-span-5 space-y-5 w-full">
          {/* Founder Ledger & Settlements */}
          <FounderLedgerSection />

          {/* Expense Breakdown */}
          <ExpenseBreakdownCard
            expenseCategorySums={expenseCategorySums}
            totalCategoryExpenses={totalCategoryExpenses}
            highlightCategory={highlightCategory}
            setHighlightCategory={setHighlightCategory}
          />
        </div>
      </div>

      {/* ── MODALS CONTAINER ── */}
      <AnimatePresence>
        {creatingExp && (
          <SharedExpenseModal expense={null} onClose={() => setCreatingExp(false)} />
        )}
        {editExp && <SharedExpenseModal expense={editExp} onClose={() => setEditExp(null)} />}
        {creatingInc && <IncomeModal incomeItem={null} onClose={() => setCreatingInc(false)} />}
        {editInc && <IncomeModal incomeItem={editInc} onClose={() => setEditInc(null)} />}
      </AnimatePresence>
    </div>
  );
}

// ── EXPENSE BREAKDOWN CARD COMPONENT ──
function ExpenseBreakdownCard({
  expenseCategorySums,
  totalCategoryExpenses,
  highlightCategory,
  setHighlightCategory,
}: {
  expenseCategorySums: { category: string; amount: number }[];
  totalCategoryExpenses: number;
  highlightCategory: string | null;
  setHighlightCategory: (cat: string | null) => void;
}) {
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
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-foreground uppercase tracking-wider">
              Expense Breakdown
            </h3>
            <p className="text-[10px] text-muted-foreground">Category allocation</p>
          </div>
        </div>
        {highlightCategory && (
          <button
            onClick={() => setHighlightCategory(null)}
            className="text-[10px] text-amber-400 hover:underline font-medium"
          >
            Clear filter
          </button>
        )}
      </div>

      {expenseCategorySums.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No expenses recorded.</p>
      ) : (
        <div className="space-y-2.5">
          {expenseCategorySums.slice(0, 6).map((item) => {
            const pct =
              totalCategoryExpenses > 0
                ? Math.round((item.amount / totalCategoryExpenses) * 100)
                : 0;
            const isSelected = highlightCategory === item.category;

            return (
              <button
                key={item.category}
                type="button"
                onClick={() =>
                  setHighlightCategory(isSelected ? null : item.category)
                }
                className={cn(
                  "w-full text-left p-2 rounded-xl transition-all border text-xs cursor-pointer",
                  isSelected
                    ? "bg-[#FFC107]/10 border-[#FFC107]/40 ring-1 ring-[#FFC107]/30"
                    : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04] hover:border-white/10"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(item.category)}
                    <span className="font-semibold text-foreground/90 capitalize">
                      {item.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{pct}%</span>
                    <span className="font-bold text-foreground font-mono tabular-nums">
                      ₹{item.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="w-full bg-white/[0.04] h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-gradient-to-r from-[#FFC107] to-[#FFD54F] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(4, pct)}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
