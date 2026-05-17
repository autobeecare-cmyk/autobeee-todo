// src/store/useUIStore.ts
import { create } from "zustand";

interface UIStore {
  sidebarOpen: boolean;
  commandOpen: boolean;
  quickAddOpen: boolean;
  quickAddTab: "task" | "expense" | "idea";
  theme: "dark" | "light";
  toggleSidebar: () => void;
  setSidebarOpen: (v: boolean) => void;
  setCommandOpen: (v: boolean) => void;
  setQuickAddOpen: (v: boolean, tab?: "task" | "expense" | "idea") => void;
  setTheme: (t: "dark" | "light") => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  commandOpen: false,
  quickAddOpen: false,
  quickAddTab: "task",
  theme: "dark",
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setCommandOpen: (v) => set({ commandOpen: v }),
  setQuickAddOpen: (v, tab) =>
    set({ quickAddOpen: v, quickAddTab: tab ?? "task" }),
  setTheme: (theme) => set({ theme }),
}));
