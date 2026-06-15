import { create } from "zustand";
import { Meeting } from "@/lib/types";
import { getMeetings, subscribeToMeetings, createMeeting, updateMeeting, deleteMeeting } from "@/lib/supabase/meetings";

interface MeetingStore {
  meetings: Meeting[];
  loading: boolean;
  error: string | null;
  fetchMeetings: () => Promise<void>;
  subscribeToMeetings: () => () => void;
  addMeeting: (meeting: Omit<Meeting, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateMeeting: (id: string, updates: Partial<Meeting>) => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;
}

export const useMeetingStore = create<MeetingStore>((set, get) => ({
  meetings: [],
  loading: true,
  error: null,

  fetchMeetings: async () => {
    set({ loading: true, error: null });
    try {
      const data = await getMeetings();
      set({ meetings: data, loading: false });
    } catch (error: any) {
      set({ error: error.message || String(error), loading: false });
    }
  },

  subscribeToMeetings: () => {
    get().fetchMeetings();

    const unsub = subscribeToMeetings((meetings) => {
      set({ meetings, loading: false });
    });

    return unsub;
  },

  addMeeting: async (meeting) => {
    await createMeeting(meeting);
  },

  updateMeeting: async (id, updates) => {
    await updateMeeting(id, updates);
  },

  deleteMeeting: async (id) => {
    await deleteMeeting(id);
  },
}));

