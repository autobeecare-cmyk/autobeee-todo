"use client";
// src/app/tasks/page.tsx — Upgraded Tasks Management
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import {
  Plus, Search, LayoutGrid, List, Calendar,
  CheckCircle2, Circle, Trash2, Copy, Pin,
  ChevronDown, X, MoreHorizontal, GripVertical, CheckSquare, MessageSquare, Send
} from "lucide-react";
import { format, isPast, isToday, parseISO } from "date-fns";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors,
  closestCorners
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTaskStore } from "@/store/useTaskStore";
import { useUIStore } from "@/store/useUIStore";
import {
  updateTask, deleteTask, duplicateTask, createTask
} from "@/lib/supabase/tasks";
import { logActivity } from "@/lib/supabase/activity";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Task, Person, Priority, TaskStatus, Subtask, TaskComment } from "@/lib/types";
import { fadeUp, taskComplete } from "@/lib/animations";

// ── Constants ──────────────────────────────────────────
const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "todo",  label: "To Do",  color: "#6b7280" },
  { id: "doing", label: "Doing",  color: "#FFC107" },
];

const PRIORITY_CONFIG = {
  urgent: { label: "🔴 Urgent", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  high:   { label: "🟠 High",   color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  medium: { label: "🟡 Medium", color: "#FFC107", bg: "rgba(255,193,7,0.12)" },
  low:    { label: "⚪ Low",    color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
};

const PERSONS: Person[] = ["Sourabh", "Asher", "Subin", "All"];

// ── Swipeable Wrapper for Mobile cards ──


// ── Task Card (Kanban) ────────────────────────────────────────
function KanbanCard({ task, onEdit, onComplete }: { task: Task; onEdit: (t: Task) => void; onComplete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const [menuOpen, setMenuOpen] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const p = PRIORITY_CONFIG[task.priority];
  const assigneeInitial = task.assignee ? task.assignee.charAt(0).toUpperCase() : "?";

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onEdit(task)}
      className={cn(
        "group rounded-xl p-3.5 cursor-pointer transition-all duration-300 relative overflow-hidden bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04]",
        "hover:shadow-[0_8px_24px_rgba(255,193,7,0.08)] hover:border-[rgba(255,193,7,0.3)]",
        isDragging && "z-50 drag-overlay"
      )}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 opacity-80" style={{ backgroundColor: p.color }} />
      
      <div className="flex items-start gap-2.5 pl-1">
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-muted-foreground/50 flex-shrink-0 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onComplete(); }}
          className="mt-0.5 flex-shrink-0 z-10 text-muted-foreground hover:text-green-500 transition-colors"
        >
          <Circle className="w-4 h-4 text-muted-foreground hover:text-green-400" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
             <div className="flex-1 pr-2">
               {task.pinned && <Pin className="w-3 h-3 text-[#FFC107] mb-1" />}
               <p className="text-sm font-semibold leading-snug tracking-tight text-foreground/90">
                 {task.title}
               </p>
             </div>
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
                       { icon: Trash2, label: "Delete", action: () => deleteTask(task.id), danger: true },
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
                  isPast(new Date(task.deadline)) ? "text-red-400" : "text-muted-foreground"
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
  column, tasks, onEdit, onComplete
}: {
  column: typeof COLUMNS[0];
  tasks: Task[];
  onEdit: (t: Task) => void;
  onComplete: (t: Task) => void;
}) {
  return (
    <div
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
        <div className="min-h-[200px] flex-1 flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {tasks.map(task => (
              <motion.div
                key={task.id}
                variants={fadeUp}
                exit={taskComplete.exit}
                layout
              >
                <KanbanCard task={task} onEdit={onEdit} onComplete={() => onComplete(task)} />
              </motion.div>
            ))}
          </AnimatePresence>
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
function ListRow({ task, onEdit, onComplete }: { task: Task; onEdit: (t: Task) => void; onComplete: () => void }) {
  const p = PRIORITY_CONFIG[task.priority];
  const assigneeInitial = task.assignee ? task.assignee.charAt(0).toUpperCase() : "?";
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 px-4 py-3 mb-2 rounded-xl glass hover:border-[rgba(255,193,7,0.3)] transition-all cursor-pointer group"
      onClick={() => onEdit(task)}
    >
      <button
        onClick={async (e) => { e.stopPropagation(); onComplete(); }}
        className="text-muted-foreground hover:text-green-400 transition-colors"
      >
        <Circle className="w-4 h-4" />
      </button>
      
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold truncate block text-foreground/90">
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
          <span className={cn("text-xs w-16 text-right font-medium", isPast(new Date(task.deadline)) ? "text-red-400" : "text-muted-foreground")}>
            {format(new Date(task.deadline), "d MMM")}
          </span>
        ) : (
          <span className="text-xs w-16 text-right text-muted-foreground/30">-</span>
        )}
      </div>
    </motion.div>
  );
}

