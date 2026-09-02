import { supabase } from "../supabase";
import type { AppNotification, FounderName } from "../types";

export function mapNotificationFromDb(dbItem: any): AppNotification {
  return {
    id: dbItem.id,
    eventId: dbItem.event_id,
    title: dbItem.title,
    body: dbItem.body,
    recipient: dbItem.recipient,
    actor: dbItem.actor,
    type: dbItem.type,
    read: dbItem.read ?? false,
    createdAt: dbItem.created_at,
  };
}

export async function getNotifications(user?: FounderName, limit = 50): Promise<AppNotification[]> {
  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (user) {
    query = query.or(`recipient.eq.${user},recipient.eq.All`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }

  const list = data || [];
  let userReadIds = new Set<string>();

  if (user && list.length > 0) {
    try {
      const { data: readEntries } = await supabase
        .from("notification_reads")
        .select("notification_id")
        .eq("user_name", user)
        .in("notification_id", list.map((n) => n.id));

      if (readEntries) {
        userReadIds = new Set(readEntries.map((r: any) => r.notification_id));
      }
    } catch {
      // Graceful fallback if notification_reads table migration is pending
    }
  }

  return list.map((item) => {
    const mapped = mapNotificationFromDb(item);
    if (user && userReadIds.has(item.id)) {
      mapped.read = true;
    }
    return mapped;
  });
}

export async function createNotification(n: Omit<AppNotification, "id" | "read" | "createdAt">): Promise<AppNotification | null> {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      event_id: n.eventId,
      title: n.title,
      body: n.body,
      recipient: n.recipient,
      actor: n.actor,
      type: n.type,
      read: false,
    })
    .select()
    .single();

  if (error) {
    // Ignore duplicate event_id error for idempotency/deduplication
    if (error.code === "23505") {
      console.log(`Notification event_id ${n.eventId} already exists, skipping.`);
      return null;
    }
    console.error("Error creating notification:", error);
    return null;
  }

  return mapNotificationFromDb(data);
}

export async function markNotificationAsRead(id: string, user?: FounderName) {
  if (user) {
    try {
      await supabase
        .from("notification_reads")
        .upsert(
          { notification_id: id, user_name: user, read_at: new Date().toISOString() },
          { onConflict: "notification_id,user_name" }
        );
    } catch {
      // Fallback
    }
  }

  // Update row-level read if direct recipient or fallback
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id);
  if (error) console.error("Error marking notification read:", error);
}

export async function markAllNotificationsAsRead(user: FounderName) {
  try {
    // Fetch all current visible notifications for user
    const { data: visible } = await supabase
      .from("notifications")
      .select("id, recipient")
      .or(`recipient.eq.${user},recipient.eq.All`);

    if (visible && visible.length > 0) {
      const nowIso = new Date().toISOString();
      const readRows = visible.map((n) => ({
        notification_id: n.id,
        user_name: user,
        read_at: nowIso,
      }));

      await supabase
        .from("notification_reads")
        .upsert(readRows, { onConflict: "notification_id,user_name" });
    }
  } catch {
    // Fallback
  }

  // Also update direct user notifications to read = true
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("recipient", user);
  if (error) console.error("Error marking all read:", error);
}

export function subscribeNotifications(callback: () => void) {
  const channelId = `notifications-realtime-${Math.random().toString(36).substring(2, 9)}`;
  const channel = supabase
    .channel(channelId)
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
      callback();
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}
