// src/store/useUIStore.ts
import { create } from "zustand";

interface UIStore {
  sidebarOpen: boolean;
  commandOpen: boolean;
  quickAddOpen: boolean;
  quickAddTab: "task" | "expense" | "idea";
  theme: "dark" | "light";
  aiBrief: string | null;
  currentUser: "Sourabh" | "Asher" | "Subin";
  toggleSidebar: () => void;
  setSidebarOpen: (v: boolean) => void;
  setCommandOpen: (v: boolean) => void;
  setQuickAddOpen: (v: boolean, tab?: "task" | "expense" | "idea") => void;
  setTheme: (t: "dark" | "light") => void;
  setAiBrief: (b: string | null) => void;
  setCurrentUser: (u: "Sourabh" | "Asher" | "Subin") => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  commandOpen: false,
  quickAddOpen: false,
  quickAddTab: "task",
  theme: "dark",
  aiBrief: null,
  currentUser: "Sourabh",
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setCommandOpen: (v) => set({ commandOpen: v }),
  setQuickAddOpen: (v, tab) =>
    set({ quickAddOpen: v, quickAddTab: tab ?? "task" }),
  setTheme: (theme) => set({ theme }),
  setAiBrief: (aiBrief) => set({ aiBrief }),
  setCurrentUser: (currentUser) => {
    set({ currentUser });
    if (typeof window !== "undefined") {
      localStorage.setItem("autobee_current_user", currentUser);
    }
  },
}));
