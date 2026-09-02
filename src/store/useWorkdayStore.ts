import { create } from "zustand";
import type { Workday, FounderName } from "@/lib/types";
import {
  getTodayWorkdays,
  getAllWorkdays,
  checkInOffice,
  checkOutOffice,
  subscribeWorkdays,
  getISTDateInfo,
} from "@/lib/supabase/workday";
import { useUIStore } from "./useUIStore";

interface WorkdayStore {
  todayWorkdays: Workday[];
  allWorkdays: Workday[];
  loading: boolean;
  error: string | null;
  subscribed: boolean;

  fetchWorkdays: () => Promise<void>;
  checkIn: (coords?: { latitude: number; longitude: number; accuracy: number; timestamp?: number | string }) => Promise<void>;
  checkOut: (notes?: { progress?: string; blocker?: string; tomorrow?: string }) => Promise<void>;
  initRealtime: () => () => void;
}

let workdaySubscribersCount = 0;
let workdayUnsubscribeFn: (() => void) | null = null;

export const useWorkdayStore = create<WorkdayStore>((set, get) => ({
  todayWorkdays: [],
  allWorkdays: [],
  loading: false,
  error: null,
  subscribed: false,

  fetchWorkdays: async () => {
    set({ loading: true, error: null });
    try {
      const { dateStr } = getISTDateInfo();
      const [today, all] = await Promise.all([
        getTodayWorkdays(dateStr),
        getAllWorkdays(100),
      ]);
      set({ todayWorkdays: today, allWorkdays: all, loading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to fetch workdays", loading: false });
    }
  },

  checkIn: async (coords) => {
    const currentUser = useUIStore.getState().currentUser as FounderName;
    set({ loading: true, error: null });
    try {
      await checkInOffice(currentUser, coords);
      await get().fetchWorkdays();
    } catch (err: any) {
      console.error("Attendance check-in error:", err);
      set({ error: err.message || "Couldn't check you in. Please try again.", loading: false });
      throw err;
    }
  },

  checkOut: async (notes) => {
    const currentUser = useUIStore.getState().currentUser as FounderName;
    set({ loading: true, error: null });
    try {
      await checkOutOffice(currentUser, notes);
      await get().fetchWorkdays();
    } catch (err: any) {
      console.error("Attendance checkout error:", err);
      set({ error: "Couldn't end your workday. Please try again.", loading: false });
      throw err;
    }
  },

  initRealtime: () => {
    workdaySubscribersCount++;

    if (!workdayUnsubscribeFn) {
      set({ subscribed: true });
      get().fetchWorkdays();

      workdayUnsubscribeFn = subscribeWorkdays(() => {
        get().fetchWorkdays();
      });
    }

    return () => {
      workdaySubscribersCount = Math.max(0, workdaySubscribersCount - 1);
      if (workdaySubscribersCount === 0 && workdayUnsubscribeFn) {
        workdayUnsubscribeFn();
        workdayUnsubscribeFn = null;
        set({ subscribed: false });
      }
    };
  },
}));
