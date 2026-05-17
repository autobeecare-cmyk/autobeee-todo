// src/store/useTaskStore.ts
import { create } from "zustand";
import { Task } from "@/lib/types";

interface TaskStore {
  tasks: Task[];
  loading: boolean;
  setTasks: (tasks: Task[]) => void;
  setLoading: (v: boolean) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  loading: true,
  setTasks: (tasks) => set({ tasks, loading: false }),
  setLoading: (loading) => set({ loading }),
}));
