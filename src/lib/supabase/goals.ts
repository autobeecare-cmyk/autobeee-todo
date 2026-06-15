import { supabase } from "../supabase";
import type { Goal } from "../types";

const GOAL_CAT_MAP_TO_DB: Record<string, string> = {
  startup: "Startup",
  growth: "Growth",
  learning: "Learning",
  product: "Product",
  finance: "Finance",
};

const GOAL_CAT_MAP_FROM_DB: Record<string, any> = {
  Startup: "startup",
  Growth: "growth",
  Learning: "learning",
  Product: "product",
  Finance: "finance",
};

export function mapGoalFromDb(dbGoal: any): Goal {
  return {
    id: dbGoal.id,
    title: dbGoal.title,
    description: dbGoal.description || undefined,
    targetDate: dbGoal.target_date || undefined,
    progress: dbGoal.progress,
    linkedTaskIds: dbGoal.linked_task_ids || [],
    status: dbGoal.status,
    category: GOAL_CAT_MAP_FROM_DB[dbGoal.category] || "startup",
    createdAt: dbGoal.created_at,
    updatedAt: dbGoal.updated_at,
  };
}

export function mapGoalToDb(goal: Partial<Goal>): any {
  const dbGoal: any = {};
  if (goal.title !== undefined) dbGoal.title = goal.title;
  if (goal.description !== undefined) dbGoal.description = goal.description;
  if (goal.targetDate !== undefined) dbGoal.target_date = goal.targetDate || null;
  if (goal.progress !== undefined) dbGoal.progress = goal.progress;
  if (goal.linkedTaskIds !== undefined) dbGoal.linked_task_ids = goal.linkedTaskIds;
  if (goal.status !== undefined) dbGoal.status = goal.status;
  if (goal.category !== undefined) {
    dbGoal.category = GOAL_CAT_MAP_TO_DB[goal.category] || "Startup";
  }
  return dbGoal;
}

export const getGoals = async () => {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapGoalFromDb);
};

export const createGoal = async (goal: Omit<Goal, "id" | "createdAt" | "updatedAt">) => {
  const dbData = mapGoalToDb(goal);
  const { data, error } = await supabase
    .from("goals")
    .insert(dbData)
    .select()
    .single();
  if (error) throw error;
  return mapGoalFromDb(data);
};

export const updateGoal = async (id: string, updates: Partial<Goal>) => {
  const dbData = mapGoalToDb(updates);
  const { data, error } = await supabase
    .from("goals")
    .update(dbData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapGoalFromDb(data);
};

export const deleteGoal = async (id: string) => {
  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id);
  if (error) throw error;
};

export const subscribeToGoals = (callback: (goals: Goal[]) => void) => {
  const channelId = `goals-realtime-${Math.random().toString(36).substring(2, 9)}`;
  const channel = supabase
    .channel(channelId)
    .on("postgres_changes", { event: "*", schema: "public", table: "goals" }, async () => {
      const goals = await getGoals();
      callback(goals);
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
};
