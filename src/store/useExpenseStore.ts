// src/store/useExpenseStore.ts
import { create } from "zustand";
import { Expense } from "@/lib/types";

interface ExpenseStore {
  expenses: Expense[];
  loading: boolean;
  setExpenses: (expenses: Expense[]) => void;
  setLoading: (v: boolean) => void;
}

export const useExpenseStore = create<ExpenseStore>((set) => ({
  expenses: [],
  loading: true,
  setExpenses: (expenses) => set({ expenses, loading: false }),
  setLoading: (loading) => set({ loading }),
}));
