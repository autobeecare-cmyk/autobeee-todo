import { create } from "zustand";
import type { AppNotification, FounderName } from "@/lib/types";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  subscribeNotifications,
} from "@/lib/supabase/notifications";
import { useUIStore } from "./useUIStore";

interface ToastItem {
  id: string;
  title: string;
  body: string;
  type: string;
}

interface NotificationStore {
  notifications: AppNotification[];
  toasts: ToastItem[];
  unreadCount: number;
  loading: boolean;
  subscribed: boolean;

  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  dismissToast: (id: string) => void;
  initRealtime: () => () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  toasts: [],
  unreadCount: 0,
  loading: false,
  subscribed: false,

  fetchNotifications: async () => {
    const currentUser = useUIStore.getState().currentUser as FounderName;
    set({ loading: true });
    try {
      const list = await getNotifications(currentUser);
      const unread = list.filter((n) => !n.read).length;
      set({ notifications: list, unreadCount: unread, loading: false });
    } catch (err) {
      console.error("Error fetching notifications:", err);
      set({ loading: false });
    }
  },

  markAsRead: async (id) => {
    await markNotificationAsRead(id);
    await get().fetchNotifications();
  },

  markAllRead: async () => {
    const currentUser = useUIStore.getState().currentUser as FounderName;
    await markAllNotificationsAsRead(currentUser);
    await get().fetchNotifications();
  },

  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  initRealtime: () => {
    if (get().subscribed) return () => {};
    set({ subscribed: true });
    get().fetchNotifications();

    const unsubscribe = subscribeNotifications(async () => {
      const currentUser = useUIStore.getState().currentUser as FounderName;
      const prev = get().notifications;
      const updated = await getNotifications(currentUser);

      // Find new notifications targeting current user or All (actor != currentUser)
      const newItems = updated.filter(
        (n) => !prev.some((p) => p.id === n.id) && n.actor !== currentUser
      );

      if (newItems.length > 0) {
        const newToasts: ToastItem[] = newItems.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          type: n.type,
        }));

        set((state) => ({
          toasts: [...state.toasts, ...newToasts],
          notifications: updated,
          unreadCount: updated.filter((u) => !u.read).length,
        }));
      } else {
        set({
          notifications: updated,
          unreadCount: updated.filter((u) => !u.read).length,
        });
      }
    });

    return () => {
      unsubscribe();
      set({ subscribed: false });
    };
  },
}));
