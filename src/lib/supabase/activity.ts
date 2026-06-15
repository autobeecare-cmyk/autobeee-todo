import { supabase } from "../supabase";
import type { Activity } from "../types";

export async function logActivity(data: Omit<Activity, "id" | "timestamp">) {
  // Try to extract entity title from description if possible
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

export const subscribeActivity = (callback: (items: Activity[]) => void, n = 20) => {
  // In case anything reads it, implement subscribeActivity
  const getActivities = async () => {
    const { data, error } = await supabase
      .from("activity")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(n);
    if (error) throw error;
    return (data || []).map((dbAct: any) => ({
      id: dbAct.id,
      type: dbAct.metadata?.type || "created",
      entityId: dbAct.entity_id,
      entityType: dbAct.entity_type as any,
      description: dbAct.action,
      timestamp: dbAct.created_at,
    }));
  };

  const channelId = `activity-realtime-${Math.random().toString(36).substring(2, 9)}`;
  const channel = supabase
    .channel(channelId)
    .on("postgres_changes", { event: "*", schema: "public", table: "activity" }, async () => {
      const activities = await getActivities();
      callback(activities);
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
};
