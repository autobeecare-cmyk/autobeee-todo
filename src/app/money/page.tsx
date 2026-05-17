"use client";
// src/app/money/page.tsx — Money Tracker
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Search, Trash2, Edit3, TrendingUp, TrendingDown, DollarSign
} from "lucide-react";
import {
  PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from "recharts";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  isWithinInterval, parseISO, subMonths
} from "date-fns";
import { useExpenseStore } from "@/store/useExpenseStore";
import { createExpense, updateExpense, deleteExpense } from "@/lib/firestore/expenses";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Expense, Person, ExpenseCategory, PaymentMethod } from "@/lib/types";

const PERSONS: Person[] = ["Sourabh", "Asher", "Subin", "All"];
const CATEGORIES: ExpenseCategory[] = [
  "fuel","travel","marketing","food","meetings",
  "software","subscriptions","development","equipment","operations","misc"
];
const PAYMENT_METHODS: PaymentMethod[] = ["cash","upi","card","bank"];

const CAT_COLORS: Record<string, string> = {
  fuel: "#f97316", travel: "#6366f1", marketing: "#FFC107", food: "#22c55e",
  meetings: "#06b6d4", software: "#8b5cf6", subscriptions: "#ec4899",
  development: "#14b8a6", equipment: "#f59e0b", operations: "#84cc16", misc: "#6b7280",
};

const PERSON_COLOR: Record<string, string> = {
  Sourabh: "#FFC107", Asher: "#6366f1", Subin: "#22c55e",
};

function ExpenseModal({ expense, onClose }: { expense: Expense | null; onClose: () => void }) {
  const [amount, setAmount] = useState(expense?.amount?.toString() ?? "");
  const [purpose, setPurpose] = useState(expense?.purpose ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "misc");
  const [person, setPerson] = useState<Person>(expense?.person ?? "Sourabh");
  const [date, setDate] = useState(expense?.date ?? new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [method, setMethod] = useState<PaymentMethod>(expense?.paymentMethod ?? "upi");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!amount || !purpose) return;
    setSaving(true);
    const data = {
      amount: parseFloat(amount), purpose, category, person, date,
      notes, paymentMethod: method, recurring: false,
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
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 space-y-4"
        style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.09)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{expense ? "Edit Expense" : "Add Expense"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
          <input
            autoFocus type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="0"
            className="w-full pl-8 pr-4 py-3 rounded-xl bg-white/5 border border-white/08 text-lg font-semibold outline-none focus:border-[rgba(255,193,7,0.4)] transition-colors"
          />
        </div>

        <input
          value={purpose} onChange={e => setPurpose(e.target.value)}
          placeholder="Purpose (e.g. Google Ads)"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/08 text-sm outline-none focus:border-[rgba(255,193,7,0.4)] transition-colors"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm outline-none text-foreground">
              {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#161616] text-[#f5f5f5] capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Spent by</label>
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
            <label className="text-xs text-muted-foreground mb-1.5 block">Payment</label>
            <select value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm outline-none text-foreground capitalize">
              {PAYMENT_METHODS.map(m => <option key={m} value={m} className="bg-[#161616] text-[#f5f5f5] capitalize">{m.toUpperCase()}</option>)}
            </select>
          </div>
        </div>

        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Notes (optional)" rows={2}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/08 text-sm outline-none resize-none"
        />

        <div className="flex gap-3">
          {expense && (
            <button
              onClick={async () => { await deleteExpense(expense.id); onClose(); }}
              className="px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-sm"
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

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl px-3 py-2 text-xs" style={{ background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.1)" }}>
        <p className="font-semibold">₹{payload[0].value?.toLocaleString("en-IN")}</p>
      </div>
    );
  }
  return null;
};

