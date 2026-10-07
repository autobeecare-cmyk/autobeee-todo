"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, startOfWeek, endOfWeek } from "date-fns";
import type { Expense } from "@/lib/types";

interface SpendingTrendChartProps {
  expenses: Expense[];
  timeRange: "all" | "year" | "month" | "week";
}

export function SpendingTrendChart({ expenses, timeRange }: SpendingTrendChartProps) {
  const chartData = useMemo(() => {
    if (expenses.length === 0) return [];

    if (timeRange === "all" || timeRange === "year") {
      // Group by calendar month across the dataset
      const monthBuckets: Record<string, { label: string; dateSort: string; amount: number; count: number }> = {};

      expenses.forEach((e) => {
        try {
          const parsed = parseISO(e.date);
          const key = format(parsed, "yyyy-MM");
          const label = format(parsed, "MMM ''yy");
          if (!monthBuckets[key]) {
            monthBuckets[key] = { label, dateSort: key, amount: 0, count: 0 };
          }
          monthBuckets[key].amount += e.amount;
          monthBuckets[key].count += 1;
        } catch {}
      });

      return Object.values(monthBuckets)
        .sort((a, b) => a.dateSort.localeCompare(b.dateSort))
        .map((b) => ({
          period: b.label,
          Expenses: b.amount,
          count: b.count,
        }));
    }

    if (timeRange === "month") {
      // Group by weeks of current month
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const currentMonthExpenses = expenses.filter((e) => {
        try {
          return isWithinInterval(parseISO(e.date), { start: monthStart, end: monthEnd });
        } catch {
          return false;
        }
      });

      if (currentMonthExpenses.length === 0) {
        // Fallback: show last 4 available weeks with any recorded expenses
        const weekBuckets: Record<string, { label: string; amount: number }> = {};
        expenses.slice(0, 10).forEach((e) => {
          try {
            const parsed = parseISO(e.date);
            const label = format(parsed, "dd MMM");
            weekBuckets[label] = {
              label,
              amount: (weekBuckets[label]?.amount ?? 0) + e.amount,
            };
          } catch {}
        });
        return Object.values(weekBuckets).map((b) => ({
          period: b.label,
          Expenses: b.amount,
        }));
      }

      // Group into days of current month
      const dayBuckets: Record<string, number> = {};
      currentMonthExpenses.forEach((e) => {
        try {
          const label = format(parseISO(e.date), "dd MMM");
          dayBuckets[label] = (dayBuckets[label] || 0) + e.amount;
        } catch {}
      });

      return Object.entries(dayBuckets).map(([period, amount]) => ({
        period,
        Expenses: amount,
      }));
    }

    if (timeRange === "week") {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const currentWeekExpenses = expenses.filter((e) => {
        try {
          return isWithinInterval(parseISO(e.date), { start: weekStart, end: weekEnd });
        } catch {
          return false;
        }
      });

      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const dayData = days.map((day) => ({ period: day, Expenses: 0 }));

      currentWeekExpenses.forEach((e) => {
        try {
          const dayName = format(parseISO(e.date), "EEE");
          const item = dayData.find((d) => d.period === dayName);
          if (item) item.Expenses += e.amount;
        } catch {}
      });

      return dayData;
    }

    return [];
  }, [expenses, timeRange]);

  const hasData = chartData.some((d) => (d.Expenses || 0) > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-xs sm:text-sm text-foreground uppercase tracking-wider">
            Spending Trend
          </h3>
          <p className="text-[10px] text-muted-foreground">
            {timeRange === "all" || timeRange === "year"
              ? "Monthly spending progression"
              : timeRange === "month"
              ? "Current month distribution"
              : "Daily spending breakdown"}
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-[10px]">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#FFC107]" />
          <span className="text-muted-foreground font-medium">Expenses</span>
        </div>
      </div>

      <div className="h-[180px] sm:h-[210px] w-full pt-2">
        {!hasData ? (
          <div className="h-full w-full flex flex-col items-center justify-center rounded-xl bg-white/[0.01] border border-white/[0.04] text-center p-4">
            <p className="text-xs font-semibold text-muted-foreground">
              No recorded spending in this period
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              Switch to "All" or "Year" to view historical spending trends.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, bottom: 0, left: -16 }}
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
                tickFormatter={(v) =>
                  `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                }
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                formatter={(val: any) => [
                  `₹${Number(val || 0).toLocaleString("en-IN")}`,
                  "Spent",
                ]}
                contentStyle={{
                  background: "#161616",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  fontSize: "11px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                }}
                labelStyle={{ color: "#aaa", fontWeight: "bold" }}
              />
              <Bar
                dataKey="Expenses"
                fill="#FFC107"
                radius={[5, 5, 0, 0]}
                maxBarSize={36}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
