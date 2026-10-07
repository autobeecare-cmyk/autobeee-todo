import { create } from "zustand";
import type { ExpenseSplit, Settlement, FounderName } from "@/lib/types";
import {
  getExpenseSplits,
  getSettlements,
  createExpenseSplit,
  createSettlement,
  saveExpenseSplit,
  deleteExpenseSplit,
  subscribeSettlements,
} from "@/lib/supabase/settlements";

interface SettlementStore {
  splits: ExpenseSplit[];
  settlements: Settlement[];
  loading: boolean;
  error: string | null;
  subscribed: boolean;

  fetchSplitsAndSettlements: () => Promise<void>;
  addSplit: (split: Omit<ExpenseSplit, "id" | "createdAt">) => Promise<void>;
  saveSplit: (split: { expenseId: string; paidBy: FounderName | string; splitDetails: { founder: FounderName; amount: number }[]; splitMethod?: any; expenseType?: any }) => Promise<void>;
  deleteSplit: (expenseId: string) => Promise<void>;
  markPaid: (s: { payer: FounderName; payee: FounderName; amount: number; confirmedBy: FounderName; notes?: string }) => Promise<void>;
  initRealtime: () => () => void;
}

export const useSettlementStore = create<SettlementStore>((set, get) => ({
  splits: [],
  settlements: [],
  loading: false,
  error: null,
  subscribed: false,

  fetchSplitsAndSettlements: async () => {
    set({ loading: true, error: null });
    try {
      const [splits, settlements] = await Promise.all([
        getExpenseSplits(),
        getSettlements(),
      ]);
      set({ splits, settlements, loading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to load settlements", loading: false });
    }
  },

  saveSplit: async (split) => {
    try {
      await saveExpenseSplit(split as any);
      await get().fetchSplitsAndSettlements();
    } catch (err: any) {
      console.error("Failed to save split:", err);
      throw err;
    }
  },

  deleteSplit: async (expenseId) => {
    try {
      await deleteExpenseSplit(expenseId);
      await get().fetchSplitsAndSettlements();
    } catch (err: any) {
      console.error("Failed to delete split:", err);
      throw err;
    }
  },

  addSplit: async (split) => {
    try {
      await createExpenseSplit(split);
      await get().fetchSplitsAndSettlements();
    } catch (err: any) {
      console.error("Failed to add split:", err);
      throw err;
    }
  },

  markPaid: async (s) => {
    try {
      await createSettlement(s);
      await get().fetchSplitsAndSettlements();
    } catch (err: any) {
      console.error("Failed to mark settlement paid:", err);
      throw err;
    }
  },

  initRealtime: () => {
    if (get().subscribed) return () => {};
    set({ subscribed: true });
    get().fetchSplitsAndSettlements();

    const unsubscribe = subscribeSettlements(() => {
      get().fetchSplitsAndSettlements();
    });

    return () => {
      unsubscribe();
      set({ subscribed: false });
    };
  },
}));
