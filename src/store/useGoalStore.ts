import { create } from "zustand";
import { Goal } from "@/lib/types";
import { getGoals, subscribeToGoals, createGoal, updateGoal, deleteGoal } from "@/lib/supabase/goals";

interface GoalStore {
  goals: Goal[];
  loading: boolean;
  error: string | null;
  fetchGoals: () => Promise<void>;
  subscribeToGoals: () => () => void;
  addGoal: (goal: Omit<Goal, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
}

export const useGoalStore = create<GoalStore>((set, get) => ({
  goals: [],
  loading: true,
  error: null,

  fetchGoals: async () => {
    set({ loading: true, error: null });
    try {
      const data = await getGoals();
      set({ goals: data, loading: false });
    } catch (error: any) {
      set({ error: error.message || String(error), loading: false });
    }
  },

  subscribeToGoals: () => {
    get().fetchGoals();

    const unsub = subscribeToGoals((goals) => {
      set({ goals, loading: false });
    });

    return unsub;
  },

  addGoal: async (goal) => {
    await createGoal(goal);
  },

  updateGoal: async (id, updates) => {
    await updateGoal(id, updates);
  },

  deleteGoal: async (id) => {
    await deleteGoal(id);
  },
}));

