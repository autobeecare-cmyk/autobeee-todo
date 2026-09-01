"use client";
// src/app/tasks/page.tsx — AutoBee OS Tasks Dashboard & Mobile Optimized View
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, LayoutGrid, List, Calendar,
  CheckCircle2, Circle, Trash2, Copy, Pin,
  ChevronDown, X, MoreVertical, GripVertical, CheckSquare, MessageSquare, Send
} from "lucide-react";
import { format, isPast, isToday, parseISO } from "date-fns";
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors,
  closestCorners
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTaskStore } from "@/store/useTaskStore";
import { useUIStore } from "@/store/useUIStore";
import { useMeetingStore } from "@/store/useMeetingStore";
import {
  updateTask, deleteTask, duplicateTask, notifyTaskChange
} from "@/lib/supabase/tasks";
import { logActivity } from "@/lib/supabase/activity";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Task, Person, Priority, TaskStatus, Subtask, TaskComment } from "@/lib/types";
import { fadeUp, taskComplete } from "@/lib/animations";
import { AutoBeeBadge } from "@/components/common/AutoBeeBadge";
import { EmptyState } from "@/components/common/EmptyState";

// ── Constants ──────────────────────────────────────────
const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "todo", label: "To Do", color: "#6b7280" },
  { id: "doing", label: "Doing", color: "#FFC107" },
];

