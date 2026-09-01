"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, isPast, differenceInDays } from "date-fns";
import {
  TrendingUp, Target, Calendar as CalendarIcon, DollarSign, Users, Megaphone, AlertTriangle, Play,
  ChevronDown, ChevronRight, Plus, Edit2, Trash2, CheckCircle2, Clock, HelpCircle, Lock,
  ArrowRight, Search, Send, Sparkles, AlertCircle, FileText, Check, Settings, X, PlusCircle, Briefcase, Bot
} from "lucide-react";
import { useRoadmapStore } from "@/store/useRoadmapStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useGoalStore } from "@/store/useGoalStore";
import { useMeetingStore } from "@/store/useMeetingStore";
import { useIncomeStore } from "@/store/useIncomeStore";
import { useUIStore } from "@/store/useUIStore";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  RoadmapPhase, RoadmapObjective, RoadmapMilestone, RoadmapEpic, KeyResult,
  RoadmapHiring, RoadmapMarketing, RoadmapFinance, RoadmapRisk, Task, Goal, Meeting, Person, Priority
} from "@/lib/types";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";

// Color palettes for UI hierarchy
const PHASE_COLORS = ["#FFC107", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899"];
const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#3b82f6",
  low: "#10b981"
};

export default function RoadmapPage() {
  const {
    phases, objectives, milestones, epics, hiring, marketing, finance, risks, keyResults,
    loading: storeLoading, error, fetchRoadmapData, subscribeToRoadmapChanges, triggerSync,
    importStrategy, editPhase, addObjective, editObjective, removeObjective,
    addMilestone, editMilestone, removeMilestone, addEpic, editEpic, removeEpic,
    addHiring, editHiring, removeHiring, addMarketing, editMarketing, removeMarketing,
    addFinance, editFinance, removeFinance, addRisk, editRisk, removeRisk
  } = useRoadmapStore();

  const { tasks, subscribeToTasks, addTask, updateTask, deleteTask } = useTaskStore();
  const { goals, subscribeToGoals, addGoal, updateGoal: updateGeneralGoal } = useGoalStore();
  const { meetings } = useMeetingStore();
  const { currentUser } = useUIStore();

  const [activeTab, setActiveTab] = useState<"tree" | "timeline" | "calendar" | "finance" | "hiring" | "marketing" | "risks">("tree");
  const [activeTimelineView, setActiveTimelineView] = useState<"timeline" | "quarter" | "year">("timeline");
  
  // Tree state: which nodes are expanded
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ "Phase 1": true });

  // Dialog/Modal states
  const [isImporting, setIsImporting] = useState(false);
  const [editingItem, setEditingItem] = useState<{ type: string; data?: any; parentId?: string } | null>(null);
  
  // SQL script copy helper
  const [copiedSql, setCopiedSql] = useState(false);

  // Calendar states
  const [calendarDate, setCalendarDate] = useState<Date>(new Date(2026, 7, 1)); // start on Aug 2026

  // AI Copilot states
  const [chatOpen, setChatOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    { role: "assistant", content: "Hi! I am your AutoBee Master Strategy Copilot. Ask me anything about our company roadmap, hiring timeline, marketing targets, or strategic risks!" }
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubRoadmap = subscribeToRoadmapChanges();
    const unsubTasks = subscribeToTasks();
    const unsubGoals = subscribeToGoals();
    return () => {
      unsubRoadmap();
      unsubTasks();
      unsubGoals();
    };
  }, [subscribeToRoadmapChanges, subscribeToTasks, subscribeToGoals]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  // Sync progress automatically on data load
  useEffect(() => {
    if (phases.length > 0) {
      triggerSync();
    }
  }, [phases.length, tasks.length]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleImportStrategy = async () => {
    setIsImporting(true);
    try {
      await importStrategy();
    } catch (err) {
      console.error(err);
    } finally {
      setIsImporting(false);
    }
  };

  // SQL Migration text
  const sqlMigrationCode = `-- Copy and run this in your Supabase SQL editor:
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS milestone_id UUID;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS epic_id UUID;

CREATE TABLE IF NOT EXISTS public.roadmap_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    owner TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    start_date DATE,
    target_date DATE,
    completion_percentage NUMERIC(5, 2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'upcoming',
    notes TEXT,
    dependencies JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Note: Download the full SQL setup from public/supabase/roadmap_setup.sql to execute all tables.`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlMigrationCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  // ----------------------------------------------------
  // AI Copilot Integration
  // ----------------------------------------------------
  const handleSendQuery = async () => {
    if (!query.trim() || aiLoading) return;
    const userMsg = query.trim();
    setQuery("");
    setChatHistory(prev => [...prev, { role: "user", content: userMsg }]);
    setAiLoading(true);

    // Build the roadmap context for Gemini
    const context = `You are the AutoBee OS Master Strategy AI Copilot. You have access to the founders' live company roadmap database.
Here is the current state of our Company Roadmap:
PHASES:
${phases.map(p => `- ${p.title} (${p.status}): ${p.completionPercentage}% complete. Start: ${p.startDate}, Target: ${p.targetDate}. Owner: ${p.owner}. Notes: ${p.notes}`).join("\n")}

OBJECTIVES:
${objectives.map(o => `- ${o.title} (under Phase ID ${o.phaseId}): ${o.completionPercentage}% complete. Goal Link: ${o.goalId}`).join("\n")}

MILESTONES & KR:
${milestones.map(m => `- ${m.title} (under Objective ID ${m.objectiveId}): ${m.completionPercentage}% complete. Key Result ID: ${m.keyResultId || 'none'}`).join("\n")}

HIRING PIPELINE:
${hiring.map(h => `- ${h.role} (${h.status}) - Budget: ₹${h.budget}/mo. Target: ${h.targetDate}`).join("\n")}

MARKETING STRATEGY:
${marketing.map(mk => `- ${mk.campaignName} (${mk.status}) - Budget: ₹${mk.budget}. Deadline: ${mk.deadline}`).join("\n")}

RISK REGISTER:
${risks.map(r => `- RISK: ${r.title} (${r.status}) - Prob: ${r.probability}, Impact: ${r.impact}. Mitigation: ${r.mitigation}`).join("\n")}

FINANCIAL TARGETS:
${finance.map(f => `- Month Target: ${f.monthName} - Projected Rev: ₹${f.projectedRevenue}, Actual: ₹${f.actualRevenue}`).join("\n")}

TASKS:
${tasks.slice(0, 10).map(t => `- Task: ${t.title} (${t.status}). Assignee: ${t.assignee}. Priority: ${t.priority}`).join("\n")}

Answer the user's question clearly and concisely. Focus on blockers, delayed items (where target date has passed but progress is < 100%), upcoming tasks for the week, and financial performance. Be brief and strategic.`;

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatHistory, { role: "user", content: userMsg }].map(m => ({ role: m.role, content: m.content })),
          context
        })
      });

      if (!response.ok) throw new Error("Failed to communicate with AI endpoint.");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available.");

      const decoder = new TextDecoder();
      let assistantResponse = "";

      setChatHistory(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        assistantResponse += chunk;

        setChatHistory(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantResponse };
          return updated;
        });
      }

    } catch (err: any) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: "assistant", content: `Error: ${err.message || "Something went wrong."}` }]);
    } finally {
      setAiLoading(false);
    }
  };

  // ----------------------------------------------------
  // Calendar Event Mappers
  // ----------------------------------------------------
  const calendarEvents = useMemo(() => {
    const list: Array<{ id: string; date: string; title: string; type: "milestone" | "deadline" | "hiring" | "marketing" | "meeting"; color: string; raw: any }> = [];

    // Milestones
    milestones.forEach(m => {
      if (m.targetDate) {
        list.push({
          id: `m-${m.id}`,
          date: m.targetDate,
          title: `Milestone: ${m.title}`,
          type: "milestone",
          color: "border-amber-500 bg-amber-500/10 text-amber-400",
          raw: m
        });
      }
    });

    // Task Deadlines
    tasks.forEach(t => {
      if (t.deadline) {
        list.push({
          id: `t-${t.id}`,
          date: t.deadline,
          title: `Task Deadline: ${t.title}`,
          type: "deadline",
          color: "border-red-500 bg-red-500/10 text-red-400",
          raw: t
        });
      }
    });

    // Hiring Target Dates
    hiring.forEach(h => {
      if (h.targetDate) {
        list.push({
          id: `h-${h.id}`,
          date: h.targetDate,
          title: `Hire Target: ${h.role}`,
          type: "hiring",
          color: "border-blue-500 bg-blue-500/10 text-blue-400",
          raw: h
        });
      }
    });

    // Marketing Deadlines
    marketing.forEach(mk => {
      if (mk.deadline) {
        list.push({
          id: `mk-${mk.id}`,
          date: mk.deadline,
          title: `Campaign: ${mk.campaignName}`,
          type: "marketing",
          color: "border-pink-500 bg-pink-500/10 text-pink-400",
          raw: mk
        });
      }
    });

    // Meetings
    meetings.forEach(meet => {
      const d = meet.scheduledAt.split("T")[0];
      list.push({
        id: `meet-${meet.id}`,
        date: d,
        title: `Meeting: ${meet.title}`,
        type: "meeting",
        color: "border-green-500 bg-green-500/10 text-green-400",
        raw: meet
      });
    });

    // General Goals
    goals.forEach(g => {
      if (g.targetDate) {
        list.push({
          id: `g-${g.id}`,
          date: g.targetDate,
          title: `Goal: ${g.title}`,
          type: "goal" as any,
          color: "border-rose-500 bg-rose-500/10 text-rose-400",
          raw: g
        });
      }
    });

    return list;
  }, [milestones, tasks, hiring, marketing, meetings, goals]);

  const daysInMonthList = useMemo(() => {
    const start = startOfMonth(calendarDate);
    const end = endOfMonth(calendarDate);
    const startOffset = getDay(start); // 0 = Sunday, 1 = Monday
    const days = eachDayOfInterval({ start, end });

    // Pad beginning of the calendar grid
    const pad = [];
    for (let i = 0; i < (startOffset === 0 ? 6 : startOffset - 1); i++) {
      pad.push(null);
    }
    return [...pad, ...days];
  }, [calendarDate]);

  // Edit Calendar item date handler
  const handleCalendarEventDateUpdate = async (event: any, newDateStr: string) => {
    const { type, raw } = event;
    try {
      if (type === "milestone") {
        await editMilestone(raw.id, { targetDate: newDateStr });
      } else if (type === "deadline") {
        await updateTask(raw.id, { deadline: newDateStr });
      } else if (type === "hiring") {
        await editHiring(raw.id, { targetDate: newDateStr });
      } else if (type === "marketing") {
        await editMarketing(raw.id, { deadline: newDateStr });
      } else if (type === "goal") {
        await updateGeneralGoal(raw.id, { targetDate: newDateStr });
      }
      triggerSync();
    } catch (err) {
      console.error("Failed to update date in Calendar:", err);
    }
  };

  // ----------------------------------------------------
  // Dynamic Warnings & Status Calculations
  // ----------------------------------------------------
  const overallProgress = useMemo(() => {
    if (phases.length === 0) return 0;
    return Math.round(phases.reduce((sum, p) => sum + p.completionPercentage, 0) / phases.length);
  }, [phases]);

  const activePhase = useMemo(() => {
    return phases.find(p => p.status === "active") || phases[0];
  }, [phases]);

  const activeMilestones = useMemo(() => {
    if (!activePhase) return [];
    const activeObjs = objectives.filter(o => o.phaseId === activePhase.id);
    const activeObjIds = activeObjs.map(o => o.id);
    return milestones.filter(m => activeObjIds.includes(m.objectiveId));
  }, [activePhase, objectives, milestones]);

  const nextMilestone = useMemo(() => {
    return activeMilestones.find(m => m.status !== "completed") || activeMilestones[0];
  }, [activeMilestones]);

  const overdueMilestonesCount = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return milestones.filter(m => m.targetDate && m.targetDate < todayStr && m.completionPercentage < 100).length;
  }, [milestones]);

  // Target vs Actual Revenue comparison data
  const revenueChartData = useMemo(() => {
    return finance.map(f => ({
      name: f.monthName,
      Target: f.monthlyTarget,
      Actual: f.actualRevenue
    }));
  }, [finance]);

  // ----------------------------------------------------
  // Custom Modal Save Logic
  // ----------------------------------------------------
  const handleSaveModalItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const { type, data, parentId } = editingItem;

    try {
      if (type === "objective") {
        if (data.id) {
          await editObjective(data.id, data);
        } else {
          await addObjective({ ...data, phaseId: parentId! });
        }
      } else if (type === "milestone") {
        if (data.id) {
          await editMilestone(data.id, data);
        } else {
          await addMilestone({ ...data, objectiveId: parentId! });
        }
      } else if (type === "epic") {
        if (data.id) {
          await editEpic(data.id, data);
        } else {
          await addEpic({ ...data, milestoneId: parentId! });
        }
      } else if (type === "task") {
        if (data.id) {
          await updateTask(data.id, data);
        } else {
          await addTask({
            ...data,
            ...(parentId ? { milestoneId: parentId } : {}),
            assignee: data.assignee || "Sourabh",
            priority: data.priority || "medium",
            status: "todo",
            tags: parentId ? ["Roadmap Task"] : ["General Task"],
            pinned: false,
            archived: false,
            subtasks: [],
            comments: [],
            repeat: "none"
          });
        }
      } else if (type === "goal") {
        if (data.id) {
          await updateGeneralGoal(data.id, data);
        } else {
          await addGoal({
            title: data.title,
            description: data.description || "",
            targetDate: data.targetDate || "",
            progress: data.progress || 0,
            linkedTaskIds: [],
            status: data.status || "active",
            category: data.category || "startup"
          });
        }
      } else if (type === "hiring") {
        if (data.id) {
          await editHiring(data.id, data);
        } else {
          await addHiring({ ...data, phaseId: parentId! });
        }
      } else if (type === "marketing") {
        if (data.id) {
          await editMarketing(data.id, data);
        } else {
          await addMarketing({ ...data, phaseId: parentId! });
        }
      } else if (type === "finance") {
        if (data.id) {
          await editFinance(data.id, data);
        } else {
          await addFinance({ ...data, phaseId: parentId! });
        }
      } else if (type === "risk") {
        if (data.id) {
          await editRisk(data.id, data);
        } else {
          await addRisk({ ...data, milestoneId: parentId || undefined });
        }
      } else if (type === "phase") {
        await editPhase(data.id, data);
      }
      setEditingItem(null);
      triggerSync();
    } catch (err) {
      console.error(err);
    }
  };

  // ----------------------------------------------------
  // Main View Renders
  // ----------------------------------------------------

  // Tree Navigation Row Components
  const renderObjectiveRow = (obj: RoadmapObjective, colorIdx: number) => {
    const nodeKey = `obj-${obj.id}`;
    const isExpanded = !!expandedNodes[nodeKey];
    const childMs = milestones.filter(m => m.objectiveId === obj.id);

    return (
      <div key={obj.id} className="ml-6 mt-2 border-l border-white/05 pl-4">
        <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.04] transition-all">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button onClick={() => toggleNode(nodeKey)} className="text-muted-foreground hover:text-foreground">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            <Target className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-xs truncate">{obj.title}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400/10 text-amber-400 font-bold uppercase">{obj.status}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Progress:</span>
              <span className="text-[10px] font-semibold text-amber-400">{Math.round(obj.completionPercentage)}%</span>
              <Progress value={obj.completionPercentage} className="w-16 h-1 bg-white/5" />
            </div>

            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
              <button
                onClick={() => setEditingItem({ type: "objective", data: obj })}
                className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => removeObjective(obj.id)}
                className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => setEditingItem({ type: "milestone", data: { title: "", description: "", owner: currentUser, priority: "medium", status: "upcoming", dependencies: [] }, parentId: obj.id })}
                className="p-1 rounded hover:bg-white/10 text-[#FFC107] font-bold text-xs"
                title="Add Milestone"
              >
                + MS
              </button>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-1">
            {childMs.map(ms => renderMilestoneRow(ms, colorIdx))}
            {childMs.length === 0 && (
              <p className="text-[10px] text-muted-foreground/60 italic ml-6 mt-1">No milestones added yet.</p>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderMilestoneRow = (ms: RoadmapMilestone, colorIdx: number) => {
    const nodeKey = `ms-${ms.id}`;
    const isExpanded = !!expandedNodes[nodeKey];
    const childEpics = epics.filter(e => e.milestoneId === ms.id);
    const childTasks = tasks.filter(t => t.milestoneId === ms.id && !t.epicId);

    const isOverdue = ms.targetDate && ms.targetDate < new Date().toISOString().split("T")[0] && ms.completionPercentage < 100;

    return (
      <div key={ms.id} className="ml-6 mt-2 border-l border-white/05 pl-4">
        <div className={cn(
          "flex items-center justify-between py-1.5 px-3 rounded-xl bg-white/[0.01] border hover:bg-white/[0.03] transition-all",
          isOverdue ? "border-red-500/20 bg-red-500/[0.01]" : "border-white/[0.02]"
        )}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button onClick={() => toggleNode(nodeKey)} className="text-muted-foreground hover:text-foreground">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            <span className="font-medium text-xs truncate">{ms.title}</span>
            {isOverdue && (
              <span className="text-[8px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 font-bold uppercase flex items-center gap-0.5">
                <AlertCircle className="w-2 h-2" /> OVERDUE
              </span>
            )}
            <span className="text-[9px] text-muted-foreground font-medium italic">by {ms.targetDate || "no date"}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Progress:</span>
              <span className="text-[10px] font-semibold text-green-400">{Math.round(ms.completionPercentage)}%</span>
              <Progress value={ms.completionPercentage} className="w-16 h-1 bg-white/5" />
            </div>

            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
              <button
                onClick={() => setEditingItem({ type: "milestone", data: ms })}
                className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => removeMilestone(ms.id)}
                className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => setEditingItem({ type: "epic", data: { title: "", description: "", owner: currentUser, priority: "medium", status: "upcoming", dependencies: [] }, parentId: ms.id })}
                className="p-1 rounded hover:bg-white/10 text-blue-400 font-bold text-xs"
                title="Add Epic"
              >
                + Epic
              </button>
              <button
                onClick={() => setEditingItem({ type: "task", data: { title: "", description: "", assignee: currentUser, priority: "medium", deadline: "" }, parentId: ms.id })}
                className="p-1 rounded hover:bg-white/10 text-green-400 font-bold text-xs"
                title="Add Task"
              >
                + Task
              </button>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-1 ml-6">
            {/* Epics */}
            {childEpics.map(epic => renderEpicRow(epic))}

            {/* Tasks directly under Milestone */}
            {childTasks.map(t => (
              <div key={t.id} className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-white/[0.005] hover:bg-white/[0.02] border border-white/[0.01] transition-all">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText className="w-3 h-3 text-muted-foreground" />
                  <span className={cn("text-xs truncate", t.status === "done" && "line-through text-muted-foreground")}>{t.title}</span>
                  <span className={cn(
                    "text-[8px] px-1 py-0.2 rounded font-bold uppercase",
                    t.status === "done" ? "bg-green-500/10 text-green-400" : t.status === "doing" ? "bg-amber-500/10 text-amber-400" : "bg-gray-500/10 text-gray-400"
                  )}>{t.status}</span>
                  <span className="text-[9px] text-white/30">Assignee: {t.assignee}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateTask(t.id, { status: t.status === "done" ? "todo" : "done" })}
                    className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-green-400"
                    title={t.status === "done" ? "Mark todo" : "Mark done"}
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setEditingItem({ type: "task", data: t, parentId: ms.id })}
                    className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => deleteTask(t.id)}
                    className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}

            {childEpics.length === 0 && childTasks.length === 0 && (
              <p className="text-[10px] text-muted-foreground/50 italic py-1 pl-2">No child epics or tasks linked.</p>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderEpicRow = (epic: RoadmapEpic) => {
    const nodeKey = `epic-${epic.id}`;
    const isExpanded = !!expandedNodes[nodeKey];
    const childTasks = tasks.filter(t => t.epicId === epic.id);

    return (
      <div key={epic.id} className="mt-1.5 border-l border-white/05 pl-3">
        <div className="flex items-center justify-between py-1 px-2 rounded-xl bg-white/[0.005] hover:bg-white/[0.02] border border-white/[0.01]">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <button onClick={() => toggleNode(nodeKey)} className="text-muted-foreground hover:text-foreground">
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
            <Briefcase className="w-3 h-3 text-blue-400" />
            <span className="font-semibold text-[11px] truncate">{epic.title}</span>
            <span className="text-[8px] px-1 py-0.2 rounded bg-blue-500/10 text-blue-400 font-bold uppercase">{epic.status}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-muted-foreground">{Math.round(epic.completionPercentage)}%</span>
              <Progress value={epic.completionPercentage} className="w-12 h-0.5 bg-white/5" />
            </div>

            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 hover:opacity-100">
              <button
                onClick={() => setEditingItem({ type: "epic", data: epic })}
                className="p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground"
              >
                <Edit2 className="w-2.5 h-2.5" />
              </button>
              <button
                onClick={() => removeEpic(epic.id)}
                className="p-0.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
              <button
                onClick={() => setEditingItem({ type: "task", data: { title: "", description: "", assignee: currentUser, priority: "medium", deadline: "" }, parentId: epic.milestoneId })}
                className="p-0.5 rounded hover:bg-white/10 text-green-400 font-bold text-[10px]"
                title="Add Task under Epic"
              >
                + Task
              </button>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-1 ml-4 mt-1">
            {childTasks.map(t => (
              <div key={t.id} className="flex items-center justify-between py-0.5 px-2 rounded bg-white/[0.002] border border-white/[0.005] hover:bg-white/[0.01]">
                <span className={cn("text-[11px] truncate", t.status === "done" && "line-through text-muted-foreground")}>{t.title}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateTask(t.id, { status: t.status === "done" ? "todo" : "done" })}
                    className="p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-green-400"
                  >
                    <Check className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={() => deleteTask(t.id)}
                    className="p-0.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            ))}
            {childTasks.length === 0 && (
              <p className="text-[9px] text-muted-foreground/40 italic py-0.5 pl-2">No tasks linked.</p>
            )}
          </div>
        )}
      </div>
    );
  };

  // Seeder trigger UI / Error helper
  if (error && error.includes("relation") && error.includes("does not exist")) {
    return (
      <div className="flex flex-col items-center justify-center p-8 max-w-2xl mx-auto my-12 glass rounded-2xl border border-white/08 space-y-6">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
          <AlertTriangle className="w-8 h-8 animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-white">Database Migration Required</h2>
          <p className="text-sm text-muted-foreground">
            The Company Roadmap tables need to be created in your Supabase database before you can load this module.
          </p>
        </div>

        <div className="w-full bg-black/40 border border-white/05 rounded-xl p-4 text-xs font-mono text-white/75 relative">
          <pre className="overflow-x-auto whitespace-pre-wrap max-h-56 select-all">{sqlMigrationCode}</pre>
          <button
            onClick={copySqlToClipboard}
            className="absolute top-2 right-2 px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] transition-all font-sans"
          >
            {copiedSql ? "Copied ✓" : "Copy SQL"}
          </button>
        </div>

        <div className="text-center text-xs text-muted-foreground/75 leading-relaxed">
          Open your <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">Supabase Dashboard</a>, go to the <strong>SQL Editor</strong>, paste this script, and run it. Once completed, refresh this page!
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden" animate="show" variants={staggerContainer}
      className="px-4 py-5 max-w-6xl mx-auto space-y-4 relative"
    >
      {/* Top Banner & Strategy Import controls */}
      <PageHeader
        title="Company Roadmap"
        subtitle={`Central strategy engine for founders · Overall progress: ${overallProgress}%`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {phases.length === 0 ? (
              <button
                onClick={handleImportStrategy}
                disabled={isImporting}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bee-gradient text-[#111] text-xs font-bold disabled:opacity-50 cursor-pointer shadow-md"
              >
                {isImporting ? (
                  <>Seeding Master Plan...</>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Import Master Plan</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => triggerSync()}
                  className="px-3 py-1.5 border border-white/10 hover:bg-white/5 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Recalculate
                </button>
                <button
                  onClick={async () => {
                    if (confirm("Are you sure you want to reset all current roadmap data and re-import the strategy plan template? This will delete all customized roadmap edits.")) {
                      await handleImportStrategy();
                    }
                  }}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Reset
                </button>
              </div>
            )}

            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer shadow-md transition-all"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI Copilot</span>
            </button>
          </div>
        }
      />

      {/* Tabs Menu Navigation */}
      <div className="flex gap-2 border-b border-white/05 overflow-x-auto no-scrollbar pb-1.5">
        {[
          { id: "tree", label: "Strategy Tree", icon: Target },
          { id: "timeline", label: "Timeline Grid", icon: TrendingUp },
          { id: "calendar", label: "Strategy Calendar", icon: CalendarIcon },
          { id: "finance", label: "Revenue Projections", icon: DollarSign },
          { id: "hiring", label: "Hiring Roadmap", icon: Users },
          { id: "marketing", label: "Marketing Campaigns", icon: Megaphone },
          { id: "risks", label: "Risk Register", icon: AlertTriangle }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer",
              activeTab === tab.id
                ? "bee-gradient text-[#111] border-transparent"
                : "bg-white/5 text-muted-foreground border-white/08 hover:text-foreground"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ----------------------------------------------------
          TAB RENDER 1: STRATEGY TREE EXPLORER
          ---------------------------------------------------- */}
      {activeTab === "tree" && (
        <div className="space-y-4">
          {phases.length === 0 && !storeLoading && (
            <div className="text-center py-16 border border-dashed border-white/[0.05] rounded-2xl space-y-4">
              <Target className="w-12 h-12 text-white/20 mx-auto" />
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">No Roadmap Loaded</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Click the button at the top right to import the initial strategy structure from the Master Plan PDF text.
                </p>
              </div>
            </div>
          )}

          {phases.map((phase, idx) => {
            const phaseColor = PHASE_COLORS[idx % PHASE_COLORS.length];
            const nodeKey = `phase-${phase.id}`;
            const isExpanded = !!expandedNodes[nodeKey];
            const phaseObjs = objectives.filter(o => o.phaseId === phase.id);

            return (
              <motion.div
                key={phase.id}
                variants={fadeUp}
                className="glass rounded-2xl p-5 border border-white/05 relative overflow-hidden group"
              >
                {/* Visual side color indicator */}
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: phaseColor }} />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/05 pb-3">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <button
                      onClick={() => toggleNode(nodeKey)}
                      className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <span className="font-bold text-sm" style={{ color: phaseColor }}>{phase.title}</span>
                    <span className="text-xs font-semibold text-white/90 truncate">— {phase.description}</span>
                    <span className={cn(
                      "text-[9px] px-2 py-0.2 rounded font-bold uppercase",
                      phase.status === "active" ? "bg-amber-400/20 text-[#FFC107]" : phase.status === "completed" ? "bg-green-500/20 text-green-400" : "bg-white/5 text-white/40"
                    )}>{phase.status}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Completion:</span>
                      <span className="text-xs font-bold" style={{ color: phaseColor }}>{Math.round(phase.completionPercentage)}%</span>
                      <Progress value={phase.completionPercentage} className="w-24 h-1.5 bg-white/5" />
                    </div>

                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingItem({ type: "phase", data: phase })}
                        className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingItem({ type: "objective", data: { title: "", description: "", owner: currentUser, priority: "medium", status: "upcoming", dependencies: [] }, parentId: phase.id })}
                        className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#FFC107]"
                        title="Add Objective"
                      >
                        + Obj
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-2 space-y-2">
                    {phase.notes && (
                      <p className="text-[11px] text-muted-foreground/80 italic pl-10 mb-2">Note: {phase.notes}</p>
                    )}
                    {phaseObjs.map(obj => renderObjectiveRow(obj, idx))}
                    {phaseObjs.length === 0 && (
                      <p className="text-xs text-muted-foreground/60 italic pl-10">No objectives under this phase.</p>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ----------------------------------------------------
          TAB RENDER 2: INTERACTIVE TIMELINE / GANTT
          ---------------------------------------------------- */}
      {activeTab === "timeline" && (
        <div className="glass rounded-2xl p-5 border border-white/05 space-y-6">
          <div className="flex items-center justify-between border-b border-white/05 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Animated Roadmap Timeline</h2>
            <div className="flex gap-2">
              {["timeline", "quarter", "year"].map((view) => (
                <button
                  key={view}
                  onClick={() => setActiveTimelineView(view as any)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all border",
                    activeTimelineView === view
                      ? "bee-gradient text-[#111] border-transparent"
                      : "bg-white/5 text-muted-foreground border-white/05 hover:text-foreground"
                  )}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
            {phases.map((phase, idx) => {
              const phaseColor = PHASE_COLORS[idx % PHASE_COLORS.length];
              const isOverdue = phase.targetDate && phase.targetDate < new Date().toISOString().split("T")[0] && phase.completionPercentage < 100;

              // Calculate date calculations for timeline display
              let timelineBar = null;
              if (phase.startDate && phase.targetDate) {
                const days = differenceInDays(parseISO(phase.targetDate), parseISO(phase.startDate));
                const remaining = differenceInDays(parseISO(phase.targetDate), new Date());
                timelineBar = (
                  <div className="space-y-1.5 flex-1 mt-2 md:mt-0 md:max-w-md">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Duration: {days} days</span>
                      {remaining > 0 ? (
                        <span>{remaining} days remaining</span>
                      ) : phase.completionPercentage === 100 ? (
                        <span className="text-green-400 font-semibold">Done</span>
                      ) : (
                        <span className="text-red-400 font-semibold flex items-center gap-0.5">
                          <AlertTriangle className="w-3 h-3" /> Delayed
                        </span>
                      )}
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${phase.completionPercentage}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: phaseColor }}
                      />
                    </div>
                  </div>
                );
              }

              return (
                <div key={phase.id} className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs" style={{ background: phaseColor + "15", color: phaseColor }}>
                      P{idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-xs text-white truncate">{phase.title} — {phase.description}</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Timeline: {phase.startDate || "TBD"} to {phase.targetDate || "TBD"} · Owner: {phase.owner}
                      </p>
                    </div>
                  </div>

                  {timelineBar}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB RENDER 3: STRATEGY CALENDAR
          ---------------------------------------------------- */}
      {activeTab === "calendar" && (
        <div className="glass rounded-2xl p-5 border border-white/05 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-[#FFC107]" />
              Strategic Calendar
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCalendarDate(subMonths(calendarDate, 1))}
                className="p-1 rounded bg-white/5 hover:bg-white/10 text-white cursor-pointer"
              >
                ◀
              </button>
              <span className="text-xs font-semibold text-white whitespace-nowrap">
                {format(calendarDate, "MMMM yyyy")}
              </span>
              <button
                onClick={() => setCalendarDate(addMonths(calendarDate, 1))}
                className="p-1 rounded bg-white/5 hover:bg-white/10 text-white cursor-pointer"
              >
                ▶
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] uppercase text-muted-foreground tracking-widest border-b border-white/05 pb-2">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>

          {phases.length === 0 && (
            <div className="text-center py-6 border border-dashed border-white/05 rounded-xl bg-white/[0.01]">
              <p className="text-xs text-muted-foreground">
                No roadmap data is loaded yet. The calendar is currently empty. Click the yellow <strong>"Import Strategy Master Plan"</strong> button at the top right of the page to load the timeline events.
              </p>
            </div>
          )}

          <div className="grid grid-cols-7 gap-1">
            {daysInMonthList.map((day, idx) => {
              if (!day) return <div key={`pad-${idx}`} className="h-24 bg-white/[0.005] opacity-20 border border-white/[0.005] rounded-lg" />;

              const dayEvents = calendarEvents.filter(e => isSameDay(parseISO(e.date), day));

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => {
                    const itemType = prompt("What would you like to schedule on this day?\nEnter: 'task', 'goal', 'milestone', 'hiring', or 'marketing'");
                    if (!itemType) return;
                    const formattedDate = format(day, "yyyy-MM-dd");
                    
                    if (itemType.toLowerCase() === "task") {
                      setEditingItem({
                        type: "task",
                        data: { title: "", deadline: formattedDate, assignee: currentUser, priority: "medium" }
                      });
                    } else if (itemType.toLowerCase() === "goal") {
                      setEditingItem({
                        type: "goal",
                        data: { title: "", targetDate: formattedDate, status: "active", category: "startup" }
                      });
                    } else if (itemType.toLowerCase() === "milestone") {
                      const parentObj = objectives[0];
                      if (!parentObj) {
                        alert("Please seed/create a strategy objective first.");
                        return;
                      }
                      setEditingItem({
                        type: "milestone",
                        data: { title: "", targetDate: formattedDate, owner: currentUser, priority: "medium", status: "upcoming" },
                        parentId: parentObj.id
                      });
                    } else if (itemType.toLowerCase() === "hiring") {
                      if (!activePhase) {
                        alert("Please create a strategy phase first.");
                        return;
                      }
                      setEditingItem({
                        type: "hiring",
                        data: { role: "", targetDate: formattedDate, owner: currentUser, budget: 0, status: "upcoming" },
                        parentId: activePhase.id
                      });
                    } else if (itemType.toLowerCase() === "marketing") {
                      if (!activePhase) {
                        alert("Please create a strategy phase first.");
                        return;
                      }
                      setEditingItem({
                        type: "marketing",
                        data: { campaignName: "", deadline: formattedDate, owner: currentUser, budget: 0, status: "upcoming" },
                        parentId: activePhase.id
                      });
                    }
                  }}
                  className="h-24 p-1.5 bg-white/[0.01] hover:bg-white/[0.02] border border-white/[0.03] rounded-lg overflow-y-auto no-scrollbar flex flex-col justify-between group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[10px] font-semibold text-white/60">
                    <span>{format(day, "d")}</span>
                    {dayEvents.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    )}
                  </div>

                  <div className="space-y-1 mt-1 flex-1">
                    {dayEvents.slice(0, 3).map(e => (
                      <div
                        key={e.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          const newD = prompt("Update date (YYYY-MM-DD):", e.date);
                          if (newD) {
                            handleCalendarEventDateUpdate(e, newD);
                          }
                        }}
                        className={cn(
                          "px-1 py-0.5 rounded text-[8px] border font-medium truncate select-none cursor-pointer hover:opacity-80 active:scale-95 transition-all",
                          e.color
                        )}
                        title={e.title}
                      >
                        {e.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB RENDER 4: FINANCE TARGETS & INCOME CHART
          ---------------------------------------------------- */}
      {activeTab === "finance" && (
        <div className="glass rounded-2xl p-5 border border-white/05 space-y-6">
          <div className="flex items-center justify-between border-b border-white/05 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Revenue Targets vs Actuals</h2>
            <button
              onClick={() => setEditingItem({ type: "finance", data: { monthName: "", projectedBookings: 0, projectedRevenue: 0, monthlyTarget: 0 }, parentId: activePhase?.id })}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[10px] font-semibold cursor-pointer"
            >
              + Add Monthly Projections
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {finance.map(fin => {
              const actualPct = fin.monthlyTarget > 0 ? Math.round((fin.actualRevenue / fin.monthlyTarget) * 100) : 100;
              return (
                <div key={fin.id} className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] space-y-3 relative group">
                  <button
                    onClick={() => removeFinance(fin.id)}
                    className="absolute top-2 right-2 p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div>
                    <h3 className="font-bold text-xs text-white">{fin.monthName}</h3>
                    <p className="text-[9px] text-muted-foreground">Bookings projected: {fin.projectedBookings}</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">Target:</span>
                      <span className="font-semibold text-white">₹{fin.monthlyTarget.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">Actual:</span>
                      <span className="font-semibold text-[#FFC107]">₹{fin.actualRevenue.toLocaleString()}</span>
                    </div>

                    <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full bg-[#FFC107] rounded-full" style={{ width: `${Math.min(100, actualPct)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB RENDER 5: HIRING TIMELINE & open positions
          ---------------------------------------------------- */}
      {activeTab === "hiring" && (
        <div className="glass rounded-2xl p-5 border border-white/05 space-y-6">
          <div className="flex items-center justify-between border-b border-white/05 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Hiring Pipeline & open roles</h2>
            <button
              onClick={() => setEditingItem({ type: "hiring", data: { role: "", department: "", owner: currentUser, budget: 0, status: "upcoming", targetDate: "" }, parentId: activePhase?.id })}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[10px] font-semibold cursor-pointer"
            >
              + Add Planned Role
            </button>
          </div>

          <div className="space-y-3">
            {hiring.map(role => (
              <div key={role.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] group relative">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 flex-shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-white">{role.role}</h3>
                    <p className="text-[10px] text-muted-foreground">{role.department || "No Department"} · Target Target: {role.targetDate || "TBD"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block">Monthly Salary Limit</span>
                    <span className="font-semibold text-xs text-white">₹{role.budget.toLocaleString()}</span>
                  </div>

                  <select
                    value={role.status}
                    onChange={async (e) => {
                      await editHiring(role.id, { status: e.target.value as any });
                      triggerSync();
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-semibold outline-none border cursor-pointer capitalize bg-[#161616]",
                      role.status === "filled" ? "border-green-500/20 text-green-400" : role.status === "open" ? "border-amber-500/20 text-amber-400" : "border-white/10 text-white/50"
                    )}
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="open">Open</option>
                    <option value="filled">Filled</option>
                  </select>

                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingItem({ type: "hiring", data: role })}
                      className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeHiring(role.id)}
                      className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB RENDER 6: MARKETING CAMPAIGNS
          ---------------------------------------------------- */}
      {activeTab === "marketing" && (
        <div className="glass rounded-2xl p-5 border border-white/05 space-y-6">
          <div className="flex items-center justify-between border-b border-white/05 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Marketing Campaigns</h2>
            <button
              onClick={() => setEditingItem({ type: "marketing", data: { campaignName: "", budget: 0, status: "upcoming", expectedOutcome: "", deadline: "", owner: currentUser, completionPercentage: 0 }, parentId: activePhase?.id })}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[10px] font-semibold cursor-pointer"
            >
              + Create Campaign
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {marketing.map(mk => (
              <div key={mk.id} className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] space-y-4 relative group">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-pink-500" />
                    <h3 className="font-bold text-xs text-white truncate max-w-[150px]">{mk.campaignName}</h3>
                  </div>
                  <span className={cn(
                    "text-[8px] px-1.5 py-0.2 rounded font-bold uppercase",
                    mk.status === "completed" ? "bg-green-500/25 text-green-400" : mk.status === "active" ? "bg-amber-500/25 text-amber-400" : "bg-white/5 text-white/50"
                  )}>{mk.status}</span>
                </div>

                {mk.expectedOutcome && (
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{mk.expectedOutcome}</p>
                )}

                <div className="flex items-center justify-between text-[10px] font-medium border-t border-white/05 pt-3">
                  <span>Budget: ₹{mk.budget}</span>
                  <span>Deadline: {mk.deadline || "None"}</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                    <span>Task progress:</span>
                    <span>{mk.completionPercentage}%</span>
                  </div>
                  <Progress value={mk.completionPercentage} className="h-1 bg-white/5" />
                </div>

                <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingItem({ type: "marketing", data: mk })}
                    className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeMarketing(mk.id)}
                    className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB RENDER 7: RISK REGISTER MATRIX
          ---------------------------------------------------- */}
      {activeTab === "risks" && (
        <div className="glass rounded-2xl p-5 border border-white/05 space-y-6">
          <div className="flex items-center justify-between border-b border-white/05 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Strategic Risk Register</h2>
            <button
              onClick={() => setEditingItem({ type: "risk", data: { title: "", description: "", probability: "Medium", impact: "Medium", owner: currentUser, mitigation: "", status: "open" } })}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[10px] font-semibold cursor-pointer"
            >
              + Log Strategic Risk
            </button>
          </div>

          <div className="space-y-3">
            {risks.map(risk => {
              const badgeColor = risk.status === "critical" ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse" : risk.status === "resolved" ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30";
              return (
                <div key={risk.id} className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] space-y-3 group relative">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 flex-shrink-0">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xs text-white">{risk.title}</h3>
                        <p className="text-[10px] text-muted-foreground">{risk.description || "No description provided."}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex gap-2">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">Prob: {risk.probability}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">Impact: {risk.impact}</span>
                      </div>
                      <span className={cn("text-[9px] px-2 py-0.5 rounded font-bold uppercase", badgeColor)}>{risk.status}</span>
                    </div>
                  </div>

                  {risk.mitigation && (
                    <div className="bg-black/30 border border-white/05 rounded-lg p-2.5 text-[10px] text-white/75">
                      <strong>Mitigation Strategy:</strong> {risk.mitigation}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingItem({ type: "risk", data: risk })}
                      className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeRisk(risk.id)}
                      className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          AI STRATEGY COPILOT DRAWER / PANEL
          ---------------------------------------------------- */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 bottom-0 w-80 md:w-96 bg-[#161616] border-l border-white/08 z-[70] shadow-2xl flex flex-col"
          >
            <div className="p-4 border-b border-white/08 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-400" />
                <div>
                  <h2 className="font-bold text-xs text-white">AI Strategy Copilot</h2>
                  <span className="text-[9px] text-muted-foreground">Analysing Live Roadmap Details</span>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {chatHistory.map((m, idx) => (
                <div key={idx} className={cn("flex flex-col max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed", m.role === "user" ? "ml-auto bg-purple-600/25 border border-purple-600/30 text-white" : "mr-auto bg-white/5 border border-white/08 text-white/95")}>
                  {m.content}
                </div>
              ))}
              {aiLoading && (
                <div className="mr-auto bg-white/5 border border-white/08 rounded-2xl p-3 text-xs text-white/50 italic flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce delay-100" />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce delay-200" />
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t border-white/08 bg-black/10 flex gap-2">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSendQuery()}
                placeholder="Ask e.g. What is blocking Phase 2?..."
                className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-white/5 border border-white/08 outline-none focus:border-purple-600 text-white"
              />
              <button
                onClick={handleSendQuery}
                disabled={!query.trim() || aiLoading}
                className="p-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------
          ENTITY EDIT / CREATION MODAL DIALOG
          ---------------------------------------------------- */}
      <AnimatePresence>
        {editingItem && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setEditingItem(null)}
          >
            <motion.form
              onSubmit={handleSaveSaveItem => handleSaveModalItem(handleSaveSaveItem)}
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-md bg-[#161616] border border-white/08 rounded-2xl p-6 space-y-4 text-xs text-white"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-white/05 pb-3">
                <h3 className="font-bold text-sm text-white capitalize">
                  {editingItem.data?.id ? "Edit" : "Add"} {editingItem.type}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Dynamic Form fields depending on item type */}
              <div className="space-y-3">
                {editingItem.type !== "finance" && editingItem.type !== "risk" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">Owner</label>
                      <select
                        value={editingItem.data?.owner || "Sourabh"}
                        onChange={e => setEditingItem(prev => ({ ...prev!, data: { ...prev!.data, owner: e.target.value } }))}
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 outline-none text-foreground bg-[#161616]"
                      >
                        <option value="Sourabh">Sourabh</option>
                        <option value="Asher">Asher</option>
                        <option value="Subin">Subin</option>
                        <option value="All">All</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">Priority</label>
                      <select
                        value={editingItem.data?.priority || "medium"}
                        onChange={e => setEditingItem(prev => ({ ...prev!, data: { ...prev!.data, priority: e.target.value } }))}
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 outline-none text-foreground bg-[#161616]"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Common Title/Name & Description fields */}
                {editingItem.type !== "finance" ? (
                  <>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">
                        {editingItem.type === "marketing" ? "Campaign Name" : editingItem.type === "hiring" ? "Role Name" : "Title"}
                      </label>
                      <input
                        required
                        value={editingItem.data?.title || editingItem.data?.campaignName || editingItem.data?.role || ""}
                        onChange={e => {
                          const field = editingItem.type === "marketing" ? "campaignName" : editingItem.type === "hiring" ? "role" : "title";
                          setEditingItem(prev => ({ ...prev!, data: { ...prev!.data, [field]: e.target.value } }));
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 outline-none text-white focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">
                        {editingItem.type === "risk" ? "Risk Mitigation" : "Description"}
                      </label>
                      <textarea
                        value={editingItem.data?.description || editingItem.data?.mitigation || editingItem.data?.expectedOutcome || ""}
                        onChange={e => {
                          const field = editingItem.type === "risk" ? "mitigation" : editingItem.type === "marketing" ? "expectedOutcome" : "description";
                          setEditingItem(prev => ({ ...prev!, data: { ...prev!.data, [field]: e.target.value } }));
                        }}
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 outline-none text-white resize-none"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">Month Name</label>
                      <input
                        required
                        placeholder="e.g. Month 1, Jan 2027"
                        value={editingItem.data?.monthName || ""}
                        onChange={e => setEditingItem(prev => ({ ...prev!, data: { ...prev!.data, monthName: e.target.value } }))}
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 outline-none text-white"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">Bookings Proj</label>
                        <input
                          type="number"
                          value={editingItem.data?.projectedBookings || 0}
                          onChange={e => setEditingItem(prev => ({ ...prev!, data: { ...prev!.data, projectedBookings: parseInt(e.target.value) } }))}
                          className="w-full px-2 py-1.5 rounded-xl bg-white/5 border border-white/08 outline-none text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">Revenue Proj</label>
                        <input
                          type="number"
                          value={editingItem.data?.projectedRevenue || 0}
                          onChange={e => setEditingItem(prev => ({ ...prev!, data: { ...prev!.data, projectedRevenue: parseFloat(e.target.value) } }))}
                          className="w-full px-2 py-1.5 rounded-xl bg-white/5 border border-white/08 outline-none text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">Monthly Target</label>
                        <input
                          type="number"
                          value={editingItem.data?.monthlyTarget || 0}
                          onChange={e => setEditingItem(prev => ({ ...prev!, data: { ...prev!.data, monthlyTarget: parseFloat(e.target.value) } }))}
                          className="w-full px-2 py-1.5 rounded-xl bg-white/5 border border-white/08 outline-none text-white"
                        />
                      </div>
                    </div>
                  </>
                )}

                {editingItem.type === "goal" && (
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Category</label>
                    <select
                      value={editingItem.data?.category || "startup"}
                      onChange={e => setEditingItem(prev => ({ ...prev!, data: { ...prev!.data, category: e.target.value } }))}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 outline-none text-foreground bg-[#161616]"
                    >
                      <option value="startup">Startup</option>
                      <option value="growth">Growth</option>
                      <option value="learning">Learning</option>
                      <option value="product">Product</option>
                      <option value="finance">Finance</option>
                    </select>
                  </div>
                )}

                {/* Date fields depending on types */}
                {editingItem.type !== "finance" && editingItem.type !== "risk" && (
                  <div className="grid grid-cols-2 gap-2">
                    {editingItem.type !== "marketing" && editingItem.type !== "hiring" && (
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">Start Date</label>
                        <input
                          type="date"
                          value={editingItem.data?.startDate || ""}
                          onChange={e => setEditingItem(prev => ({ ...prev!, data: { ...prev!.data, startDate: e.target.value } }))}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 outline-none text-foreground bg-[#161616]"
                        />
                      </div>
                    )}
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">
                        {(editingItem.type === "marketing" || editingItem.type === "task") ? "Deadline" : "Target Date"}
                      </label>
                      <input
                        type="date"
                        value={editingItem.data?.targetDate || editingItem.data?.deadline || ""}
                        onChange={e => {
                          const field = (editingItem.type === "marketing" || editingItem.type === "task") ? "deadline" : "targetDate";
                          setEditingItem(prev => ({ ...prev!, data: { ...prev!.data, [field]: e.target.value } }));
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 outline-none text-foreground bg-[#161616]"
                      />
                    </div>
                  </div>
                )}

                {/* Specific Risk Matrix */}
                {editingItem.type === "risk" && (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">Probability</label>
                      <select
                        value={editingItem.data?.probability || "Medium"}
                        onChange={e => setEditingItem(prev => ({ ...prev!, data: { ...prev!.data, probability: e.target.value } }))}
                        className="w-full px-2 py-1.5 rounded-xl bg-white/5 border border-white/08 outline-none text-foreground bg-[#161616]"
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">Impact</label>
                      <select
                        value={editingItem.data?.impact || "Medium"}
                        onChange={e => setEditingItem(prev => ({ ...prev!, data: { ...prev!.data, impact: e.target.value } }))}
                        className="w-full px-2 py-1.5 rounded-xl bg-white/5 border border-white/08 outline-none text-foreground bg-[#161616]"
                      >
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">Status</label>
                      <select
                        value={editingItem.data?.status || "open"}
                        onChange={e => setEditingItem(prev => ({ ...prev!, data: { ...prev!.data, status: e.target.value } }))}
                        className="w-full px-2 py-1.5 rounded-xl bg-white/5 border border-white/08 outline-none text-foreground bg-[#161616]"
                      >
                        <option value="open">Open</option>
                        <option value="resolved">Resolved</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bee-gradient text-[#111] font-semibold text-xs cursor-pointer shadow-md"
                >
                  Save
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
