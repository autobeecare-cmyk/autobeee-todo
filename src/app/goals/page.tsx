"use client"; // src/app/goals/page.tsx — Goals System
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Target, TrendingUp, CheckCircle2, PauseCircle } from "lucide-react";
import { format } from "date-fns";
import { useGoalStore } from "@/store/useGoalStore";
import { useTaskStore } from "@/store/useTaskStore";
import { createGoal, updateGoal, deleteGoal } from "@/lib/supabase/goals";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Goal, GoalCategory, Task } from "@/lib/types";
import { fadeUp, staggerContainer } from "@/lib/animations";

const CATEGORIES: GoalCategory[] = ["startup", "growth", "learning", "product", "finance"];

const CAT_COLOR: Record<GoalCategory, string> = {
  startup: "#FFC107",
  growth: "#22c55e",
  learning: "#6366f1",
  product: "#f97316",
  finance: "#06b6d4",
};

const STATUS_ICON = {
  active: TrendingUp,
  completed: CheckCircle2,
  paused: PauseCircle,
};

function GoalCard({ goal, onEdit, tasks }: { goal: Goal; onEdit: (g: Goal) => void; tasks: Task[] }) {
  const catColor = CAT_COLOR[goal.category] || "#FFC107";
  const Icon = STATUS_ICON[goal.status] || TrendingUp;

  const linkedTasks = tasks.filter(t => goal.linkedTaskIds?.includes(t.id));
  const totalTasks = goal.linkedTaskIds?.length || 0;
  const activeTasks = linkedTasks.length;
  const completedTasks = Math.max(0, totalTasks - activeTasks);
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <motion.div
      layout
      variants={fadeUp}
      className="rounded-2xl p-5 cursor-pointer bg-[#141414]/90 border border-white/[0.08] hover:border-white/15 hover:bg-[#181818]/90 transition-all shadow-sm backdrop-blur-md flex flex-col justify-between"
      onClick={() => onEdit(goal)}
    >
      <div>
        <div className="flex items-start justify-between mb-3">
          <div
            className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border"
            style={{
              background: catColor + "15",
              color: catColor,
              borderColor: catColor + "30",
            }}
          >
            {goal.category}
          </div>
          <Icon
            className="w-4 h-4"
            style={{ color: goal.status === "completed" ? "#22c55e" : goal.status === "paused" ? "#6b7280" : catColor }}
          />
        </div>

        <h3 className="font-bold text-sm sm:text-base text-foreground/90 mb-1 leading-snug">{goal.title}</h3>
        {goal.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{goal.description}</p>
        )}

        <div className="space-y-1.5 mt-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground text-[11px]">Progress</span>
            <span className="tabular-nums" style={{ color: catColor }}>{goal.progress}%</span>
          </div>
          <div className="w-full bg-white/[0.06] h-2 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${goal.progress}%`,
                background: catColor,
              }}
            />
          </div>
        </div>

        {totalTasks > 0 && (
          <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-2" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-bold uppercase tracking-wider text-[9px]">Linked Tasks</span>
              <span className="font-medium">{completedTasks}/{totalTasks} done</span>
            </div>
            
            <div className="w-full bg-white/[0.04] h-1 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-400/80 transition-all duration-300"
                style={{ width: `${taskProgress}%` }}
              />
            </div>
            
            <div className="space-y-1 max-h-24 overflow-y-auto pr-1 no-scrollbar">
              {linkedTasks.map(t => (
                <div key={t.id} className="flex items-center justify-between text-[10px] bg-white/[0.02] hover:bg-white/[0.04] p-1.5 rounded-lg border border-white/[0.04]">
                  <span className="truncate flex-1 pr-2 text-foreground/80 font-medium">{t.title}</span>
                  <span className={cn(
                    "px-1.5 py-0.2 rounded text-[8px] uppercase font-bold border",
                    t.status === "doing" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-white/[0.03] text-muted-foreground border-white/05"
                  )}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {goal.targetDate && (
        <p className="text-[10px] text-muted-foreground font-mono mt-3.5 pt-2 border-t border-white/[0.04]">
          Target: {format(new Date(goal.targetDate), "d MMM yyyy")}
        </p>
      )}
    </motion.div>
  );
}

function GoalModal({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const { tasks } = useTaskStore();
  const [title, setTitle] = useState(goal?.title ?? "");
  const [desc, setDesc] = useState(goal?.description ?? "");
  const [category, setCategory] = useState<GoalCategory>(goal?.category ?? "startup");
  const [progress, setProgress] = useState(goal?.progress ?? 0);
  const [status, setStatus] = useState(goal?.status ?? "active");
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? "");
  const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>(goal?.linkedTaskIds ?? []);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const data = {
      title,
      description: desc,
      category,
      progress,
      status: status as Goal["status"],
      targetDate,
      linkedTaskIds,
    };
    if (goal) {
      await updateGoal(goal.id, data);
    } else {
      await createGoal(data);
    }
    setSaving(false);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 space-y-4 glass-strong max-h-[90vh] overflow-y-auto"
        style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.09)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{goal ? "Edit Goal" : "New Goal"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Goal title"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/08 text-sm outline-none focus:border-[rgba(255,193,7,0.4)] transition-colors"
        />

        <textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/08 text-sm outline-none resize-none"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as GoalCategory)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm outline-none text-foreground capitalize"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c} className="bg-[#161616] text-[#f5f5f5] capitalize">
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as "active" | "completed" | "paused")}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm outline-none text-foreground"
            >
              <option value="active" className="bg-[#161616] text-[#f5f5f5]">Active</option>
              <option value="paused" className="bg-[#161616] text-[#f5f5f5]">Paused</option>
              <option value="completed" className="bg-[#161616] text-[#f5f5f5]">Completed</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Progress: {progress}%</label>
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={e => setProgress(Number(e.target.value))}
            className="w-full accent-[#FFC107]"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Linked Tasks</label>
          <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-white/5 border border-white/08">
            {tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground p-1">No active tasks available</p>
            ) : (
              tasks.map(task => {
                const isLinked = linkedTaskIds.includes(task.id);
                return (
                  <label key={task.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={isLinked}
                      onChange={() => {
                        if (isLinked) {
                          setLinkedTaskIds(linkedTaskIds.filter(id => id !== task.id));
                        } else {
                          setLinkedTaskIds([...linkedTaskIds, task.id]);
                        }
                      }}
                      className="rounded border-white/20 accent-[#FFC107] text-[#111]"
                    />
                    <span className="truncate text-foreground/80">{task.title}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Target Date</label>
          <input
            type="date"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm outline-none text-foreground"
          />
        </div>

        <div className="flex gap-3">
          {goal && (
            <button
              onClick={async () => {
                await deleteGoal(goal.id);
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20 transition-colors"
            >
              Delete
            </button>
          )}
          <button
            onClick={save}
            disabled={saving || !title.trim()}
            className="flex-1 py-2.5 rounded-xl bee-gradient text-[#111] font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-[#111]/30 border-t-[#111] rounded-full animate-spin" />
            ) : goal ? (
              "Save"
            ) : (
              "Create Goal"
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionHeader } from "@/components/common/SectionHeader";

export default function GoalsPage() {
  const { goals, loading, subscribeToGoals } = useGoalStore();
  const { tasks, subscribeToTasks } = useTaskStore();
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [creating, setCreating] = useState(false);
  const [filterCat, setFilterCat] = useState<GoalCategory | "all">("all");
  const [showSkeleton, setShowSkeleton] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSkeleton(false), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const unsubGoals = subscribeToGoals();
    const unsubTasks = subscribeToTasks();
    return () => {
      unsubGoals();
      unsubTasks();
    };
  }, [subscribeToGoals, subscribeToTasks]);

  const filtered = filterCat === "all" ? goals : goals.filter(g => g.category === filterCat);
  const active = filtered.filter(g => g.status === "active");
  const completed = filtered.filter(g => g.status === "completed");
  const paused = filtered.filter(g => g.status === "paused");

  const avgProgress = goals.length > 0 ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0;

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerContainer}
      className="px-4 py-5 max-w-5xl mx-auto space-y-4"
    >
      <PageHeader
        title="Goals"
        subtitle={`${goals.filter(g => g.status === "active").length} active · ${avgProgress}% average progress`}
        actions={
          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bee-gradient text-[#111] text-xs font-bold shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            <span>New Goal</span>
          </motion.button>
        }
      />

      <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
        {["all", ...CATEGORIES].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat as GoalCategory | "all")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer",
              filterCat === cat
                ? "bg-[#FFC107]/20 text-[#FFC107] border-[#FFC107]/35"
                : "bg-white/[0.02] text-muted-foreground border-white/05 hover:bg-white/[0.04]"
            )}
          >
            {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {loading && showSkeleton ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      ) : (!loading || !showSkeleton) && filtered.length === 0 ? (
        <EmptyState
          icon={<Target className="w-6 h-6" />}
          title="No goals yet"
          description="Set your first milestone to track progress toward your vision."
          actionText="+ New Goal"
          onAction={() => setCreating(true)}
          className="mt-6"
        />
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div className="space-y-3">
              <SectionHeader title="Active Goals" subtitle={`${active.length} in progress`} />
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              >
                {active.map(g => (
                  <motion.div key={g.id} variants={fadeUp}>
                    <GoalCard goal={g} onEdit={setEditGoal} tasks={tasks} />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}

          {paused.length > 0 && (
            <div className="space-y-3">
              <SectionHeader title="Paused Goals" subtitle={`${paused.length} on hold`} />
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              >
                {paused.map(g => (
                  <motion.div key={g.id} variants={fadeUp}>
                    <GoalCard goal={g} onEdit={setEditGoal} tasks={tasks} />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}

          {completed.length > 0 && (
            <div className="space-y-3">
              <SectionHeader title="Completed Goals" subtitle={`${completed.length} achieved`} />
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              >
                {completed.map(g => (
                  <motion.div key={g.id} variants={fadeUp}>
                    <GoalCard goal={g} onEdit={setEditGoal} tasks={tasks} />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {(editGoal || creating) && (
          <GoalModal
            goal={editGoal}
            onClose={() => {
              setEditGoal(null);
              setCreating(false);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