// ── Slide-over Details Sheet Panel ───────────────────────────
function TaskDetailsSheet({
  task,
  onClose,
  onSave,
  onDelete
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
  const [comments, setComments] = useState<TaskComment[]>(task.comments);
  const [newSubtask, setNewSubtask] = useState("");
  const [newComment, setNewComment] = useState("");

  const handleSaveAll = async () => {
    await onSave({
      title,
      description: desc,
      assignee,
      priority,
      status,
      deadline: deadline || undefined,
      subtasks,
      comments
    });
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    const item: Subtask = {
      id: Math.random().toString(),
      title: newSubtask.trim(),
      done: false
    };
    const updated = [...subtasks, item];
    setSubtasks(updated);
    setNewSubtask("");
    onSave({ subtasks: updated });
  };

  const handleToggleSubtask = (subId: string) => {
    const updated = subtasks.map(s => s.id === subId ? { ...s, done: !s.done } : s);
    setSubtasks(updated);
    onSave({ subtasks: updated });
  };

  const handleDeleteSubtask = (subId: string) => {
    const updated = subtasks.filter(s => s.id !== subId);
    setSubtasks(updated);
    onSave({ subtasks: updated });
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment: TaskComment = {
      id: Math.random().toString(),
      text: newComment.trim(),
      createdAt: new Date().toISOString(),
      author: "Sourabh"
    };
    const updated = [...comments, comment];
    setComments(updated);
    setNewComment("");
    onSave({ comments: updated });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="fixed top-0 right-0 h-full w-full sm:max-w-md bg-[var(--card)] border-l border-white/10 z-[60] flex flex-col shadow-2xl glass-card-strong overflow-y-auto no-scrollbar"
      >
        <div className="p-5 border-b border-white/05 flex items-center justify-between">
          <h3 className="font-bold text-sm text-foreground/95">Task Details</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 flex-1">
          {/* Title input */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={handleSaveAll}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm outline-none text-foreground focus:border-[rgba(255,193,7,0.3)] font-semibold"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              onBlur={handleSaveAll}
              rows={3}
              placeholder="Add details..."
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm outline-none text-foreground resize-none focus:border-[rgba(255,193,7,0.3)]"
            />
          </div>

          {/* Quick options */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Assignee</label>
              <select
                value={assignee}
                onChange={e => { setAssignee(e.target.value as Person); onSave({ assignee: e.target.value as Person }); }}
                className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              >
                {PERSONS.map(p => <option key={p} value={p} className="bg-[#161616]">{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
              <select
                value={priority}
                onChange={e => { setPriority(e.target.value as Priority); onSave({ priority: e.target.value as Priority }); }}
                className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              >
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k} className="bg-[#161616]">{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <select
                value={status}
                onChange={e => { setStatus(e.target.value as TaskStatus); onSave({ status: e.target.value as TaskStatus }); }}
                className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              >
                <option value="todo" className="bg-[#161616]">To Do</option>
                <option value="doing" className="bg-[#161616]">Doing</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Deadline*</label>
              <input
                type="date"
                value={deadline}
                onChange={e => {
                  if (e.target.value) {
                    setDeadline(e.target.value);
                    onSave({ deadline: e.target.value });
                  } else {
                    alert("Deadline is required");
                  }
                }}
                className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
                required
              />
            </div>
          </div>

          {/* Subtasks checklist */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5" />
              Subtasks
            </h4>
            <div className="space-y-1.5">
              {subtasks.map(sub => (
                <div key={sub.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-white/[0.01] hover:bg-white/[0.03] group">
                  <button onClick={() => handleToggleSubtask(sub.id)}>
                    {sub.done ? (
                      <CheckCircle2 className="w-4 h-4 text-[#FFC107]" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    )}
                  </button>
                  <span className={cn("text-xs flex-1", sub.done && "line-through text-muted-foreground")}>{sub.title}</span>
                  <button onClick={() => handleDeleteSubtask(sub.id)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <input
                  value={newSubtask}
                  onChange={e => setNewSubtask(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddSubtask()}
                  placeholder="New subtask..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
                />
                <button onClick={handleAddSubtask} className="px-3 py-1.5 rounded-xl bee-gradient text-[#111] text-xs font-semibold">
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Comments section */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Comments
            </h4>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {comments.map(c => (
                <div key={c.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                    <span className="font-semibold text-foreground/80">{c.author}</span>
                    <span>{format(parseISO(c.createdAt), "d MMM · h:mm a")}</span>
                  </div>
                  <p className="text-xs text-foreground/90 mt-1">{c.text}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddComment()}
                placeholder="Write a comment..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              />
              <button onClick={handleAddComment} className="p-2 rounded-xl bee-gradient text-[#111] flex items-center justify-center">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Delete action button */}
        <div className="p-5 border-t border-white/05 bg-white/[0.01]">
          <button
            onClick={async () => { if(confirm("Are you sure?")) { await onDelete(); onClose(); } }}
            className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center justify-center gap-2 border border-red-500/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Task Permanently
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Main Tasks Page ───────────────────────────────────────────
export default function TasksPage() {
  const { tasks, loading, deleteTask: storeDeleteTask } = useTaskStore();
  const { setQuickAddOpen } = useUIStore();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [filterPerson, setFilterPerson] = useState<Person | "all">("all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );
  
  // Sheet state
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  
  // Completed today counter
  const [completedCount, setCompletedCount] = useState(0);

  const fetchCompletedToday = async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const { count, error } = await supabase
      .from("activity")
      .select("*", { count: "exact", head: true })
      .eq("entity_type", "task")
      .eq("metadata->>type", "completed")
      .gte("created_at", start.toISOString());
    if (!error && count !== null) {
      setCompletedCount(count);
    }
  };

  useEffect(() => {
    fetchCompletedToday();
  }, [tasks]);

  const filtered = useMemo(() => {
    let t = tasks.filter(x => x.status !== "done"); // Done columns are removed
    if (search) t = t.filter(x => x.title.toLowerCase().includes(search.toLowerCase()));
    if (filterPerson !== "all") t = t.filter(x => x.assignee === filterPerson);
    if (filterPriority !== "all") t = t.filter(x => x.priority === filterPriority);
    return [...t.filter(x => x.pinned), ...t.filter(x => !x.pinned)];
  }, [tasks, search, filterPerson, filterPriority]);

  const byStatus = (status: TaskStatus) => filtered.filter(t => t.status === status);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const draggedTask = tasks.find(t => t.id === active.id);
    if (!draggedTask) return;

    const targetCol = COLUMNS.find(c => c.id === over.id);
    if (targetCol) {
      await updateTask(draggedTask.id, { status: targetCol.id });
      return;
    }

    const overTask = tasks.find(t => t.id === over.id);
    if (overTask && overTask.status !== draggedTask.status) {
      await updateTask(draggedTask.id, { status: overTask.status });
    }
  };

  const handleTaskComplete = async (task: Task) => {
    try {
      // 1. Log as completed
      await logActivity({
        type: "completed",
        entityId: task.id,
        entityType: "task",
        description: `Task "${task.title}" completed`
      });
      // 2. Hard delete task (optimistic update via store)
      await storeDeleteTask(task.id);
      // 3. Update counter
      fetchCompletedToday();
    } catch (err) {
      console.error(err);
    }
  };

  // Progress metrics
  const totalTasksToday = filtered.length + completedCount;
  const progressPct = totalTasksToday > 0 ? Math.round((completedCount / totalTasksToday) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col relative"
    >
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Tasks Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {filtered.length} active tasks · {completedCount} completed today
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => setQuickAddOpen(true, "task")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bee-gradient text-[#111] text-sm font-semibold shadow-md"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">New Task</span>
          </motion.button>
        </div>

        {/* Tasks Progress Bar */}
        {totalTasksToday > 0 && (
          <div className="mb-4 bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Daily Progress</span>
              <span className="font-bold text-[#FFC107]">{completedCount} of {totalTasksToday} completed ({progressPct}%)</span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>
        )}
      </div>

      {/* Sticky Filters row */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur px-4 py-3 border-b border-white/05 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-sm outline-none focus:border-[rgba(255,193,7,0.4)] focus:bg-white/[0.05] transition-all text-foreground"
          />
        </div>

        <div className="relative group">
          <select
            value={filterPerson}
            onChange={e => setFilterPerson(e.target.value as Person | "all")}
            className="appearance-none pl-4 pr-9 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-sm outline-none text-foreground cursor-pointer hover:bg-white/[0.05] transition-colors focus:border-[rgba(255,193,7,0.4)]"
          >
            <option value="all" className="bg-[#161616]">All People</option>
            {PERSONS.map(p => <option key={p} value={p} className="bg-[#161616]">{p}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none group-hover:text-foreground transition-colors" />
        </div>

        <div className="relative group">
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as Priority | "all")}
            className="appearance-none pl-4 pr-9 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-sm outline-none text-foreground cursor-pointer hover:bg-white/[0.05] transition-colors focus:border-[rgba(255,193,7,0.4)]"
          >
            <option value="all" className="bg-[#161616]">All Priorities</option>
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k} className="bg-[#161616]">{v.label}</option>)}
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
                "p-1.5 rounded-lg transition-all",
                view === id ? "bg-[#FFC107] text-[#111] shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i}>
              <Skeleton className="h-5 w-24 mb-3 rounded-lg" />
              {[...Array(2)].map((_, j) => <Skeleton key={j} className="h-24 w-full mb-2 rounded-xl" />)}
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 mt-10">
          <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/10 flex items-center justify-center mb-4 text-[#FFC107]">
            <CheckSquare className="w-8 h-8" strokeWidth={1.5} />
          </div>
          <h3 className="font-bold text-base text-foreground/90">All tasks completed!</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">Enjoy your caught-up dashboard, or start tracking a new workspace task.</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setQuickAddOpen(true, "task")}
            className="mt-5 px-4 py-2 rounded-xl bee-gradient text-[#111] text-xs font-semibold shadow-md"
          >
            Add your first task
          </motion.button>
        </div>
      ) : view === "kanban" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 px-4 py-4 overflow-x-auto no-scrollbar snap-x snap-mandatory flex-1 items-stretch">
            {COLUMNS.map(col => (
              <SortableContext key={col.id} items={byStatus(col.id).map(t => t.id)}>
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
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <AnimatePresence mode="popLayout">
            {filtered.map(task => (
              <motion.div
                key={task.id}
                variants={fadeUp}
                exit={taskComplete.exit}
                layout
              >
                <ListRow
                  task={task}
                  onEdit={setDetailTask}
                  onComplete={() => handleTaskComplete(task)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

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

      {/* Mobile Floating Action Button (FAB) */}
      <div className="md:hidden fixed bottom-20 right-4 z-40">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setQuickAddOpen(true, "task")}
          className="w-12 h-12 rounded-full bee-gradient text-[#111] flex items-center justify-center shadow-lg bee-glow"
        >
          <Plus className="w-6 h-6" strokeWidth={2.5} />
        </motion.button>
      </div>
    </motion.div>
  );
}
