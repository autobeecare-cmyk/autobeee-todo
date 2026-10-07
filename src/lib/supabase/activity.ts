import { supabase } from "../supabase";
import type { Activity } from "../types";

export async function logActivity(data: Omit<Activity, "id" | "timestamp">) {
  let entityTitle = undefined;
  const match = data.description.match(/"([^"]+)"/);
  if (match) {
    entityTitle = match[1];
  }

  await supabase
    .from("activity")
    .insert({
      action: data.description,
      entity_type: data.entityType,
      entity_id: data.entityId,
      entity_title: entityTitle,
      metadata: { type: data.type },
    });
}

export const getRecentActivities = async (n = 20): Promise<Activity[]> => {
  try {
    const { data, error } = await supabase
      .from("activity")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(n);
    if (error) {
      console.warn("Failed to query activity table:", error);
      return [];
    }
    return (data || []).map((dbAct: any) => ({
      id: dbAct.id,
      type: dbAct.metadata?.type || "created",
      entityId: dbAct.entity_id,
      entityType: dbAct.entity_type as any,
      description: dbAct.action,
      timestamp: dbAct.created_at,
    }));
  } catch (err) {
    console.warn("Error in getRecentActivities:", err);
    return [];
  }
};

export const subscribeActivity = (callback: (items: Activity[]) => void, n = 20) => {
  // Immediately fetch initial activities
  getRecentActivities(n).then((initial) => {
    if (initial && initial.length > 0) {
      callback(initial);
    }
  });

  const channelId = `activity-realtime-${Math.random().toString(36).substring(2, 9)}`;
  const channel = supabase
    .channel(channelId)
    .on("postgres_changes", { event: "*", schema: "public", table: "activity" }, async () => {
      const activities = await getRecentActivities(n);
      callback(activities);
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
};
