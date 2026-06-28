import { supabase } from "../supabase";
import type {
  RoadmapPhase,
  RoadmapObjective,
  RoadmapMilestone,
  RoadmapEpic,
  KeyResult,
  RoadmapHiring,
  RoadmapMarketing,
  RoadmapFinance,
  RoadmapRisk,
  Task,
  Goal,
  Person,
  Priority
} from "../types";
import { updateGoal, createGoal } from "./goals";

// ----------------------------------------------------
// DB Mapping Helpers
// ----------------------------------------------------

export function mapPhaseFromDb(db: any): RoadmapPhase {
  return {
    id: db.id,
    title: db.title,
    description: db.description || undefined,
    owner: db.owner as Person,
    priority: db.priority as Priority,
    startDate: db.start_date || undefined,
    targetDate: db.target_date || undefined,
    completionPercentage: parseFloat(db.completion_percentage || 0),
    status: db.status as RoadmapPhase["status"],
    notes: db.notes || undefined,
    dependencies: db.dependencies || [],
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function mapPhaseToDb(p: Partial<RoadmapPhase>): any {
  const db: any = {};
  if (p.title !== undefined) db.title = p.title;
  if (p.description !== undefined) db.description = p.description;
  if (p.owner !== undefined) db.owner = p.owner;
  if (p.priority !== undefined) db.priority = p.priority;
  if (p.startDate !== undefined) db.start_date = p.startDate || null;
  if (p.targetDate !== undefined) db.target_date = p.targetDate || null;
  if (p.completionPercentage !== undefined) db.completion_percentage = p.completionPercentage;
  if (p.status !== undefined) db.status = p.status;
  if (p.notes !== undefined) db.notes = p.notes || null;
  if (p.dependencies !== undefined) db.dependencies = p.dependencies;
  return db;
}

export function mapObjectiveFromDb(db: any): RoadmapObjective {
  return {
    id: db.id,
    phaseId: db.phase_id,
    goalId: db.goal_id || undefined,
    title: db.title,
    description: db.description || undefined,
    owner: db.owner as Person,
    priority: db.priority as Priority,
    startDate: db.start_date || undefined,
    targetDate: db.target_date || undefined,
    completionPercentage: parseFloat(db.completion_percentage || 0),
    status: db.status as RoadmapObjective["status"],
    notes: db.notes || undefined,
    dependencies: db.dependencies || [],
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function mapObjectiveToDb(obj: Partial<RoadmapObjective>): any {
  const db: any = {};
  if (obj.phaseId !== undefined) db.phase_id = obj.phaseId;
  if (obj.goalId !== undefined) db.goal_id = obj.goalId || null;
  if (obj.title !== undefined) db.title = obj.title;
  if (obj.description !== undefined) db.description = obj.description;
  if (obj.owner !== undefined) db.owner = obj.owner;
  if (obj.priority !== undefined) db.priority = obj.priority;
  if (obj.startDate !== undefined) db.start_date = obj.startDate || null;
  if (obj.targetDate !== undefined) db.target_date = obj.targetDate || null;
  if (obj.completionPercentage !== undefined) db.completion_percentage = obj.completionPercentage;
  if (obj.status !== undefined) db.status = obj.status;
  if (obj.notes !== undefined) db.notes = obj.notes || null;
  if (obj.dependencies !== undefined) db.dependencies = obj.dependencies;
  return db;
}

export function mapMilestoneFromDb(db: any): RoadmapMilestone {
  return {
    id: db.id,
    objectiveId: db.objective_id,
    keyResultId: db.key_result_id || undefined,
    title: db.title,
    description: db.description || undefined,
    owner: db.owner as Person,
    priority: db.priority as Priority,
    startDate: db.start_date || undefined,
    targetDate: db.target_date || undefined,
    completionPercentage: parseFloat(db.completion_percentage || 0),
    status: db.status as RoadmapMilestone["status"],
    notes: db.notes || undefined,
    dependencies: db.dependencies || [],
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function mapMilestoneToDb(m: Partial<RoadmapMilestone>): any {
  const db: any = {};
  if (m.objectiveId !== undefined) db.objective_id = m.objectiveId;
  if (m.keyResultId !== undefined) db.key_result_id = m.keyResultId || null;
  if (m.title !== undefined) db.title = m.title;
  if (m.description !== undefined) db.description = m.description;
  if (m.owner !== undefined) db.owner = m.owner;
  if (m.priority !== undefined) db.priority = m.priority;
  if (m.startDate !== undefined) db.start_date = m.startDate || null;
  if (m.targetDate !== undefined) db.target_date = m.targetDate || null;
  if (m.completionPercentage !== undefined) db.completion_percentage = m.completionPercentage;
  if (m.status !== undefined) db.status = m.status;
  if (m.notes !== undefined) db.notes = m.notes || null;
  if (m.dependencies !== undefined) db.dependencies = m.dependencies;
  return db;
}

export function mapEpicFromDb(db: any): RoadmapEpic {
  return {
    id: db.id,
    milestoneId: db.milestone_id,
    title: db.title,
    description: db.description || undefined,
    owner: db.owner as Person,
    priority: db.priority as Priority,
    startDate: db.start_date || undefined,
    targetDate: db.target_date || undefined,
    completionPercentage: parseFloat(db.completion_percentage || 0),
    status: db.status as RoadmapEpic["status"],
    notes: db.notes || undefined,
    dependencies: db.dependencies || [],
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function mapEpicToDb(e: Partial<RoadmapEpic>): any {
  const db: any = {};
  if (e.milestoneId !== undefined) db.milestone_id = e.milestoneId;
  if (e.title !== undefined) db.title = e.title;
  if (e.description !== undefined) db.description = e.description;
  if (e.owner !== undefined) db.owner = e.owner;
  if (e.priority !== undefined) db.priority = e.priority;
  if (e.startDate !== undefined) db.start_date = e.startDate || null;
  if (e.targetDate !== undefined) db.target_date = e.targetDate || null;
  if (e.completionPercentage !== undefined) db.completion_percentage = e.completionPercentage;
  if (e.status !== undefined) db.status = e.status;
  if (e.notes !== undefined) db.notes = e.notes || null;
  if (e.dependencies !== undefined) db.dependencies = e.dependencies;
  return db;
}

export function mapKeyResultFromDb(db: any): KeyResult {
  return {
    id: db.id,
    goalId: db.goal_id,
    title: db.title,
    description: db.description || undefined,
    targetValue: parseFloat(db.target_value || 100),
    currentValue: parseFloat(db.current_value || 0),
    completionPercentage: parseFloat(db.completion_percentage || 0),
    status: db.status as KeyResult["status"],
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function mapKeyResultToDb(k: Partial<KeyResult>): any {
  const db: any = {};
  if (k.goalId !== undefined) db.goal_id = k.goalId;
  if (k.title !== undefined) db.title = k.title;
  if (k.description !== undefined) db.description = k.description;
  if (k.targetValue !== undefined) db.target_value = k.targetValue;
  if (k.currentValue !== undefined) db.current_value = k.currentValue;
  if (k.completionPercentage !== undefined) db.completion_percentage = k.completionPercentage;
  if (k.status !== undefined) db.status = k.status;
  return db;
}

export function mapHiringFromDb(db: any): RoadmapHiring {
  return {
    id: db.id,
    phaseId: db.phase_id,
    role: db.role,
    department: db.department || undefined,
    owner: db.owner as Person,
    budget: parseFloat(db.budget || 0),
    status: db.status as RoadmapHiring["status"],
    startDate: db.start_date || undefined,
    targetDate: db.target_date || undefined,
    notes: db.notes || undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function mapHiringToDb(h: Partial<RoadmapHiring>): any {
  const db: any = {};
  if (h.phaseId !== undefined) db.phase_id = h.phaseId;
  if (h.role !== undefined) db.role = h.role;
  if (h.department !== undefined) db.department = h.department || null;
  if (h.owner !== undefined) db.owner = h.owner;
  if (h.budget !== undefined) db.budget = h.budget;
  if (h.status !== undefined) db.status = h.status;
  if (h.startDate !== undefined) db.start_date = h.startDate || null;
  if (h.targetDate !== undefined) db.target_date = h.targetDate || null;
  if (h.notes !== undefined) db.notes = h.notes || null;
  return db;
}

export function mapMarketingFromDb(db: any): RoadmapMarketing {
  return {
    id: db.id,
    phaseId: db.phase_id,
    campaignName: db.campaign_name,
    status: db.status as RoadmapMarketing["status"],
    budget: parseFloat(db.budget || 0),
    expectedOutcome: db.expected_outcome || undefined,
    deadline: db.deadline || undefined,
    completionPercentage: parseFloat(db.completion_percentage || 0),
    owner: db.owner as Person,
    notes: db.notes || undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function mapMarketingToDb(m: Partial<RoadmapMarketing>): any {
  const db: any = {};
  if (m.phaseId !== undefined) db.phase_id = m.phaseId;
  if (m.campaignName !== undefined) db.campaign_name = m.campaignName;
  if (m.status !== undefined) db.status = m.status;
  if (m.budget !== undefined) db.budget = m.budget;
  if (m.expectedOutcome !== undefined) db.expected_outcome = m.expectedOutcome || null;
  if (m.deadline !== undefined) db.deadline = m.deadline || null;
  if (m.completionPercentage !== undefined) db.completion_percentage = m.completionPercentage;
  if (m.owner !== undefined) db.owner = m.owner;
  if (m.notes !== undefined) db.notes = m.notes || null;
  return db;
}

export function mapFinanceFromDb(db: any): RoadmapFinance {
  return {
    id: db.id,
    phaseId: db.phase_id,
    monthName: db.month_name,
    projectedBookings: db.projected_bookings || 0,
    projectedRevenue: parseFloat(db.projected_revenue || 0),
    actualRevenue: parseFloat(db.actual_revenue || 0),
    monthlyTarget: parseFloat(db.monthly_target || 0),
    notes: db.notes || undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function mapFinanceToDb(f: Partial<RoadmapFinance>): any {
  const db: any = {};
  if (f.phaseId !== undefined) db.phase_id = f.phaseId;
  if (f.monthName !== undefined) db.month_name = f.monthName;
  if (f.projectedBookings !== undefined) db.projected_bookings = f.projectedBookings;
  if (f.projectedRevenue !== undefined) db.projected_revenue = f.projectedRevenue;
  if (f.actualRevenue !== undefined) db.actual_revenue = f.actualRevenue;
  if (f.monthlyTarget !== undefined) db.monthly_target = f.monthlyTarget;
  if (f.notes !== undefined) db.notes = f.notes || null;
  return db;
}

export function mapRiskFromDb(db: any): RoadmapRisk {
  return {
    id: db.id,
    title: db.title,
    description: db.description || undefined,
    probability: db.probability as RoadmapRisk["probability"],
    impact: db.impact as RoadmapRisk["impact"],
    owner: db.owner as Person,
    mitigation: db.mitigation || undefined,
    status: db.status as RoadmapRisk["status"],
    milestoneId: db.milestone_id || undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function mapRiskToDb(r: Partial<RoadmapRisk>): any {
  const db: any = {};
  if (r.title !== undefined) db.title = r.title;
  if (r.description !== undefined) db.description = r.description;
  if (r.probability !== undefined) db.probability = r.probability;
  if (r.impact !== undefined) db.impact = r.impact;
  if (r.owner !== undefined) db.owner = r.owner;
  if (r.mitigation !== undefined) db.mitigation = r.mitigation || null;
  if (r.status !== undefined) db.status = r.status;
  if (r.milestoneId !== undefined) db.milestone_id = r.milestoneId || null;
  return db;
}

// ----------------------------------------------------
// CRUD APIs
// ----------------------------------------------------

export const getPhases = async (): Promise<RoadmapPhase[]> => {
  const { data, error } = await supabase.from("roadmap_phases").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapPhaseFromDb);
};

export const updatePhase = async (id: string, updates: Partial<RoadmapPhase>) => {
  const { data, error } = await supabase.from("roadmap_phases").update(mapPhaseToDb(updates)).eq("id", id).select().single();
  if (error) throw error;
  return mapPhaseFromDb(data);
};

export const getObjectives = async (): Promise<RoadmapObjective[]> => {
  const { data, error } = await supabase.from("roadmap_objectives").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapObjectiveFromDb);
};

export const createObjective = async (obj: Omit<RoadmapObjective, "id" | "createdAt" | "updatedAt" | "completionPercentage">) => {
  const dbData = mapObjectiveToDb(obj);
  dbData.completion_percentage = 0;
  
  // Auto create linked goal in existing Goals table
  const newGoal = await createGoal({
    title: obj.title,
    description: obj.description,
    targetDate: obj.targetDate,
    progress: 0,
    linkedTaskIds: [],
    status: "active",
    category: "product"
  });
  dbData.goal_id = newGoal.id;

  const { data, error } = await supabase.from("roadmap_objectives").insert(dbData).select().single();
  if (error) throw error;
  return mapObjectiveFromDb(data);
};

export const updateObjective = async (id: string, updates: Partial<RoadmapObjective>) => {
  const { data, error } = await supabase.from("roadmap_objectives").update(mapObjectiveToDb(updates)).eq("id", id).select().single();
  if (error) throw error;
  const obj = mapObjectiveFromDb(data);
  
  if (obj.goalId) {
    await updateGoal(obj.goalId, {
      title: obj.title,
      description: obj.description,
      targetDate: obj.targetDate,
      progress: obj.completionPercentage,
      status: obj.status === "completed" ? "completed" : "active"
    });
  }
  return obj;
};

export const deleteObjective = async (id: string) => {
  const { data: existing } = await supabase.from("roadmap_objectives").select("goal_id").eq("id", id).single();
  const { error } = await supabase.from("roadmap_objectives").delete().eq("id", id);
  if (error) throw error;

  // Clean up linked goal
  if (existing?.goal_id) {
    await supabase.from("goals").delete().eq("id", existing.goal_id);
  }
};

export const getKeyResults = async (): Promise<KeyResult[]> => {
  const { data, error } = await supabase.from("key_results").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapKeyResultFromDb);
};

export const updateKeyResult = async (id: string, updates: Partial<KeyResult>) => {
  const { data, error } = await supabase.from("key_results").update(mapKeyResultToDb(updates)).eq("id", id).select().single();
  if (error) throw error;
  return mapKeyResultFromDb(data);
};

export const getMilestones = async (): Promise<RoadmapMilestone[]> => {
  const { data, error } = await supabase.from("roadmap_milestones").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapMilestoneFromDb);
};

export const createMilestone = async (m: Omit<RoadmapMilestone, "id" | "createdAt" | "updatedAt" | "completionPercentage">) => {
  const dbData = mapMilestoneToDb(m);
  dbData.completion_percentage = 0;

  // Check if parent objective has a Goal
  const { data: obj } = await supabase.from("roadmap_objectives").select("goal_id").eq("id", m.objectiveId).single();
  if (obj?.goal_id) {
    // Create linked Key Result for that Goal
    const { data: kr, error: krErr } = await supabase.from("key_results").insert({
      goal_id: obj.goal_id,
      title: m.title,
      description: m.description,
      target_value: 100.0,
      current_value: 0.0,
      completion_percentage: 0.0,
      status: "active"
    }).select().single();
    if (!krErr) {
      dbData.key_result_id = kr.id;
    }
  }

  const { data, error } = await supabase.from("roadmap_milestones").insert(dbData).select().single();
  if (error) throw error;
  return mapMilestoneFromDb(data);
};

export const updateMilestone = async (id: string, updates: Partial<RoadmapMilestone>) => {
  const { data, error } = await supabase.from("roadmap_milestones").update(mapMilestoneToDb(updates)).eq("id", id).select().single();
  if (error) throw error;
  const ms = mapMilestoneFromDb(data);

  if (ms.keyResultId) {
    await supabase.from("key_results").update({
      title: ms.title,
      description: ms.description,
      current_value: ms.completionPercentage,
      completion_percentage: ms.completionPercentage,
      status: ms.status === "completed" ? "completed" : "active"
    }).eq("id", ms.keyResultId);
  }
  return ms;
};

export const deleteMilestone = async (id: string) => {
  const { data: existing } = await supabase.from("roadmap_milestones").select("key_result_id").eq("id", id).single();
  const { error } = await supabase.from("roadmap_milestones").delete().eq("id", id);
  if (error) throw error;

  if (existing?.key_result_id) {
    await supabase.from("key_results").delete().eq("id", existing.key_result_id);
  }
};

export const getEpics = async (): Promise<RoadmapEpic[]> => {
  const { data, error } = await supabase.from("roadmap_epics").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapEpicFromDb);
};

export const createEpic = async (e: Omit<RoadmapEpic, "id" | "createdAt" | "updatedAt" | "completionPercentage">) => {
  const dbData = mapEpicToDb(e);
  dbData.completion_percentage = 0;
  const { data, error } = await supabase.from("roadmap_epics").insert(dbData).select().single();
  if (error) throw error;
  return mapEpicFromDb(data);
};

export const updateEpic = async (id: string, updates: Partial<RoadmapEpic>) => {
  const { data, error } = await supabase.from("roadmap_epics").update(mapEpicToDb(updates)).eq("id", id).select().single();
  if (error) throw error;
  return mapEpicFromDb(data);
};

export const deleteEpic = async (id: string) => {
  const { error } = await supabase.from("roadmap_epics").delete().eq("id", id);
  if (error) throw error;
};

export const getHiring = async (): Promise<RoadmapHiring[]> => {
  const { data, error } = await supabase.from("roadmap_hiring").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapHiringFromDb);
};

export const createHiring = async (h: Omit<RoadmapHiring, "id" | "createdAt" | "updatedAt">) => {
  const { data, error } = await supabase.from("roadmap_hiring").insert(mapHiringToDb(h)).select().single();
  if (error) throw error;
  return mapHiringFromDb(data);
};

export const updateHiring = async (id: string, updates: Partial<RoadmapHiring>) => {
  const { data, error } = await supabase.from("roadmap_hiring").update(mapHiringToDb(updates)).eq("id", id).select().single();
  if (error) throw error;
  return mapHiringFromDb(data);
};

export const deleteHiring = async (id: string) => {
  const { error } = await supabase.from("roadmap_hiring").delete().eq("id", id);
  if (error) throw error;
};

export const getMarketing = async (): Promise<RoadmapMarketing[]> => {
  const { data, error } = await supabase.from("roadmap_marketing").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapMarketingFromDb);
};

export const createMarketing = async (m: Omit<RoadmapMarketing, "id" | "createdAt" | "updatedAt">) => {
  const { data, error } = await supabase.from("roadmap_marketing").insert(mapMarketingToDb(m)).select().single();
  if (error) throw error;
  return mapMarketingFromDb(data);
};

export const updateMarketing = async (id: string, updates: Partial<RoadmapMarketing>) => {
  const { data, error } = await supabase.from("roadmap_marketing").update(mapMarketingToDb(updates)).eq("id", id).select().single();
  if (error) throw error;
  return mapMarketingFromDb(data);
};

export const deleteMarketing = async (id: string) => {
  const { error } = await supabase.from("roadmap_marketing").delete().eq("id", id);
  if (error) throw error;
};

export const getFinance = async (): Promise<RoadmapFinance[]> => {
  const { data, error } = await supabase.from("roadmap_finance").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapFinanceFromDb);
};

export const createFinance = async (f: Omit<RoadmapFinance, "id" | "createdAt" | "updatedAt" | "actualRevenue">) => {
  const { data, error } = await supabase.from("roadmap_finance").insert(mapFinanceToDb(f)).select().single();
  if (error) throw error;
  return mapFinanceFromDb(data);
};

export const updateFinance = async (id: string, updates: Partial<RoadmapFinance>) => {
  const { data, error } = await supabase.from("roadmap_finance").update(mapFinanceToDb(updates)).eq("id", id).select().single();
  if (error) throw error;
  return mapFinanceFromDb(data);
};

export const deleteFinance = async (id: string) => {
  const { error } = await supabase.from("roadmap_finance").delete().eq("id", id);
  if (error) throw error;
};

export const getRisks = async (): Promise<RoadmapRisk[]> => {
  const { data, error } = await supabase.from("roadmap_risks").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapRiskFromDb);
};

export const createRisk = async (r: Omit<RoadmapRisk, "id" | "createdAt" | "updatedAt">) => {
  const { data, error } = await supabase.from("roadmap_risks").insert(mapRiskToDb(r)).select().single();
  if (error) throw error;
  return mapRiskFromDb(data);
};

export const updateRisk = async (id: string, updates: Partial<RoadmapRisk>) => {
  const { data, error } = await supabase.from("roadmap_risks").update(mapRiskToDb(updates)).eq("id", id).select().single();
  if (error) throw error;
  return mapRiskFromDb(data);
};

export const deleteRisk = async (id: string) => {
  const { error } = await supabase.from("roadmap_risks").delete().eq("id", id);
  if (error) throw error;
};

// ----------------------------------------------------
// Realtime Subscriptions
// ----------------------------------------------------

export const subscribeToRoadmap = (table: string, callback: () => void) => {
  const channelId = `${table}-realtime-${Math.random().toString(36).substring(2, 9)}`;
  const channel = supabase
    .channel(channelId)
    .on("postgres_changes", { event: "*", schema: "public", table }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
};

// ----------------------------------------------------
// Automation Engine: Recursive recalculations
// ----------------------------------------------------

export const syncAllProgress = async () => {
  try {
    // 1. Fetch all active roadmap items
    const [phases, objectives, milestones, epics] = await Promise.all([
      supabase.from("roadmap_phases").select("*"),
      supabase.from("roadmap_objectives").select("*"),
      supabase.from("roadmap_milestones").select("*"),
      supabase.from("roadmap_epics").select("*"),
    ]);

    const { data: tasks } = await supabase.from("tasks").select("*");
    if (!tasks) return;

    // Helper to calculate progress of a single task
    const getTaskProgressVal = (t: any): number => {
      if (t.status === "done") return 100;
      if (t.subtasks && t.subtasks.length > 0) {
        const completed = t.subtasks.filter((s: any) => s.done).length;
        return Math.round((completed / t.subtasks.length) * 100);
      }
      if (t.status === "doing") return 50;
      return 0;
    };

    // Calculate marketing progress contributor
    const { data: campaigns } = await supabase.from("roadmap_marketing").select("*");
    // Calculate hiring progress contributor
    const { data: roles } = await supabase.from("roadmap_hiring").select("*");
    // Calculate actual revenue from income table
    const { data: income } = await supabase.from("income").select("*");

    // Calculate dates & delays to update risks
    const nowStr = new Date().toISOString().split("T")[0];

    // Compute Epics Progress
    const epicProgresses: Record<string, number> = {};
    if (epics.data) {
      for (const epic of epics.data) {
        const linkedTasks = tasks.filter((t: any) => t.epic_id === epic.id);
        const progress = linkedTasks.length > 0
          ? Math.round(linkedTasks.reduce((sum, t) => sum + getTaskProgressVal(t), 0) / linkedTasks.length)
          : 0;
        
        epicProgresses[epic.id] = progress;
        
        const status = progress === 100 ? "completed" : progress > 0 ? "active" : "upcoming";
        
        if (parseFloat(epic.completion_percentage) !== progress || epic.status !== status) {
          await supabase.from("roadmap_epics").update({
            completion_percentage: progress,
            status,
            updated_at: new Date().toISOString()
          }).eq("id", epic.id);
        }
      }
    }

    // Compute Milestones Progress
    const milestoneProgresses: Record<string, number> = {};
    if (milestones.data) {
      for (const ms of milestones.data) {
        const childEpics = epics.data?.filter((e: any) => e.milestone_id === ms.id) || [];
        const linkedTasks = tasks.filter((t: any) => t.milestone_id === ms.id && !t.epic_id);
        
        let progress = 0;
        if (childEpics.length > 0) {
          // Average of child epics
          progress = Math.round(childEpics.reduce((sum, e) => sum + (epicProgresses[e.id] || 0), 0) / childEpics.length);
        } else if (linkedTasks.length > 0) {
          // Average of directly linked tasks
          progress = Math.round(linkedTasks.reduce((sum, t) => sum + getTaskProgressVal(t), 0) / linkedTasks.length);
        }

        milestoneProgresses[ms.id] = progress;
        const status = progress === 100 ? "completed" : progress > 0 ? "active" : "upcoming";

        if (parseFloat(ms.completion_percentage) !== progress || ms.status !== status) {
          await supabase.from("roadmap_milestones").update({
            completion_percentage: progress,
            status,
            updated_at: new Date().toISOString()
          }).eq("id", ms.id);

          if (ms.key_result_id) {
            await supabase.from("key_results").update({
              completion_percentage: progress,
              current_value: progress,
              status: status === "completed" ? "completed" : "active"
            }).eq("id", ms.key_result_id);
          }
        }

        // Delay Risk Raise Check: If milestone is past its target_date and is not completed, auto escalate risks linked to it
        if (ms.target_date && ms.target_date < nowStr && progress < 100) {
          const { data: linkedRisks } = await supabase.from("roadmap_risks").select("*").eq("milestone_id", ms.id);
          if (linkedRisks) {
            for (const r of linkedRisks) {
              if (r.status !== "critical" && r.status !== "resolved") {
                await supabase.from("roadmap_risks").update({
                  status: "critical",
                  impact: "Critical"
                }).eq("id", r.id);
              }
            }
          }
        }
      }
    }

    // Compute Objectives Progress
    const objectiveProgresses: Record<string, number> = {};
    if (objectives.data) {
      for (const obj of objectives.data) {
        const childMs = milestones.data?.filter((m: any) => m.objective_id === obj.id) || [];
        const progress = childMs.length > 0
          ? Math.round(childMs.reduce((sum, m) => sum + (milestoneProgresses[m.id] || 0), 0) / childMs.length)
          : 0;

        objectiveProgresses[obj.id] = progress;
        const status = progress === 100 ? "completed" : progress > 0 ? "active" : "upcoming";

        if (parseFloat(obj.completion_percentage) !== progress || obj.status !== status) {
          await supabase.from("roadmap_objectives").update({
            completion_percentage: progress,
            status,
            updated_at: new Date().toISOString()
          }).eq("id", obj.id);

          if (obj.goal_id) {
            await supabase.from("goals").update({
              progress,
              status: status === "completed" ? "completed" : "active"
            }).eq("id", obj.goal_id);
          }
        }
      }
    }

    // Compute Phase Progress
    if (phases.data) {
      // Sort phases to handle serial unlocks (Phase 1 -> 1.5 -> 2 -> 2.5 -> 3)
      const sortedPhases = [...phases.data].sort((a, b) => a.title.localeCompare(b.title));

      for (let i = 0; i < sortedPhases.length; i++) {
        const phase = sortedPhases[i];
        
        // Compute progress based on objectives
        const childObjs = objectives.data?.filter((obj: any) => obj.phase_id === phase.id) || [];
        
        // Calculate marketing campaigns progress contributor for this phase
        const phaseCampaigns = campaigns?.filter((m: any) => m.phase_id === phase.id) || [];
        const marketingContrib = phaseCampaigns.length > 0
          ? phaseCampaigns.reduce((sum, m) => sum + parseFloat(m.completion_percentage || 0), 0) / phaseCampaigns.length
          : 100; // If no marketing campaigns, don't penalize progress

        // Calculate hiring progress contributor for this phase
        const phaseHiring = roles?.filter((h: any) => h.phase_id === phase.id) || [];
        const hiringContrib = phaseHiring.length > 0
          ? (phaseHiring.filter((h: any) => h.status === "filled").length / phaseHiring.length) * 100
          : 100;

        // Base progress is average of objectives (80%), hiring (10%), marketing (10%)
        let progress = 0;
        if (childObjs.length > 0) {
          const objsAvg = childObjs.reduce((sum, obj) => sum + (objectiveProgresses[obj.id] || 0), 0) / childObjs.length;
          
          let weights = 0.8;
          let calculated = objsAvg * 0.8;

          if (phaseCampaigns.length > 0) {
            calculated += marketingContrib * 0.1;
            weights += 0.1;
          }
          if (phaseHiring.length > 0) {
            calculated += hiringContrib * 0.1;
            weights += 0.1;
          }

          progress = Math.round(calculated / weights);
        } else {
          progress = 0;
        }

        let status = phase.status;
        if (progress === 100 && phase.status !== "completed") {
          status = "completed";

          // Log Phase Unlock Activity
          await supabase.from("activity").insert({
            action: `Phase unlocked: Strategy Phase ${sortedPhases[i+1]?.title || 'Final'} is now active!`,
            entity_type: "roadmap",
            entity_id: phase.id,
            entity_title: `Unlock: ${phase.title}`,
            metadata: { type: "completed" }
          });

          // Automatically unlock next phase
          if (i + 1 < sortedPhases.length) {
            const nextPhase = sortedPhases[i + 1];
            if (nextPhase.status === "locked" || nextPhase.status === "upcoming") {
              await supabase.from("roadmap_phases").update({
                status: "active",
                updated_at: new Date().toISOString()
              }).eq("id", nextPhase.id);
            }
          }
        } else if (progress < 100 && phase.status === "completed") {
          status = "active";
        }

        if (parseFloat(phase.completion_percentage) !== progress || phase.status !== status) {
          await supabase.from("roadmap_phases").update({
            completion_percentage: progress,
            status,
            updated_at: new Date().toISOString()
          }).eq("id", phase.id);
        }
      }
    }

    // Sync Finance actuals
    const { data: finances } = await supabase.from("roadmap_finance").select("*");
    if (finances && income) {
      for (const fin of finances) {
        // Map Month name target like "Month 1" or month-year to income items.
        // For simplicity, we calculate total revenue of the category "Revenue" or "Grant" received during the phase.
        // Let's sum income amounts that fit the phase. Since phase has start/target dates, let's filter income by date.
        const { data: phase } = await supabase.from("roadmap_phases").select("start_date, target_date").eq("id", fin.phase_id).single();
        if (phase) {
          const phaseStart = phase.start_date || "2000-01-01";
          const phaseTarget = phase.target_date || "2050-12-31";
          
          // Let's filter income received within this phase's timeline
          const phaseIncome = income.filter((inc: any) => {
            const date = inc.income_date ? inc.income_date.split("T")[0] : inc.created_at.split("T")[0];
            return date >= phaseStart && date <= phaseTarget;
          });

          // Wait, month targets are subsets. Let's distribute.
          // For initial imports, we can assign actual revenue to the finance records.
          // Total actual revenue in this phase:
          const totalActual = phaseIncome.reduce((sum, item) => sum + parseFloat(item.amount), 0);
          
          // Let's divide actual revenue amongst the monthly intervals of this phase
          const monthsInPhase = finances.filter(f => f.phase_id === fin.phase_id).length;
          const distributedActual = monthsInPhase > 0 ? totalActual / monthsInPhase : 0;

          if (parseFloat(fin.actual_revenue) !== Math.round(distributedActual)) {
            await supabase.from("roadmap_finance").update({
              actual_revenue: Math.round(distributedActual)
            }).eq("id", fin.id);

            // If actual meets target, mark the financial milestones of that phase completed!
            if (distributedActual >= parseFloat(fin.monthly_target || 0)) {
              const { data: financeMilestones } = await supabase.from("roadmap_milestones")
                .select("*")
                .eq("objective_id", fin.phase_id) // or link by name
                .ilike("title", "%revenue%");
              if (financeMilestones) {
                for (const ms of financeMilestones) {
                  if (ms.status !== "completed") {
                    await supabase.from("roadmap_milestones").update({
                      completion_percentage: 100,
                      status: "completed"
                    }).eq("id", ms.id);
                  }
                }
              }
            }
          }
        }
      }
    }

  } catch (error) {
    console.error("Progress synchronization error:", error);
  }
};

// ----------------------------------------------------
// PDF Data Importer
// ----------------------------------------------------

export const importMasterStrategy = async () => {
  try {
    // 1. Clear any existing roadmap data to avoid duplicates
    await supabase.from("roadmap_phases").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("key_results").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("roadmap_risks").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 2. Insert Phases
    const phasesData: any[] = [
      {
        title: "Phase 1",
        description: "Beta Test & Core Product Validation in TVM (Android only)",
        owner: "Asher",
        priority: "high",
        startDate: "2026-08-01",
        targetDate: "2027-01-31",
        status: "active",
        notes: "Zero commission beta. Bootstrapped under ₹18,000 budget."
      },
      {
        title: "Phase 1.5",
        description: "Proper Launch & Supply Expansion (TVM + Kochi)",
        owner: "Sourabh",
        priority: "high",
        startDate: "2027-01-01",
        targetDate: "2027-07-31",
        status: "locked",
        notes: "DPIIT & Startup India registrations. Govt grant funding ₹25-50L. Commission models start."
      },
      {
        title: "Phase 2",
        description: "South India Expansion (5 major cities)",
        owner: "Subin",
        priority: "high",
        startDate: "2027-10-01",
        targetDate: "2029-04-30",
        status: "locked",
        notes: "Seed Round ₹1.5-2 Cr target. Hires developers and city managers. Monthly revenue ₹22-25L target."
      },
      {
        title: "Phase 2.5",
        description: "Consolidation & Service Expansion (EV charging, Painting, Towing)",
        owner: "Asher",
        priority: "medium",
        startDate: "2029-05-01",
        targetDate: "2030-12-31",
        status: "locked",
        notes: "Series A ₹2-3 Cr. 7 cities, 700+ partners, financial break-even by April-June 2030."
      },
      {
        title: "Phase 3",
        description: "Pan India Scale (20+ cities, ARR 200 Cr+ path)",
        owner: "Sourabh",
        priority: "urgent",
        startDate: "2031-01-01",
        targetDate: "2033-12-31",
        status: "locked",
        notes: "Series B ₹15-25 Cr. Launch roadside assistance & B2B wholesale marketplace."
      }
    ];

    const insertedPhases: RoadmapPhase[] = [];
    for (const p of phasesData) {
      const { data, error } = await supabase.from("roadmap_phases").insert(mapPhaseToDb(p)).select().single();
      if (error) throw error;
      insertedPhases.push(mapPhaseFromDb(data));
    }

    // Index mappings
    const p1 = insertedPhases[0];
    const p15 = insertedPhases[1];
    const p2 = insertedPhases[2];
    const p25 = insertedPhases[3];
    const p3 = insertedPhases[4];

    // 3. Insert Objectives & Goals
    const objectivesData: any[] = [
      // Phase 1
      { phaseId: p1.id, title: "Validate Product-Market Fit", description: "Verify that 40% of the first 500 users return and book within 30 days.", owner: "Asher", priority: "high", targetDate: "2026-11-30", status: "active" },
      { phaseId: p1.id, title: "Onboard Initial Partner Density", description: "Sign up 30+ active car wash partners across Thiruvananthapuram.", owner: "Subin", priority: "medium", targetDate: "2026-12-31", status: "active" },
      { phaseId: p1.id, title: "Deploy Core B2C & B2B Dashboard", description: "Launch Slot booking, Realtime Queue, and Bay-level Dashboard.", owner: "Asher", priority: "high", targetDate: "2026-08-31", status: "active" },
      
      // Phase 1.5
      { phaseId: p15.id, title: "Expand Supply to Kochi", description: "Onboard Kochi partners and setup ground operations team.", owner: "Sourabh", priority: "high", targetDate: "2027-04-30", status: "upcoming" },
      { phaseId: p15.id, title: "Secure Government Non-dilutive Funding", description: "Apply to KSUM & DPIIT schemes to secure ₹25-50L grants.", owner: "Subin", priority: "high", targetDate: "2027-02-28", status: "upcoming" },
      { phaseId: p15.id, title: "Launch iOS Client Application", description: "Build and submit React Native build to Apple Developer Portal.", owner: "Asher", priority: "medium", targetDate: "2027-06-30", status: "upcoming" }
    ];

    const insertedObjectives: RoadmapObjective[] = [];
    for (const obj of objectivesData) {
      // Auto create linked goal
      const newGoal = await createGoal({
        title: obj.title,
        description: obj.description,
        targetDate: obj.targetDate,
        progress: 0,
        linkedTaskIds: [],
        status: "active",
        category: obj.owner === "Asher" ? "product" : obj.owner === "Subin" ? "finance" : "growth"
      });

      const dbData = mapObjectiveToDb(obj);
      dbData.goal_id = newGoal.id;

      const { data, error } = await supabase.from("roadmap_objectives").insert(dbData).select().single();
      if (error) throw error;
      insertedObjectives.push(mapObjectiveFromDb(data));
    }

    const o1 = insertedObjectives[0]; // PMF
    const o2 = insertedObjectives[1]; // Partners TVM
    const o3 = insertedObjectives[2]; // Core Dashboard
    const o4 = insertedObjectives[3]; // Kochi Expansion
    const o5 = insertedObjectives[4]; // Govt Grants

    // 4. Insert Milestones & Key Results
    const milestonesData: any[] = [
      // PMF
      { objectiveId: o1.id, title: "Achieve 40%+ Repeat Booking Rate", description: "10+ users or 40% of first 500 users make consecutive bookings in 30 days.", owner: "Asher", priority: "high", targetDate: "2026-12-31" },
      { objectiveId: o1.id, title: "Maintain 4.0+ App Store Rating", description: "Gather early user reviews and resolve bugs immediately.", owner: "Asher", priority: "medium", targetDate: "2026-10-31" },
      
      // Partners TVM
      { objectiveId: o2.id, title: "Contract 30+ Active Car Wash Centers", description: "Focus on capturing high-intent walk-in slots in TVM.", owner: "Subin", priority: "high", targetDate: "2026-12-31" },
      { objectiveId: o2.id, title: "Deploy QR Posters in 10 Core Centers", description: "Setup 3 QR posters per center to capture captive audiences.", owner: "Sourabh", priority: "medium", targetDate: "2026-09-15" },
      
      // Core Dashboard
      { objectiveId: o3.id, title: "Deploy Bay-Level dashboard with walk-in toggle", description: "Allow center owners to update queues via simple timelines.", owner: "Asher", priority: "high", targetDate: "2026-08-15" },
      { objectiveId: o3.id, title: "Integrate Razorpay UPI Checkout", description: "Upfront slot payment to eliminate cancellations and no-shows.", owner: "Asher", priority: "high", targetDate: "2026-08-20" },
      { objectiveId: o3.id, title: "Deploy emergency vehicle vault and challan tracker", description: "Vault uploads for RC/PUC with alerts, fuel monitor, and expense summaries.", owner: "Asher", priority: "medium", targetDate: "2026-08-30" },

      // Kochi Expansion
      { objectiveId: o4.id, title: "Launch Kochi Ground Operations", description: "Establish partnerships with 15+ car wash centers in Kochi.", owner: "Sourabh", priority: "high", targetDate: "2027-05-31" },
      
      // Govt grants
      { objectiveId: o5.id, title: "KSUM Seed Fund & DPIIT Registration", description: "Register LLP and apply to Startup India / KSUM grants.", owner: "Subin", priority: "high", targetDate: "2027-01-31" }
    ];

    for (const ms of milestonesData) {
      // Find goal of objective
      const { data: obj } = await supabase.from("roadmap_objectives").select("goal_id").eq("id", ms.objectiveId).single();
      const dbData = mapMilestoneToDb({
        ...ms,
        status: "upcoming",
        completionPercentage: 0,
        dependencies: []
      });

      if (obj?.goal_id) {
        const { data: kr, error: krErr } = await supabase.from("key_results").insert({
          goal_id: obj.goal_id,
          title: ms.title,
          description: ms.description,
          target_value: 100.0,
          current_value: 0.0,
          completion_percentage: 0.0,
          status: "active"
        }).select().single();
        if (!krErr) {
          dbData.key_result_id = kr.id;
        }
      }

      const { error } = await supabase.from("roadmap_milestones").insert(dbData);
      if (error) throw error;
    }

    // 5. Insert Hiring Roadmap
    const hiringData = [
      { phase_id: p15.id, role: "City Manager (Kochi)", department: "Operations", owner: "Sourabh", budget: 30000, status: "upcoming", start_date: "2027-06-01", target_date: "2027-07-01", notes: "Kochi expansion ground manager." },
      { phase_id: p2.id, role: "React Native Developer", department: "Engineering", owner: "Asher", budget: 55000, status: "upcoming", start_date: "2027-10-01", target_date: "2027-11-01", notes: "Accelerate mobile app features." },
      { phase_id: p2.id, role: "Backend Developer (Node/Supabase)", department: "Engineering", owner: "Asher", budget: 45000, status: "upcoming", start_date: "2027-10-01", target_date: "2027-11-01", notes: "Optimize servers and database." },
      { phase_id: p2.id, role: "Customer Support Lead", department: "Operations", owner: "Subin", budget: 25000, status: "upcoming", start_date: "2027-11-01", target_date: "2027-12-01", notes: "Handle partner/user queries." },
      { phase_id: p2.id, role: "City Manager (Chennai)", department: "Operations", owner: "Sourabh", budget: 35000, status: "upcoming", start_date: "2028-01-01", target_date: "2028-02-01" },
      { phase_id: p2.id, role: "City Manager (Bengaluru)", department: "Operations", owner: "Sourabh", budget: 40000, status: "upcoming", start_date: "2028-04-01", target_date: "2028-05-01" }
    ];
    await supabase.from("roadmap_hiring").insert(hiringData);

    // 6. Insert Marketing Strategy
    const marketingData = [
      { phase_id: p1.id, campaign_name: "QR Posters in Wash Centers", status: "active", budget: 1500, expected_outcome: "Capture physical walk-in customers.", deadline: "2026-09-30", completion_percentage: 20, owner: "Sourabh" },
      { phase_id: p1.id, campaign_name: "Technopark IT Park drops", status: "active", budget: 0, expected_outcome: "Acquire early adopter tech professionals.", deadline: "2026-10-31", completion_percentage: 10, owner: "Sourabh" },
      { phase_id: p1.id, campaign_name: "Referral Viral Loop (Month 2)", status: "upcoming", budget: 5000, expected_outcome: "₹50 off both sides to fuel word-of-mouth.", deadline: "2026-11-30", completion_percentage: 0, owner: "Sourabh" },
      { phase_id: p15.id, campaign_name: "Kochi Ground Flyer & Posters Campaign", status: "upcoming", budget: 9000, expected_outcome: "Kickstart Kochi supply-demand loops.", deadline: "2027-04-30", completion_percentage: 0, owner: "Sourabh" },
      { phase_id: p15.id, campaign_name: "Meta Ads Hyperlocal Reels (Facebook/Insta)", status: "upcoming", budget: 25000, expected_outcome: "Drive slot bookings in TVM + Kochi.", deadline: "2027-07-31", completion_percentage: 0, owner: "Sourabh" }
    ];
    await supabase.from("roadmap_marketing").insert(marketingData);

    // 7. Insert Finance targets
    const financeData = [
      { phase_id: p1.id, month_name: "Month 1 (Launch)", projected_bookings: 40, projected_revenue: 0, actual_revenue: 0, monthly_target: 0, notes: "Validation phase. Free bookings." },
      { phase_id: p1.id, month_name: "Month 2 (Monsoon)", projected_bookings: 90, projected_revenue: 0, actual_revenue: 0, monthly_target: 0 },
      { phase_id: p1.id, month_name: "Month 3", projected_bookings: 160, projected_revenue: 0, actual_revenue: 0, monthly_target: 0 },
      { phase_id: p1.id, month_name: "Month 4", projected_bookings: 120, projected_revenue: 0, actual_revenue: 0, monthly_target: 0 },
      { phase_id: p1.id, month_name: "Month 5", projected_bookings: 120, projected_revenue: 0, actual_revenue: 0, monthly_target: 0 },
      { phase_id: p1.id, month_name: "Month 6", projected_bookings: 280, projected_revenue: 0, actual_revenue: 0, monthly_target: 0 },
      
      { phase_id: p15.id, month_name: "Month 7 (1.5 Start)", projected_bookings: 450, projected_revenue: 11250, actual_revenue: 0, monthly_target: 10000, notes: "Commission starts." },
      { phase_id: p15.id, month_name: "Month 8", projected_bookings: 800, projected_revenue: 20000, actual_revenue: 0, monthly_target: 20000 },
      { phase_id: p15.id, month_name: "Month 9", projected_bookings: 1500, projected_revenue: 37500, actual_revenue: 0, monthly_target: 35000 },
      { phase_id: p15.id, month_name: "Month 10", projected_bookings: 2000, projected_revenue: 50000, actual_revenue: 0, monthly_target: 50000 },
      { phase_id: p15.id, month_name: "Month 11", projected_bookings: 2500, projected_revenue: 62500, actual_revenue: 0, monthly_target: 60000 },
      { phase_id: p15.id, month_name: "Month 12", projected_bookings: 3000, projected_revenue: 75000, actual_revenue: 0, monthly_target: 75000 }
    ];
    await supabase.from("roadmap_finance").insert(financeData);

    // 8. Insert Risks
    const risksData = [
      { title: "Owner doesn't honor bookings (walk-in first)", description: "Verbal agreement conflicts when cash is standing in front of owner.", probability: "High", impact: "Critical", owner: "Subin", status: "open", mitigation: "Bay-level dashboard makes conflicts visual so owners self-manage. Reliability scores visible to users." },
      { title: "Low B2C user retention (repeat rate <25%)", description: "Users try app once and return to walk-in habits.", probability: "Medium", impact: "Critical", owner: "Asher", status: "open", mitigation: "If repeat rate is below 25%, halt expansion. Refine calendar notifications, pricing, and center verification." },
      { title: "Challan API failure rate > 15%", description: "Parivahan wrapper times out or fails on real KL vehicle plates.", probability: "Medium", impact: "High", owner: "Asher", status: "open", mitigation: "Pre-test with 20+ real numbers. Fail gracefully and output fallback manual query link." },
      { title: "WhatsApp Meta template rejection", description: "Meta rejects templates for booking confirmation or ready alerts.", probability: "Medium", impact: "High", owner: "Asher", status: "open", mitigation: "Submit templates 2 weeks before launch. Prep 2-3 alternate phrasings." },
      { title: "Monsoon drop in car wash demand", description: "Heavy rains in Month 4-5 drops demand to zero.", probability: "High", impact: "Medium", owner: "Sourabh", status: "open", mitigation: "Stop marketing ads completely. Use downtime to onboard partners and optimize product bugs." }
    ];
    await supabase.from("roadmap_risks").insert(risksData);

    // Run Initial Synchronization
    await syncAllProgress();
    return true;
  } catch (error: any) {
    const errDetails = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : typeof error === "object" && error !== null
      ? JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)))
      : String(error);
    console.error("Strategy import failed details:", errDetails);
    throw error;
  }
};
