import { create } from "zustand";
import { Task } from "@/lib/types";
import { getTasks, subscribeToTasks, createTask, updateTask, deleteTask } from "@/lib/supabase/tasks";

interface TaskStore {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  subscribeToTasks: () => () => void;
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  loading: true,
  error: null,

  fetchTasks: async () => {
    set({ loading: true, error: null });
    try {
      const data = await getTasks();
      set({ tasks: data, loading: false });
    } catch (error: any) {
      set({ error: error.message || String(error), loading: false });
    }
  },

  subscribeToTasks: () => {
    // Always fetch first before subscribing
    get().fetchTasks();

    // Subscribe to tasks changes
    const unsub = subscribeToTasks((tasks) => {
      set({ tasks, loading: false });
    });

    return unsub;
  },

  addTask: async (task) => {
    await createTask(task);
  },

  updateTask: async (id, updates) => {
    await updateTask(id, updates);
  },

  deleteTask: async (id) => {
    const previousTasks = get().tasks;
    set({ tasks: previousTasks.filter(t => t.id !== id) });
    try {
      await deleteTask(id);
    } catch (error: any) {
      set({ tasks: previousTasks, error: error.message || String(error) });
      throw error;
    }
  },

  completeTask: async (id) => {
    await get().deleteTask(id);
  },
}));

