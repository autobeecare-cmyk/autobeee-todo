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
  return (data || []).map(mapNotificationFromDb);
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

  // Trigger optional server-side push notification endpoint
  try {
    fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: n.title,
        body: n.body,
        recipient: n.recipient,
        actor: n.actor,
      }),
    }).catch((err) => console.error("Push notify error:", err));
  } catch (e) {
    // Non-blocking
  }

  return mapNotificationFromDb(data);
}

export async function markNotificationAsRead(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id);
  if (error) console.error("Error marking notification read:", error);
}

export async function markAllNotificationsAsRead(user: FounderName) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .or(`recipient.eq.${user},recipient.eq.All`);
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
