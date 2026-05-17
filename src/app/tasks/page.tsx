"use client";
// src/app/tasks/page.tsx — Full Task Management
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Filter, LayoutGrid, List, Calendar,
  CheckCircle2, Circle, Trash2, Copy, Archive, Pin,
  ChevronDown, X, MoreHorizontal, GripVertical
} from "lucide-react";
import { format, isPast } from "date-fns";
import {
  DndContext, DragEndEvent, DragOverEvent, DragOverlay,
  DragStartEvent, PointerSensor, useSensor, useSensors,
  closestCorners
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTaskStore } from "@/store/useTaskStore";
import { useUIStore } from "@/store/useUIStore";
import {
  updateTask, deleteTask, archiveTask, duplicateTask, createTask
} from "@/lib/firestore/tasks";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Task, Person, Priority, TaskStatus } from "@/lib/types";

// ── Types & constants ──────────────────────────────────────────
const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "todo",  label: "To Do",  color: "#6b7280" },
  { id: "doing", label: "Doing",  color: "#FFC107" },
  { id: "done",  label: "Done",   color: "#22c55e" },
];

const PRIORITY_CONFIG = {
  urgent: { label: "🔴 Urgent", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  high:   { label: "🟠 High",   color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  medium: { label: "🟡 Medium", color: "#FFC107", bg: "rgba(255,193,7,0.12)" },
  low:    { label: "⚪ Low",    color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
};

const PERSONS: Person[] = ["Sourabh", "Asher", "Subin", "All"];

// ── Task Card (Kanban) ────────────────────────────────────────
function KanbanCard({ task, onEdit }: { task: Task; onEdit: (t: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const [menuOpen, setMenuOpen] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const toggleDone = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await updateTask(task.id, { status: task.status === "done" ? "todo" : "done" });
  };

  const p = PRIORITY_CONFIG[task.priority];
  const assigneeInitial = task.assignee ? task.assignee.charAt(0).toUpperCase() : "?";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-xl p-3.5 mb-3 cursor-pointer transition-all duration-300 relative overflow-hidden",
        "bg-[var(--card)] border border-[var(--border)]",
        "hover:shadow-[0_8px_24px_rgba(255,193,7,0.08)] hover:border-[rgba(255,193,7,0.3)]",
        isDragging && "z-50 drag-overlay"
      )}
      onClick={() => onEdit(task)}
    >
      {/* Priority Left Border Indicator */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 opacity-80" 
        style={{ backgroundColor: p.color }} 
      />
      
      <div className="flex items-start gap-2.5 pl-1">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-muted-foreground/50 flex-shrink-0 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {/* Done toggle */}
        <button onClick={toggleDone} className="mt-0.5 flex-shrink-0 z-10">
          {task.status === "done"
            ? <CheckCircle2 className="w-4 h-4 text-green-400" />
            : <Circle className="w-4 h-4 text-muted-foreground hover:text-[#FFC107] transition-colors" />
          }
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
             <div className="flex-1 pr-2">
               {task.pinned && <Pin className="w-3 h-3 text-[#FFC107] mb-1" />}
               <p className={cn(
                 "text-sm font-semibold leading-snug tracking-tight text-foreground/90",
                 task.status === "done" && "line-through text-muted-foreground opacity-60"
               )}>
                 {task.title}
               </p>
             </div>
             {/* Menu */}
             <div className="relative flex-shrink-0 -mr-1" onClick={e => e.stopPropagation()}>
               <button
                 onClick={() => setMenuOpen(!menuOpen)}
                 className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-white/5 text-muted-foreground transition-all"
               >
                 <MoreHorizontal className="w-3.5 h-3.5" />
               </button>
               <AnimatePresence>
                 {menuOpen && (
                   <motion.div
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.95 }}
                     className="absolute right-0 top-6 z-50 rounded-xl overflow-hidden shadow-2xl"
                     style={{
                       background: "rgba(24,24,24,0.98)",
                       border: "1px solid rgba(255,255,255,0.1)",
                       minWidth: "140px",
                     }}
                   >
                     {[
                       { icon: task.pinned ? X : Pin, label: task.pinned ? "Unpin" : "Pin", action: () => updateTask(task.id, { pinned: !task.pinned }) },
                       { icon: Copy, label: "Duplicate", action: () => duplicateTask(task) },
                       { icon: Archive, label: "Archive", action: () => archiveTask(task.id) },
                       { icon: Trash2, label: "Delete", action: () => deleteTask(task.id, task.title), danger: true },
                     ].map(({ icon: Icon, label, action, danger }) => (
                       <button
                         key={label}
                         onClick={() => { action(); setMenuOpen(false); }}
                         className={cn(
                           "w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-white/5 transition-colors",
                           danger ? "text-red-400" : "text-foreground/80"
                         )}
                       >
                         <Icon className="w-3.5 h-3.5" />
                         {label}
                       </button>
                     ))}
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
          </div>
          
          {task.description && (
            <p className="text-[11px] text-muted-foreground/80 mt-1 line-clamp-2 leading-relaxed">{task.description}</p>
          )}

          {/* Meta row - bottom section */}
          <div className="flex items-center justify-between mt-3.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold border"
                style={{ color: p.color, background: p.bg, borderColor: p.color + "40" }}
              >
                {p.label}
              </span>
              
              {task.deadline && (
                <span className={cn(
                  "text-[10px] flex items-center gap-1 font-medium",
                  isPast(new Date(task.deadline)) && task.status !== "done" ? "text-red-400" : "text-muted-foreground"
                )}>
                  <Calendar className="w-3 h-3" />
                  {format(new Date(task.deadline), "MMM d")}
                </span>
              )}
              {task.subtasks.length > 0 && (
                <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                  <List className="w-3 h-3" />
                  {task.subtasks.filter(s => s.done).length}/{task.subtasks.length}
                </span>
              )}
            </div>
            
            {/* Assignee Avatar */}
            <div 
               className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-[#111] ring-2 ring-[var(--card)]"
               style={{ background: "linear-gradient(135deg, #FFC107 0%, #FFD54F 100%)" }}
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
  column, tasks, onEdit
}: {
  column: typeof COLUMNS[0];
  tasks: Task[];
  onEdit: (t: Task) => void;
}) {
  const { setNodeRef } = useSortable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className="flex-1 min-w-[280px] md:min-w-0 bg-white/[0.015] border border-white/[0.03] rounded-2xl p-3 flex flex-col snap-start"
    >
      <div className="flex items-center gap-2.5 mb-4 px-1.5 pt-1">
        <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ background: column.color, boxShadow: `0 0 10px ${column.color}80` }} />
        <span className="text-sm font-semibold text-foreground/90">{column.label}</span>
        <span className="text-[11px] font-medium text-muted-foreground bg-white/5 border border-white/10 px-2 py-0.5 rounded-full ml-auto">
          {tasks.length}
        </span>
      </div>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="min-h-[200px] flex-1 flex flex-col">
          {tasks.map(task => (
            <KanbanCard key={task.id} task={task} onEdit={onEdit} />
          ))}
          {tasks.length === 0 && (
             <div className="flex-1 border-2 border-dashed border-white/[0.05] rounded-xl flex items-center justify-center text-xs text-muted-foreground/50 py-8 mt-2">
               Drop tasks here
             </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ── List Row ──────────────────────────────────────────────────
function ListRow({ task, onEdit }: { task: Task; onEdit: (t: Task) => void }) {
  const p = PRIORITY_CONFIG[task.priority];
  const assigneeInitial = task.assignee ? task.assignee.charAt(0).toUpperCase() : "?";
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 px-4 py-3 mb-2 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-[rgba(255,193,7,0.3)] hover:bg-white/[0.04] transition-all cursor-pointer group"
      onClick={() => onEdit(task)}
    >
      <button
        onClick={async (e) => { e.stopPropagation(); await updateTask(task.id, { status: task.status === "done" ? "todo" : "done" }); }}
      >
        {task.status === "done"
          ? <CheckCircle2 className="w-4 h-4 text-green-400" />
          : <Circle className="w-4 h-4 text-muted-foreground group-hover:text-[#FFC107] transition-colors" />
        }
      </button>
      
      <div className="flex-1 min-w-0">
        <span className={cn("text-sm font-semibold truncate block", task.status === "done" && "line-through text-muted-foreground opacity-60")}>
          {task.title}
        </span>
      </div>
      
      <div className="hidden sm:flex items-center gap-4">
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md border" style={{ color: p.color, background: p.bg, borderColor: p.color + "40", width: '70px', textAlign: 'center' }}>
          {p.label.split(" ")[1]}
        </span>
        
        <div className="flex items-center gap-1.5 w-20">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-[#111] bee-gradient">
            {assigneeInitial}
          </div>
          <span className="text-xs text-muted-foreground truncate">{task.assignee}</span>
        </div>
        
        <span className="text-[11px] text-muted-foreground w-16 text-center capitalize bg-white/5 rounded-md py-1 border border-white/5">{task.status}</span>
        
        {task.deadline ? (
          <span className={cn("text-xs w-16 text-right font-medium", isPast(new Date(task.deadline)) && task.status !== "done" ? "text-red-400" : "text-muted-foreground")}>
            {format(new Date(task.deadline), "d MMM")}
          </span>
        ) : (
          <span className="text-xs w-16 text-right text-muted-foreground/30">-</span>
        )}
      </div>
    </motion.div>
  );
}

// ── Task Edit Modal ───────────────────────────────────────────
function TaskModal({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [desc, setDesc] = useState(task?.description ?? "");
  const [assignee, setAssignee] = useState<Person>(task?.assignee ?? "Sourabh");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [deadline, setDeadline] = useState(task?.deadline ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const data = { title, description: desc, assignee, priority, status, deadline };
    if (task) {
      await updateTask(task.id, data);
    } else {
      await createTask({ ...data, tags: [], pinned: false, archived: false, subtasks: [], comments: [], repeat: "none" });
    }
    setSaving(false);
    onClose();
  };

  if (!task && title === "") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", damping: 26, stiffness: 280 }}
          className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 space-y-4"
          style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.09)" }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{task ? "Edit Task" : "New Task"}</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-white/5">
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Task title"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/08 text-sm outline-none focus:border-[rgba(255,193,7,0.4)] transition-colors"
          />
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/08 text-sm outline-none focus:border-[rgba(255,193,7,0.4)] transition-colors resize-none"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Assignee</label>
              <select value={assignee} onChange={e => setAssignee(e.target.value as Person)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm outline-none">
                {PERSONS.map(p => <option key={p} value={p} className="bg-[#161616] text-[#f5f5f5]">{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm outline-none">
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k} className="bg-[#161616] text-[#f5f5f5]">{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm outline-none">
                <option value="todo" className="bg-[#161616] text-[#f5f5f5]">To Do</option>
                <option value="doing" className="bg-[#161616] text-[#f5f5f5]">Doing</option>
                <option value="done" className="bg-[#161616] text-[#f5f5f5]">Done</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Deadline</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm outline-none text-foreground" />
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving || !title.trim()}
            className="w-full py-3 rounded-xl bee-gradient text-[#111] font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <div className="w-4 h-4 border-2 border-[#111]/30 border-t-[#111] rounded-full animate-spin" /> : (task ? "Save Changes" : "Create Task")}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Main Tasks Page ───────────────────────────────────────────
export default function TasksPage() {
  const { tasks, loading } = useTaskStore();
  const { setQuickAddOpen } = useUIStore();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [filterPerson, setFilterPerson] = useState<Person | "all">("all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const filtered = useMemo(() => {
    let t = tasks;
    if (search) t = t.filter(x => x.title.toLowerCase().includes(search.toLowerCase()));
    if (filterPerson !== "all") t = t.filter(x => x.assignee === filterPerson);
    if (filterPriority !== "all") t = t.filter(x => x.priority === filterPriority);
    // Pinned first
    return [...t.filter(x => x.pinned), ...t.filter(x => !x.pinned)];
  }, [tasks, search, filterPerson, filterPriority]);

  const byStatus = (status: TaskStatus) => filtered.filter(t => t.status === status);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const draggedTask = tasks.find(t => t.id === active.id);
    if (!draggedTask) return;

    // Check if dropped on a column header
    const targetCol = COLUMNS.find(c => c.id === over.id);
    if (targetCol) {
      await updateTask(draggedTask.id, { status: targetCol.id });
      return;
    }

    // Dropped on another task - move to same column
    const overTask = tasks.find(t => t.id === over.id);
    if (overTask && overTask.status !== draggedTask.status) {
      await updateTask(draggedTask.id, { status: overTask.status });
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) return;
    const col = COLUMNS.find(c => c.id === over.id);
    // visual feedback handled by drag overlay
  };

  const activeTask = tasks.find(t => t.id === activeId);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">Tasks</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tasks.filter(t => t.status !== "done").length} open · {tasks.filter(t => t.status === "done").length} done
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setQuickAddOpen(true, "task")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bee-gradient text-[#111] text-sm font-semibold"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">New Task</span>
          </motion.button>
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm outline-none focus:border-[rgba(255,193,7,0.4)] focus:bg-white/[0.05] transition-all"
            />
          </div>

          <div className="relative group">
            <select
              value={filterPerson}
              onChange={e => setFilterPerson(e.target.value as Person | "all")}
              className="appearance-none pl-4 pr-9 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm outline-none text-foreground cursor-pointer hover:bg-white/[0.05] transition-colors focus:border-[rgba(255,193,7,0.4)]"
            >
              <option value="all" className="bg-[#161616] text-[#f5f5f5]">All People</option>
              {PERSONS.map(p => <option key={p} value={p} className="bg-[#161616] text-[#f5f5f5]">{p}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none group-hover:text-foreground transition-colors" />
          </div>

          <div className="relative group">
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value as Priority | "all")}
              className="appearance-none pl-4 pr-9 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm outline-none text-foreground cursor-pointer hover:bg-white/[0.05] transition-colors focus:border-[rgba(255,193,7,0.4)]"
            >
              <option value="all" className="bg-[#161616] text-[#f5f5f5]">All Priorities</option>
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k} className="bg-[#161616] text-[#f5f5f5]">{v.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none group-hover:text-foreground transition-colors" />
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/10 ml-auto">
            {[{ id: "kanban", icon: LayoutGrid }, { id: "list", icon: List }].map(({ id, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id as "kanban" | "list")}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  view === id ? "bg-[#FFC107] text-[#111] shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="px-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i}>
              <Skeleton className="h-5 w-24 mb-3 rounded-lg" />
              {[...Array(3)].map((_, j) => <Skeleton key={j} className="h-24 w-full mb-2 rounded-xl" />)}
            </div>
          ))}
        </div>
      ) : view === "kanban" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 px-4 pb-6 overflow-x-auto no-scrollbar snap-x snap-mandatory">
            {COLUMNS.map(col => (
              <SortableContext key={col.id} items={[col.id, ...byStatus(col.id).map(t => t.id)]}>
                <KanbanColumn
                  column={col}
                  tasks={byStatus(col.id)}
                  onEdit={(t) => { setEditTask(t); setModalOpen(true); }}
                />
              </SortableContext>
            ))}
          </div>
          <DragOverlay>
            {activeTask && (
              <div className="drag-overlay rounded-xl p-3.5 bg-[var(--card)] border border-[rgba(255,193,7,0.3)]">
                <p className="text-sm font-medium">{activeTask.title}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="flex-1 overflow-y-auto px-4">
          {/* List header */}
          <div className="hidden sm:flex items-center gap-4 px-4 py-3 mb-3 text-xs font-semibold text-muted-foreground bg-white/[0.01] rounded-xl border border-white/[0.02]">
            <div className="w-4" />
            <span className="flex-1">Title</span>
            <span className="w-[70px] text-center">Priority</span>
            <span className="w-20 pl-2">Person</span>
            <span className="w-16 text-center">Status</span>
            <span className="w-16 text-right">Due</span>
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">No tasks found.</div>
          ) : (
            filtered.map(task => (
              <ListRow key={task.id} task={task} onEdit={(t) => { setEditTask(t); setModalOpen(true); }} />
            ))
          )}
        </div>
      )}

      {/* Edit modal */}
      {modalOpen && (
        <TaskModal
          task={editTask}
          onClose={() => { setModalOpen(false); setEditTask(null); }}
        />
      )}
    </div>
  );
}
