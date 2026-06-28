import { create } from "zustand";
import type {
  RoadmapPhase,
  RoadmapObjective,
  RoadmapMilestone,
  RoadmapEpic,
  KeyResult,
  RoadmapHiring,
  RoadmapMarketing,
  RoadmapFinance,
  RoadmapRisk
} from "@/lib/types";
import {
  getPhases, updatePhase,
  getObjectives, createObjective, updateObjective, deleteObjective,
  getKeyResults,
  getMilestones, createMilestone, updateMilestone, deleteMilestone,
  getEpics, createEpic, updateEpic, deleteEpic,
  getHiring, createHiring, updateHiring, deleteHiring,
  getMarketing, createMarketing, updateMarketing, deleteMarketing,
  getFinance, createFinance, updateFinance, deleteFinance,
  getRisks, createRisk, updateRisk, deleteRisk,
  subscribeToRoadmap, syncAllProgress, importMasterStrategy
} from "@/lib/supabase/roadmap";

interface RoadmapStore {
  phases: RoadmapPhase[];
  objectives: RoadmapObjective[];
  milestones: RoadmapMilestone[];
  epics: RoadmapEpic[];
  keyResults: KeyResult[];
  hiring: RoadmapHiring[];
  marketing: RoadmapMarketing[];
  finance: RoadmapFinance[];
  risks: RoadmapRisk[];
  loading: boolean;
  error: string | null;

  fetchRoadmapData: () => Promise<void>;
  subscribeToRoadmapChanges: () => () => void;
  triggerSync: () => Promise<void>;
  importStrategy: () => Promise<boolean>;

  // Phase Actions
  editPhase: (id: string, updates: Partial<RoadmapPhase>) => Promise<void>;

  // Objective Actions
  addObjective: (obj: Omit<RoadmapObjective, "id" | "createdAt" | "updatedAt" | "completionPercentage">) => Promise<void>;
  editObjective: (id: string, updates: Partial<RoadmapObjective>) => Promise<void>;
  removeObjective: (id: string) => Promise<void>;

  // Milestone Actions
  addMilestone: (m: Omit<RoadmapMilestone, "id" | "createdAt" | "updatedAt" | "completionPercentage">) => Promise<void>;
  editMilestone: (id: string, updates: Partial<RoadmapMilestone>) => Promise<void>;
  removeMilestone: (id: string) => Promise<void>;

  // Epic Actions
  addEpic: (e: Omit<RoadmapEpic, "id" | "createdAt" | "updatedAt" | "completionPercentage">) => Promise<void>;
  editEpic: (id: string, updates: Partial<RoadmapEpic>) => Promise<void>;
  removeEpic: (id: string) => Promise<void>;

