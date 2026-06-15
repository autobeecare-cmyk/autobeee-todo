import { supabase } from "../supabase";
import type { Idea } from "../types";

const IDEA_CAT_MAP_TO_DB: Record<string, string> = {
  startup: "Startup",
  feature: "Feature",
  research: "Research",
  problem: "Problem",
  request: "Request",
};

const IDEA_CAT_MAP_FROM_DB: Record<string, any> = {
  Startup: "startup",
  Feature: "feature",
  Research: "research",
  Problem: "problem",
  Request: "request",
};

export function mapIdeaFromDb(dbIdea: any): Idea {
  return {
    id: dbIdea.id,
    title: dbIdea.title,
    category: IDEA_CAT_MAP_FROM_DB[dbIdea.category] || "feature",
    priority: dbIdea.priority || "medium",
    notes: dbIdea.notes || undefined,
    tags: dbIdea.tags || [],
    createdAt: dbIdea.created_at,
    pinned: dbIdea.is_pinned || false,
  };
}

export function mapIdeaToDb(idea: Partial<Idea>): any {
  const dbIdea: any = {};
  if (idea.title !== undefined) dbIdea.title = idea.title;
  if (idea.notes !== undefined) dbIdea.notes = idea.notes || null;
  if (idea.tags !== undefined) dbIdea.tags = idea.tags;
  if (idea.pinned !== undefined) dbIdea.is_pinned = idea.pinned;
  if (idea.priority !== undefined) dbIdea.priority = idea.priority;
  if (idea.category !== undefined) {
    dbIdea.category = IDEA_CAT_MAP_TO_DB[idea.category] || "Feature";
  }
  return dbIdea;
}

export const getIdeas = async () => {
  const { data, error } = await supabase
    .from("ideas")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapIdeaFromDb);
};

export const createIdea = async (idea: Omit<Idea, "id" | "createdAt">) => {
  const dbData = mapIdeaToDb(idea);
  const { data, error } = await supabase
    .from("ideas")
    .insert(dbData)
    .select()
    .single();
  if (error) throw error;
  return mapIdeaFromDb(data);
};

export const updateIdea = async (id: string, updates: Partial<Idea>) => {
  const dbData = mapIdeaToDb(updates);
  const { data, error } = await supabase
    .from("ideas")
    .update(dbData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapIdeaFromDb(data);
};

export const deleteIdea = async (id: string) => {
  const { error } = await supabase
    .from("ideas")
    .delete()
    .eq("id", id);
  if (error) throw error;
};

export const subscribeToIdeas = (callback: (ideas: Idea[]) => void) => {
  const channelId = `ideas-realtime-${Math.random().toString(36).substring(2, 9)}`;
  const channel = supabase
    .channel(channelId)
    .on("postgres_changes", { event: "*", schema: "public", table: "ideas" }, async () => {
      const ideas = await getIdeas();
      callback(ideas);
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
};