export default function MoneyPage() {
  const { expenses, loading } = useExpenseStore();
  const [editExp, setEditExp] = useState<Expense | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [filterPerson, setFilterPerson] = useState<Person | "all">("all");
  const [filterCat, setFilterCat] = useState<ExpenseCategory | "all">("all");

  const now = new Date();

  const monthExpenses = useMemo(() =>
    expenses.filter(e => isWithinInterval(parseISO(e.date), { start: startOfMonth(now), end: endOfMonth(now) })),
    [expenses]
  );

  const weekExpenses = useMemo(() =>
    expenses.filter(e => isWithinInterval(parseISO(e.date), { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) })),
    [expenses]
  );

  const todayExpenses = useMemo(() =>
    expenses.filter(e => e.date === format(now, "yyyy-MM-dd")),
    [expenses]
  );

  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const weekTotal = weekExpenses.reduce((s, e) => s + e.amount, 0);
  const todayTotal = todayExpenses.reduce((s, e) => s + e.amount, 0);

  // Category breakdown
  const catData = useMemo(() => {
    const map: Record<string, number> = {};
    monthExpenses.forEach(e => { map[e.category] = (map[e.category] ?? 0) + e.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [monthExpenses]);

  // Person breakdown
  const personData = useMemo(() => {
    const map: Record<string, number> = {};
    monthExpenses.forEach(e => { map[e.person] = (map[e.person] ?? 0) + e.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [monthExpenses]);

  // Trend last 30 days
  const trendData = useMemo(() => {
    const days: { date: string; total: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const ds = format(d, "yyyy-MM-dd");
      const total = expenses.filter(e => e.date === ds).reduce((s, e) => s + e.amount, 0);
      days.push({ date: format(d, "d MMM"), total });
    }
    return days;
  }, [expenses]);

  // Monthly comparison (last 3 months)
  const monthlyData = useMemo(() => {
    return [0, 1, 2].map(i => {
      const month = subMonths(now, 2 - i);
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const total = expenses
        .filter(e => isWithinInterval(parseISO(e.date), { start, end }))
        .reduce((s, e) => s + e.amount, 0);
      return { name: format(month, "MMM"), total };
    });
  }, [expenses]);

  const filtered = useMemo(() => {
    let e = expenses;
    if (search) e = e.filter(x => x.purpose.toLowerCase().includes(search.toLowerCase()));
    if (filterPerson !== "all") e = e.filter(x => x.person === filterPerson);
    if (filterCat !== "all") e = e.filter(x => x.category === filterCat);
    return e;
  }, [expenses, search, filterPerson, filterCat]);

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Money Tracker</h1>
          <p className="text-xs text-muted-foreground mt-0.5">₹ INR · {new Date().getFullYear()}</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bee-gradient text-[#111] text-sm font-semibold"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Add Expense
        </motion.button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Today", value: todayTotal, icon: DollarSign },
          { label: "This Week", value: weekTotal, icon: TrendingUp },
          { label: "This Month", value: monthTotal, icon: TrendingDown },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl p-4 bg-[var(--card)] border border-[var(--border)]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="text-xl font-bold text-[#FFC107]">₹{value.toLocaleString("en-IN")}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      {!loading && monthExpenses.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Trend */}
          <div className="lg:col-span-2 rounded-2xl p-5 bg-[var(--card)] border border-[var(--border)]">
            <h3 className="text-sm font-semibold mb-4">30-Day Spending Trend</h3>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={trendData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFC107" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FFC107" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#888" }} interval={6} />
                <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total" stroke="#FFC107" fill="url(#grad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Category pie */}
          <div className="rounded-2xl p-5 bg-[var(--card)] border border-[var(--border)]">
            <h3 className="text-sm font-semibold mb-3">By Category</h3>
            {catData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={catData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value">
                      {catData.map((entry, i) => (
                        <Cell key={i} fill={CAT_COLORS[entry.name] ?? "#6b7280"} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {catData.slice(0, 4).map(({ name, value }) => (
                    <div key={name} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: CAT_COLORS[name] ?? "#6b7280" }} />
                        <span className="text-[10px] text-muted-foreground capitalize">{name}</span>
                      </div>
                      <span className="text-[10px] font-medium">₹{value.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No data this month</p>
            )}
          </div>

          {/* Monthly comparison */}
          <div className="rounded-2xl p-5 bg-[var(--card)] border border-[var(--border)]">
            <h3 className="text-sm font-semibold mb-4">Monthly Comparison</h3>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} />
                <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" fill="#FFC107" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Who spent most */}
          <div className="rounded-2xl p-5 bg-[var(--card)] border border-[var(--border)]">
            <h3 className="text-sm font-semibold mb-4">Who Spent Most</h3>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={personData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={2} dataKey="value">
                  {personData.map((entry, i) => (
                    <Cell key={i} fill={PERSON_COLOR[entry.name] ?? "#6b7280"} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {personData.map(({ name, value }) => (
                <div key={name} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: PERSON_COLOR[name] ?? "#6b7280" }} />
                  <span className="text-[10px] text-muted-foreground">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Expense list */}
      <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] overflow-hidden">
        {/* List header */}
        <div className="px-5 py-4 border-b border-white/05 flex items-center gap-3 flex-wrap">
          <h3 className="font-semibold text-sm">All Expenses</h3>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/08 text-sm outline-none w-36"
              />
            </div>
            <select value={filterPerson} onChange={e => setFilterPerson(e.target.value as Person | "all")}
              className="px-2 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground">
              <option value="all" className="bg-[#161616] text-[#f5f5f5]">All People</option>
              {PERSONS.map(p => <option key={p} value={p} className="bg-[#161616] text-[#f5f5f5]">{p}</option>)}
            </select>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value as ExpenseCategory | "all")}
              className="px-2 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground">
              <option value="all" className="bg-[#161616] text-[#f5f5f5]">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#161616] text-[#f5f5f5] capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">No expenses found.</div>
        ) : (
          <div>
            {filtered.map(exp => (
              <div key={exp.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-white/04 last:border-0 hover:bg-white/02 group">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{ background: CAT_COLORS[exp.category] + "20", color: CAT_COLORS[exp.category] }}
                >
                  {exp.category.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{exp.purpose}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground capitalize">{exp.category}</span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">{exp.person}</span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">{format(parseISO(exp.date), "d MMM")}</span>
                    <span className="text-[10px] uppercase text-muted-foreground">{exp.paymentMethod}</span>
                  </div>
                </div>
                <span className="text-base font-bold text-[#FFC107]">₹{exp.amount.toLocaleString("en-IN")}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditExp(exp)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={async () => await deleteExpense(exp.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {(editExp || creating) && (
          <ExpenseModal
            expense={editExp}
            onClose={() => { setEditExp(null); setCreating(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
