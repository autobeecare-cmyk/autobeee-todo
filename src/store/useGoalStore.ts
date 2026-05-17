// src/store/useGoalStore.ts
import { create } from "zustand";
import { Goal } from "@/lib/types";

interface GoalStore {
  goals: Goal[];
  loading: boolean;
  setGoals: (goals: Goal[]) => void;
  setLoading: (v: boolean) => void;
}

export const useGoalStore = create<GoalStore>((set) => ({
  goals: [],
  loading: true,
  setGoals: (goals) => set({ goals, loading: false }),
  setLoading: (loading) => set({ loading }),
}));
