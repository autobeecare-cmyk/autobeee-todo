// src/store/useIdeaStore.ts
import { create } from "zustand";
import { Idea } from "@/lib/types";

interface IdeaStore {
  ideas: Idea[];
  loading: boolean;
  setIdeas: (ideas: Idea[]) => void;
  setLoading: (v: boolean) => void;
}

export const useIdeaStore = create<IdeaStore>((set) => ({
  ideas: [],
  loading: true,
  setIdeas: (ideas) => set({ ideas, loading: false }),
  setLoading: (loading) => set({ loading }),
}));