  // Hiring Actions
  addHiring: (h: Omit<RoadmapHiring, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  editHiring: (id: string, updates: Partial<RoadmapHiring>) => Promise<void>;
  removeHiring: (id: string) => Promise<void>;

  // Marketing Actions
  addMarketing: (m: Omit<RoadmapMarketing, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  editMarketing: (id: string, updates: Partial<RoadmapMarketing>) => Promise<void>;
  removeMarketing: (id: string) => Promise<void>;

  // Finance Actions
  addFinance: (f: Omit<RoadmapFinance, "id" | "createdAt" | "updatedAt" | "actualRevenue">) => Promise<void>;
  editFinance: (id: string, updates: Partial<RoadmapFinance>) => Promise<void>;
  removeFinance: (id: string) => Promise<void>;

  // Risk Actions
  addRisk: (r: Omit<RoadmapRisk, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  editRisk: (id: string, updates: Partial<RoadmapRisk>) => Promise<void>;
  removeRisk: (id: string) => Promise<void>;
}

export const useRoadmapStore = create<RoadmapStore>((set, get) => ({
  phases: [],
  objectives: [],
  milestones: [],
  epics: [],
  keyResults: [],
  hiring: [],
  marketing: [],
  finance: [],
  risks: [],
  loading: true,
  error: null,

  fetchRoadmapData: async () => {
    set({ loading: true, error: null });
    try {
      const [
        pList, oList, mList, eList, krList,
        hList, mkList, fList, rList
      ] = await Promise.all([
        getPhases(), getObjectives(), getMilestones(), getEpics(), getKeyResults(),
        getHiring(), getMarketing(), getFinance(), getRisks()
      ]);

      set({
        phases: pList,
        objectives: oList,
        milestones: mList,
        epics: eList,
        keyResults: krList,
        hiring: hList,
        marketing: mkList,
        finance: fList,
        risks: rList,
        loading: false
      });
    } catch (err: any) {
      // In case tables do not exist yet, set relation error
      set({ error: err.message || String(err), loading: false });
    }
  },

  subscribeToRoadmapChanges: () => {
    // Initial fetch
    get().fetchRoadmapData();

    // Set up real-time channel listeners for all roadmap tables
    const tables = [
      "roadmap_phases", "roadmap_objectives", "roadmap_milestones",
      "roadmap_epics", "key_results", "roadmap_hiring",
      "roadmap_marketing", "roadmap_finance", "roadmap_risks"
    ];

    const unsubs = tables.map(table =>
      subscribeToRoadmap(table, () => {
        get().fetchRoadmapData();
      })
    );

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  },

  triggerSync: async () => {
    await syncAllProgress();
    await get().fetchRoadmapData();
  },

  importStrategy: async () => {
    set({ loading: true });
    try {
      const success = await importMasterStrategy();
      await get().fetchRoadmapData();
      return success;
    } catch (err: any) {
      set({ error: err.message || String(err), loading: false });
      return false;
    }
  },

  // Phase CRUD
  editPhase: async (id, updates) => {
    await updatePhase(id, updates);
    await get().triggerSync();
  },

  // Objective CRUD
  addObjective: async (obj) => {
    await createObjective(obj);
    await get().triggerSync();
  },
  editObjective: async (id, updates) => {
    await updateObjective(id, updates);
    await get().triggerSync();
  },
  removeObjective: async (id) => {
    await deleteObjective(id);
    await get().triggerSync();
  },

  // Milestone CRUD
  addMilestone: async (m) => {
    await createMilestone(m);
    await get().triggerSync();
  },
  editMilestone: async (id, updates) => {
    await updateMilestone(id, updates);
    await get().triggerSync();
  },
  removeMilestone: async (id) => {
    await deleteMilestone(id);
    await get().triggerSync();
  },

  // Epic CRUD
  addEpic: async (e) => {
    await createEpic(e);
    await get().triggerSync();
  },
  editEpic: async (id, updates) => {
    await updateEpic(id, updates);
    await get().triggerSync();
  },
  removeEpic: async (id) => {
    await deleteEpic(id);
    await get().triggerSync();
  },

  // Hiring CRUD
  addHiring: async (h) => {
    await createHiring(h);
    await get().triggerSync();
  },
  editHiring: async (id, updates) => {
    await updateHiring(id, updates);
    await get().triggerSync();
  },
  removeHiring: async (id) => {
    await deleteHiring(id);
    await get().triggerSync();
  },

  // Marketing CRUD
  addMarketing: async (m) => {
    await createMarketing(m);
    await get().triggerSync();
  },
  editMarketing: async (id, updates) => {
    await updateMarketing(id, updates);
    await get().triggerSync();
  },
  removeMarketing: async (id) => {
    await deleteMarketing(id);
    await get().triggerSync();
  },

  // Finance CRUD
  addFinance: async (f) => {
    await createFinance(f);
    await get().triggerSync();
  },
  editFinance: async (id, updates) => {
    await updateFinance(id, updates);
    await get().triggerSync();
  },
  removeFinance: async (id) => {
    await deleteFinance(id);
    await get().triggerSync();
  },

  // Risk CRUD
  addRisk: async (r) => {
    await createRisk(r);
    await get().triggerSync();
  },
  editRisk: async (id, updates) => {
    await updateRisk(id, updates);
    await get().triggerSync();
  },
  removeRisk: async (id) => {
    await deleteRisk(id);
    await get().triggerSync();
  },
}));
