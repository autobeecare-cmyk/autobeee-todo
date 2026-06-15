import { create } from "zustand";
import { Idea } from "@/lib/types";
import { getIdeas, subscribeToIdeas, createIdea, updateIdea, deleteIdea } from "@/lib/supabase/ideas";

interface IdeaStore {
  ideas: Idea[];
  loading: boolean;
  error: string | null;
  fetchIdeas: () => Promise<void>;
  subscribeToIdeas: () => () => void;
  addIdea: (idea: Omit<Idea, "id" | "createdAt">) => Promise<void>;
  updateIdea: (id: string, updates: Partial<Idea>) => Promise<void>;
  deleteIdea: (id: string) => Promise<void>;
}

export const useIdeaStore = create<IdeaStore>((set, get) => ({
  ideas: [],
  loading: true,
  error: null,

  fetchIdeas: async () => {
    set({ loading: true, error: null });
    try {
      const data = await getIdeas();
      set({ ideas: data, loading: false });
    } catch (error: any) {
      set({ error: error.message || String(error), loading: false });
    }
  },

  subscribeToIdeas: () => {
    get().fetchIdeas();

    const unsub = subscribeToIdeas((ideas) => {
      set({ ideas, loading: false });
    });

    return unsub;
  },

  addIdea: async (idea) => {
    await createIdea(idea);
  },

  updateIdea: async (id, updates) => {
    await updateIdea(id, updates);
  },

  deleteIdea: async (id) => {
    await deleteIdea(id);
  },
}));