const PRIORITY_CONFIG = {
  urgent: { label: "🔴 Urgent", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  high: { label: "🔴 High", color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  medium: { label: "🟡 Medium", color: "#FFC107", bg: "rgba(255,193,7,0.12)" },
  low: { label: "⚪ Low", color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
};

const PERSONS: Person[] = ["Sourabh", "Asher", "Subin", "All"];

type ScopeFilter = "my" | "assigned_by_me" | "all";
type QuickFilter = "all" | "urgent" | "high" | "today" | "upcoming";

// ── Compact Mobile Task Card Component ──────────────────────────
function MobileTaskCard({
  task,
  onEdit,
  onComplete,
}: {
  task: Task;
  onEdit: (t: Task) => void;
  onComplete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const assigneeInitial = task.assignee ? task.assignee.charAt(0).toUpperCase() : "?";
  const isOverdue = task.deadline ? isPast(new Date(task.deadline)) && !isToday(new Date(task.deadline)) : false;
  const completedSubtasks = task.subtasks ? task.subtasks.filter((s) => s.done).length : 0;
  const totalSubtasks = task.subtasks ? task.subtasks.length : 0;

  return (
    <div
      onClick={() => onEdit(task)}
      className={cn(
        "relative rounded-2xl p-3.5 bg-[#141414]/90 border border-white/[0.08] hover:border-white/15 hover:bg-[#181818]/90 active:scale-[0.99] transition-all cursor-pointer shadow-sm",
        isOverdue && "border-red-500/30 bg-red-500/[0.02]"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-emerald-400 transition-colors p-0.5 cursor-pointer"
          aria-label="Complete task"
        >
          <Circle className="w-4 h-4" />
        </button>

        {/* Center content: Title & Metadata */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-start gap-1.5">
            {task.pinned && <Pin className="w-3 h-3 text-[#FFC107] shrink-0 mt-0.5 fill-[#FFC107]/20" />}
            <p className="text-sm font-semibold text-foreground/90 leading-snug break-words">
              {task.title}
            </p>
          </div>

          {/* Badges Row */}
          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            <AutoBeeBadge variant="priority" priority={task.priority} />

            {task.deadline && (
              <span
                className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 tracking-tight",
                  isOverdue
                    ? "bg-red-500/15 text-red-400 border-red-500/30 font-bold"
                    : isToday(new Date(task.deadline))
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30 font-bold"
                    : "bg-white/[0.04] text-muted-foreground border-white/08"
                )}
              >
                <Calendar className="w-2.5 h-2.5" />
                {isToday(new Date(task.deadline))
                  ? "Due today"
                  : isOverdue
                  ? `Overdue (${format(new Date(task.deadline), "d MMM")})`
                  : format(new Date(task.deadline), "d MMM")}
              </span>
            )}

            {totalSubtasks > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white/[0.04] text-muted-foreground border border-white/08 flex items-center gap-1">
                <CheckSquare className="w-2.5 h-2.5" />
                {completedSubtasks}/{totalSubtasks}
              </span>
            )}

            {task.status === "doing" && (
              <AutoBeeBadge variant="status" status="doing" />
            )}
          </div>
        </div>

        {/* Right side: Assignee Avatar & Menu */}
        <div className="flex items-center gap-1.5 shrink-0 self-start" onClick={(e) => e.stopPropagation()}>
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-[#111] bee-gradient shadow-xs"
            title={task.assignee}
          >
            {assigneeInitial}
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded-lg hover:bg-white/5 text-muted-foreground transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-6 z-50 rounded-xl overflow-hidden shadow-2xl bg-[#181818] border border-white/10 min-w-[130px]"
                >
                  <button
                    onClick={() => {
                      updateTask(task.id, { pinned: !task.pinned });
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground/80 hover:bg-white/5 cursor-pointer"
                  >
                    <Pin className="w-3.5 h-3.5 text-[#FFC107]" />
                    {task.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button
                    onClick={() => {
                      duplicateTask(task);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground/80 hover:bg-white/5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Duplicate
                  </button>
                  <button
                    onClick={() => {
                      deleteTask(task.id);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Desktop Kanban Card ────────────────────────────────────────
function KanbanCard({ task, onEdit, onComplete }: { task: Task; onEdit: (t: Task) => void; onComplete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const [menuOpen, setMenuOpen] = useState(false);
  const p = PRIORITY_CONFIG[task.priority];
  const assigneeInitial = task.assignee ? task.assignee.charAt(0).toUpperCase() : "?";
  const isOverdue = task.deadline ? isPast(new Date(task.deadline)) && !isToday(new Date(task.deadline)) : false;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onEdit(task)}
      className={cn(
        "group rounded-2xl p-3.5 cursor-pointer transition-all duration-200 relative overflow-hidden bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04]",
        "hover:shadow-[0_8px_24px_rgba(255,193,7,0.06)] hover:border-[rgba(255,193,7,0.25)]",
        isOverdue && "border-red-500/30 bg-red-500/[0.01]",
        isDragging && "z-50 drag-overlay"
      )}
    >
      <div className="flex items-start gap-2.5">
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-muted-foreground/50 shrink-0 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-emerald-400 transition-colors"
        >
          <Circle className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1 mb-1">
            <div className="flex-1">
              {task.pinned && <Pin className="w-3 h-3 text-[#FFC107] mb-0.5" />}
              <p className="text-sm font-semibold leading-snug tracking-tight text-foreground/90">
                {task.title}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-1 -mr-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-white/5 text-muted-foreground transition-all"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-semibold border"
                style={{ color: p.color, background: p.bg, borderColor: p.color + "30" }}
              >
                {p.label}
              </span>

              {task.deadline && (
                <span
                  className={cn(
                    "text-[10px] flex items-center gap-1 font-medium px-1.5 py-0.5 rounded",
                    isOverdue
                      ? "bg-red-500/10 text-red-400"
                      : isToday(new Date(task.deadline))
                      ? "bg-amber-500/10 text-amber-400"
                      : "text-muted-foreground"
                  )}
                >
                  <Calendar className="w-3 h-3" />
                  {format(new Date(task.deadline), "d MMM")}
                </span>
              )}
            </div>

            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-[#111] bee-gradient shadow-xs"
              title={task.assignee}
            >
              {assigneeInitial}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Kanban Column ─────────────────────────────────────────────
function KanbanColumn({
  column,
  tasks,
  onEdit,
  onComplete,
}: {
  column: (typeof COLUMNS)[0];
  tasks: Task[];
  onEdit: (t: Task) => void;
  onComplete: (t: Task) => void;
}) {
  return (
    <div className="flex-1 min-w-[280px] bg-white/[0.015] border border-white/[0.04] rounded-2xl p-3.5 flex flex-col snap-start">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-2 h-2 rounded-full" style={{ background: column.color }} />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {column.label}
        </span>
        <span className="text-[10px] font-semibold text-muted-foreground bg-white/5 px-2 py-0.2 rounded-full ml-auto">
          {tasks.length}
        </span>
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="min-h-[160px] flex-1 flex flex-col gap-2.5">
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <motion.div key={task.id} variants={fadeUp} exit={taskComplete.exit} layout>
                <KanbanCard task={task} onEdit={onEdit} onComplete={() => onComplete(task)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </SortableContext>
    </div>
  );
}

// ── Slide-over Details Sheet Panel ───────────────────────────
function TaskDetailsSheet({
  task,
  onClose,
  onSave,
  onDelete,
}: {
  task: Task;
  onClose: () => void;
  onSave: (updates: Partial<Task>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description ?? "");
  const [assignee, setAssignee] = useState<Person>(task.assignee);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [deadline, setDeadline] = useState(task.deadline ?? "");
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks);
  const [newSubtask, setNewSubtask] = useState("");

  const handleSaveAll = async () => {
    await onSave({
      title,
      description: desc,
      assignee,
      priority,
      status,
      deadline: deadline || undefined,
      subtasks,
    });
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    const item: Subtask = {
      id: Math.random().toString(),
      title: newSubtask.trim(),
      done: false,
    };
    const updated = [...subtasks, item];
    setSubtasks(updated);
    setNewSubtask("");
    onSave({ subtasks: updated });
  };

  const handleToggleSubtask = (subId: string) => {
    const updated = subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s));
    setSubtasks(updated);
    onSave({ subtasks: updated });
  };

  const handleDeleteSubtask = (subId: string) => {
    const updated = subtasks.filter((s) => s.id !== subId);
    setSubtasks(updated);
    onSave({ subtasks: updated });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs"
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="fixed top-0 right-0 h-full w-full sm:max-w-md bg-[#141414] border-l border-white/10 z-[60] flex flex-col shadow-2xl overflow-y-auto no-scrollbar"
      >
        <div className="p-4 border-b border-white/05 flex items-center justify-between">
          <h3 className="font-bold text-sm text-foreground">Task Details</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3.5 flex-1">
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block font-medium">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSaveAll}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm outline-none text-foreground focus:border-[#FFC107]/40 font-semibold"
            />
          </div>

          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block font-medium">Description</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onBlur={handleSaveAll}
              rows={3}
              placeholder="Add details..."
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground resize-none focus:border-[#FFC107]/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block font-medium">Assignee</label>
              <select
                value={assignee}
                onChange={(e) => {
                  setAssignee(e.target.value as Person);
                  onSave({ assignee: e.target.value as Person });
                }}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              >
                {PERSONS.map((p) => (
                  <option key={p} value={p} className="bg-[#161616]">
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block font-medium">Priority</label>
              <select
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value as Priority);
                  onSave({ priority: e.target.value as Priority });
                }}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              >
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                  <option key={k} value={k} className="bg-[#161616]">
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block font-medium">Status</label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as TaskStatus);
                  onSave({ status: e.target.value as TaskStatus });
                }}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              >
                <option value="todo" className="bg-[#161616]">To Do</option>
                <option value="doing" className="bg-[#161616]">Doing</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block font-medium">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => {
                  setDeadline(e.target.value);
                  onSave({ deadline: e.target.value || undefined });
                }}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              />
            </div>
          </div>

          {/* Subtasks */}
          <div className="space-y-2 pt-2">
            <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <CheckSquare className="w-3 h-3" />
              Subtasks
            </h4>
            <div className="space-y-1.5">
              {subtasks.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] group"
                >
                  <button onClick={() => handleToggleSubtask(sub.id)}>
                    {sub.done ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#FFC107]" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </button>
                  <span className={cn("text-xs flex-1", sub.done && "line-through text-muted-foreground")}>
                    {sub.title}
                  </span>
                  <button
                    onClick={() => handleDeleteSubtask(sub.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              <div className="flex gap-2 mt-1.5">
                <input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                  placeholder="New subtask..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
                />
                <button
                  onClick={handleAddSubtask}
                  className="px-3 py-1.5 rounded-xl bee-gradient text-[#111] text-xs font-bold"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/05 bg-white/[0.01]">
          <button
            onClick={async () => {
              if (confirm("Delete this task permanently?")) {
                await onDelete();
                onClose();
              }
            }}
            className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center justify-center gap-1.5 border border-red-500/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Task
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Main Tasks Page ───────────────────────────────────────────
export default function TasksPage() {
  const { tasks, loading, deleteTask: storeDeleteTask } = useTaskStore();
  const currentUser = useUIStore((s) => s.currentUser);
  const { setQuickAddOpen } = useUIStore();

  const [view, setView] = useState<"kanban" | "list">("list");
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("my");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");

  const [searchOpen, setSearchOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Status Summary Counts
  const todoCount = useMemo(() => tasks.filter((t) => t.status === "todo").length, [tasks]);
  const doingCount = useMemo(() => tasks.filter((t) => t.status === "doing").length, [tasks]);

  // Filtered Tasks
  const filtered = useMemo(() => {
    let list = tasks.filter((x) => x.status !== "done");

    // 1. Scope Filter: My Tasks / Assigned by Me / All
    if (scopeFilter === "my") {
      list = list.filter((t) => t.assignee === currentUser || t.assignee === "All");
    }

    // 2. Quick Filter
    if (quickFilter === "urgent") {
      list = list.filter((t) => t.priority === "urgent");
    } else if (quickFilter === "high") {
      list = list.filter((t) => t.priority === "high");
    } else if (quickFilter === "today") {
      list = list.filter((t) => t.deadline && isToday(new Date(t.deadline)));
    } else if (quickFilter === "upcoming") {
      list = list.filter((t) => t.deadline && !isPast(new Date(t.deadline)));
    }

    // 3. Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q));
    }

    // Sort: Pinned first, then urgent -> high -> medium -> low
    return [...list.filter((x) => x.pinned), ...list.filter((x) => !x.pinned)];
  }, [tasks, scopeFilter, quickFilter, search, currentUser]);

  const byStatus = (status: TaskStatus) => filtered.filter((t) => t.status === status);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const draggedTask = tasks.find((t) => t.id === active.id);
    if (!draggedTask) return;

    const targetCol = COLUMNS.find((c) => c.id === over.id);
    if (targetCol) {
      await updateTask(draggedTask.id, { status: targetCol.id });
      return;
    }

    const overTask = tasks.find((t) => t.id === over.id);
    if (overTask && overTask.status !== draggedTask.status) {
      await updateTask(draggedTask.id, { status: overTask.status });
    }
  };

  const handleTaskComplete = async (task: Task) => {
    try {
      await logActivity({
        type: "completed",
        entityId: task.id,
        entityType: "task",
        description: `Task "${task.title}" completed`,
      });
      await notifyTaskChange("completed", {
        id: task.id,
        title: task.title,
        assignee: task.assignee,
        deadline: task.deadline,
      });
      await storeDeleteTask(task.id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col relative pb-20 md:pb-6">
      {/* ── MOBILE HEADER (Tasks 🔍 + & Subtext) ── */}
      <div className="px-4 pt-4 pb-2 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Tasks</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage what needs your attention.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className={cn(
                "p-2 rounded-xl border transition-colors cursor-pointer",
                searchOpen ? "bg-[#FFC107]/15 border-[#FFC107]/30 text-[#FFC107]" : "bg-white/[0.04] border-white/08 text-muted-foreground hover:text-foreground"
              )}
            >
              <Search className="w-4 h-4" />
            </button>

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setQuickAddOpen(true, "task")}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bee-gradient text-[#111] text-xs font-bold shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">New Task</span>
            </motion.button>
          </div>
        </div>

        {/* Expandable Search Input */}
        {searchOpen && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks by title..."
              autoFocus
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/5 border border-white/10 text-xs outline-none text-foreground focus:border-[#FFC107]/40"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.div>
        )}

        {/* ── Segmented Control / Scope Tabs: [ My Tasks ] [ Assigned by Me ] [ All ] ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: "my", label: "My Tasks" },
            { id: "assigned_by_me", label: "Assigned by Me" },
            { id: "all", label: "All" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setScopeFilter(tab.id as ScopeFilter)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                scopeFilter === tab.id
                  ? "bg-white/10 text-foreground border border-white/15 shadow-xs"
                  : "bg-white/[0.02] text-muted-foreground border border-white/05 hover:bg-white/[0.04]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Filter Chips Row: [ All ] [ Urgent ] [ High ] [ Today ] [ Upcoming ] ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: "all", label: "All" },
            { id: "urgent", label: "Urgent" },
            { id: "high", label: "High" },
            { id: "today", label: "Today" },
            { id: "upcoming", label: "Upcoming" },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setQuickFilter(chip.id as QuickFilter)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer",
                quickFilter === chip.id
                  ? "bg-[#FFC107]/20 text-[#FFC107] border border-[#FFC107]/35"
                  : "bg-white/[0.02] text-muted-foreground border border-white/05 hover:bg-white/[0.04]"
              )}
            >
              {chip.label}
            </button>
          ))}

          {/* Desktop View Switcher */}
          <div className="hidden md:flex items-center gap-1 ml-auto p-0.5 rounded-xl bg-white/[0.03] border border-white/10">
            <button
              onClick={() => setView("list")}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                view === "list" ? "bg-[#FFC107] text-[#111]" : "text-muted-foreground hover:text-foreground"
              )}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setView("kanban")}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                view === "kanban" ? "bg-[#FFC107] text-[#111]" : "text-muted-foreground hover:text-foreground"
              )}
              title="Kanban View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Task Summary Row Chips: 5 To Do · 2 Doing · 0 Done ── */}
        <div className="flex items-center gap-2 text-xs pt-1">
          <span className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/06 text-muted-foreground font-semibold text-[11px]">
            <strong className="text-foreground">{todoCount}</strong> To Do
          </span>
          <span className="px-2 py-0.5 rounded-md bg-[#FFC107]/10 border border-[#FFC107]/20 text-[#FFC107] font-semibold text-[11px]">
            <strong>{doingCount}</strong> Doing
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/06 text-muted-foreground text-[11px]">
            {filtered.length} visible
          </span>
        </div>
      </div>

      {/* ── Tasks Content List / Cards ── */}
      <div className="flex-1 px-4 py-2">
        {loading ? (
          <div className="space-y-2.5">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<CheckSquare className="w-6 h-6" />}
            title="No tasks found"
            description="You're clear for now or no tasks match this filter."
            actionText="+ Add Task"
            onAction={() => setQuickAddOpen(true, "task")}
            className="mt-6"
          />
        ) : view === "kanban" ? (
          /* Desktop Kanban Board */
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory flex-1 items-stretch">
              {COLUMNS.map((col) => (
                <SortableContext key={col.id} items={byStatus(col.id).map((t) => t.id)}>
                  <KanbanColumn
                    column={col}
                    tasks={byStatus(col.id)}
                    onEdit={setDetailTask}
                    onComplete={handleTaskComplete}
                  />
                </SortableContext>
              ))}
            </div>
          </DndContext>
        ) : (
          /* Mobile First Responsive Task Cards List */
          <div className="space-y-2.5">
            <AnimatePresence mode="popLayout">
              {filtered.map((task) => (
                <motion.div key={task.id} variants={fadeUp} exit={taskComplete.exit} layout>
                  <MobileTaskCard
                    task={task}
                    onEdit={setDetailTask}
                    onComplete={() => handleTaskComplete(task)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Slide-over Detail Sheet panel */}
      <AnimatePresence>
        {detailTask && (
          <TaskDetailsSheet
            task={detailTask}
            onClose={() => setDetailTask(null)}
            onSave={async (updates) => {
              const updated = await updateTask(detailTask.id, updates);
              setDetailTask(updated);
            }}
            onDelete={async () => {
              await storeDeleteTask(detailTask.id);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
