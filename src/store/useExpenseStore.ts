import { create } from "zustand";
import { Expense } from "@/lib/types";
import { getExpenses, subscribeToExpenses, createExpense, updateExpense, deleteExpense } from "@/lib/supabase/expenses";

interface ExpenseStore {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  fetchExpenses: () => Promise<void>;
  subscribeToExpenses: () => () => void;
  addExpense: (expense: Omit<Expense, "id" | "createdAt">) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}

export const useExpenseStore = create<ExpenseStore>((set, get) => ({
  expenses: [],
  loading: true,
  error: null,

  fetchExpenses: async () => {
    set({ loading: true, error: null });
    try {
      const data = await getExpenses();
      set({ expenses: data, loading: false });
    } catch (error: any) {
      set({ error: error.message || String(error), loading: false });
    }
  },

  subscribeToExpenses: () => {
    get().fetchExpenses();

    const unsub = subscribeToExpenses((expenses) => {
      set({ expenses, loading: false });
    });

    return unsub;
  },

  addExpense: async (expense) => {
    await createExpense(expense);
  },

  updateExpense: async (id, updates) => {
    await updateExpense(id, updates);
  },

  deleteExpense: async (id) => {
    await deleteExpense(id);
  },
}));

