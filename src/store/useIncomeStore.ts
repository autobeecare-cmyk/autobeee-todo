import { create } from "zustand";
import { Income } from "@/lib/types";
import { getIncome, subscribeToIncome, createIncome, updateIncome, deleteIncome } from "@/lib/supabase/income";

interface IncomeStore {
  income: Income[];
  loading: boolean;
  error: string | null;
  fetchIncome: () => Promise<void>;
  subscribeToIncome: () => () => void;
  addIncome: (income: Omit<Income, "id" | "createdAt">) => Promise<void>;
  updateIncome: (id: string, updates: Partial<Income>) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
}

export const useIncomeStore = create<IncomeStore>((set, get) => ({
  income: [],
  loading: true,
  error: null,

  fetchIncome: async () => {
    set({ loading: true, error: null });
    try {
      const data = await getIncome();
      set({ income: data, loading: false });
    } catch (error: any) {
      set({ error: error.message || String(error), loading: false });
    }
  },

  subscribeToIncome: () => {
    get().fetchIncome();

    const unsub = subscribeToIncome((income) => {
      set({ income, loading: false });
    });

    return unsub;
  },

  addIncome: async (inc) => {
    await createIncome(inc);
  },

  updateIncome: async (id, updates) => {
    await updateIncome(id, updates);
  },

  deleteIncome: async (id) => {
    await deleteIncome(id);
  },
}));
