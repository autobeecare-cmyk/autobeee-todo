"use client";
// src/app/meetings/page.tsx — Meetings Module
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Plus, X, Video, MapPin, Clock, FileText, ChevronDown, ChevronUp, Save, Trash2, Edit,
  CheckCircle2, Circle, ListTodo
} from "lucide-react";
import { format, isAfter, isBefore, parseISO } from "date-fns";
import { useMeetingStore } from "@/store/useMeetingStore";
import { useTaskStore } from "@/store/useTaskStore";
import { createMeeting, updateMeeting, deleteMeeting } from "@/lib/supabase/meetings";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Meeting, Person, Priority, Task } from "@/lib/types";
import { fadeUp, staggerContainer } from "@/lib/animations";


const PERSONS: Person[] = ["Sourabh", "Asher", "Subin"];
const DURATIONS = [15, 30, 45, 60, 90];

// Removed local CONTAINER/ITEM variants to use global animations from animations.ts


function MeetingModal({ onClose, meeting }: { onClose: () => void; meeting?: Meeting }) {
  // Helper to format ISO string to local YYYY-MM-DDTHH:mm format
  const formatDateTimeLocal = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return "";
    }
  };

  const [title, setTitle] = useState(meeting?.title ?? "");
  const [desc, setDesc] = useState(meeting?.description ?? "");
  const [scheduledAt, setScheduledAt] = useState(formatDateTimeLocal(meeting?.scheduledAt));
  const [duration, setDuration] = useState(meeting?.durationMinutes ?? 30);
  const [attendees, setAttendees] = useState<Person[]>(meeting?.attendees ?? []);
  const [location, setLocation] = useState(meeting?.location ?? "");
  const [meetingLink, setMeetingLink] = useState(meeting?.meetingLink ?? "");
  const [notes, setNotes] = useState(meeting?.notes ?? "");
  const [status, setStatus] = useState<"upcoming" | "completed" | "cancelled">(meeting?.status ?? "upcoming");
  const [saving, setSaving] = useState(false);

  const toggleAttendee = (p: Person) => {
    if (attendees.includes(p)) {
      setAttendees(attendees.filter(x => x !== p));
    } else {
      setAttendees([...attendees, p]);
    }
  };

  const selectAll = () => {
    if (attendees.length === PERSONS.length) {
      setAttendees([]);
    } else {
      setAttendees([...PERSONS]);
    }
  };

  const save = async () => {
    if (!title.trim() || !scheduledAt || saving) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: desc.trim() || undefined,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: duration,
        attendees,
        location: location.trim() || undefined,
        meetingLink: meetingLink.trim() || undefined,
        notes: notes.trim() || undefined,
        status,
        createdBy: meeting?.createdBy ?? "Sourabh",
        agenda: meeting?.agenda ?? []
      };

      if (meeting) {
        await updateMeeting(meeting.id, payload);
      } else {
        await createMeeting(payload);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 space-y-4 glass-strong max-h-[90vh] overflow-y-auto no-scrollbar"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground/90">{meeting ? "Edit Meeting" : "New Meeting"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <input
            autoFocus value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Meeting Title"
            required
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/08 text-sm outline-none focus:border-[rgba(255,193,7,0.4)] transition-colors text-foreground"
          />

          <textarea
            value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/08 text-sm outline-none resize-none text-foreground focus:border-[rgba(255,193,7,0.4)]"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Date & Time</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                required
                onChange={e => setScheduledAt(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Duration</label>
              <select
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              >
                {DURATIONS.map(d => <option key={d} value={d} className="bg-[#161616]">{d} min</option>)}
              </select>
            </div>
          </div>

          {/* Attendees Selector */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Attendees</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={selectAll}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all",
                  attendees.length === PERSONS.length
                    ? "bee-gradient text-[#111] border-transparent"
                    : "bg-white/5 text-muted-foreground border-white/08"
                )}
              >
                All
              </button>
              {PERSONS.map(p => {
                const active = attendees.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggleAttendee(p)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all",
                      active
                        ? "bg-[rgba(255,193,7,0.15)] text-[#FFC107] border-[#FFC107]/30"
                        : "bg-white/5 text-muted-foreground border-white/08"
                    )}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <input
            value={meetingLink} onChange={e => setMeetingLink(e.target.value)}
            placeholder="Meeting link (optional, e.g. Google Meet)"
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none focus:border-[rgba(255,193,7,0.4)] text-foreground"
          />

          <input
            value={location} onChange={e => setLocation(e.target.value)}
            placeholder="Location/Room (optional)"
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none focus:border-[rgba(255,193,7,0.4)] text-foreground"
          />

          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Notes or agenda (optional)"
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none resize-none text-foreground"
          />

          {meeting && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              >
                <option value="upcoming" className="bg-[#161616]">Upcoming</option>
                <option value="completed" className="bg-[#161616]">Completed</option>
                <option value="cancelled" className="bg-[#161616]">Cancelled</option>
              </select>
            </div>
          )}
        </div>

        <button
          onClick={save}
          disabled={saving || !title.trim() || !scheduledAt}
          className="w-full py-3 rounded-xl bee-gradient text-[#111] font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-md pt-2.5"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-[#111]/30 border-t-[#111] rounded-full animate-spin" />
          ) : (
            meeting ? "Save Changes" : "Schedule Meeting"
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}

function MeetingCard({ meeting, onEdit, tasks }: { meeting: Meeting; onEdit: (meeting: Meeting) => void; tasks: Task[] }) {
  const [notesText, setNotesText] = useState(meeting.notes ?? "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  const [showAgenda, setShowAgenda] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignee, setTaskAssignee] = useState<Person>("Sourabh");
  const [taskPriority, setTaskPriority] = useState<Priority>("medium");
  const [taskDeadline, setTaskDeadline] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0] // tomorrow
  );
  const [addingTask, setAddingTask] = useState(false);

  const addTaskStore = useTaskStore(state => state.addTask);
  const isPastMeeting = isBefore(parseISO(meeting.scheduledAt), new Date());

  // Filter tasks linked to this meeting
  const linkedTasks = useMemo(() => {
    return tasks.filter(t => t.meetingId === meeting.id);
  }, [tasks, meeting.id]);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await updateMeeting(meeting.id, { notes: notesText.trim() || undefined });
      setEditingNotes(false);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleAddTopic = async () => {
    if (!newTopic.trim()) return;
    const agendaItem = {
      id: Math.random().toString(36).substring(2, 9),
      text: newTopic.trim(),
      completed: false,
    };
    const currentAgenda = meeting.agenda || [];
    const updatedAgenda = [...currentAgenda, agendaItem];
    
    await updateMeeting(meeting.id, { agenda: updatedAgenda });
    setNewTopic("");
  };

  const handleToggleTopic = async (topicId: string) => {
    const currentAgenda = meeting.agenda || [];
    const updatedAgenda = currentAgenda.map(item =>
      item.id === topicId ? { ...item, completed: !item.completed } : item
    );
    await updateMeeting(meeting.id, { agenda: updatedAgenda });
  };

  const handleDeleteTopic = async (topicId: string) => {
    const currentAgenda = meeting.agenda || [];
    const updatedAgenda = currentAgenda.filter(item => item.id !== topicId);
    await updateMeeting(meeting.id, { agenda: updatedAgenda });
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || addingTask) return;
    setAddingTask(true);
    try {
      await addTaskStore({
        title: taskTitle.trim(),
        assignee: taskAssignee,
        priority: taskPriority,
        status: "todo",
        deadline: taskDeadline,
        meetingId: meeting.id,
        tags: ["Meeting Action"],
        pinned: false,
        archived: false,
        subtasks: [],
        comments: [],
        repeat: "none",
      });
      setTaskTitle("");
    } finally {
      setAddingTask(false);
    }
  };

  return (
    <motion.div
      variants={fadeUp}
      className={cn(
        "rounded-2xl p-4.5 glass card-hover flex flex-col gap-3 group relative",
        meeting.status === "cancelled" && "opacity-55"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-sm text-foreground/90">{meeting.title}</h3>
          {meeting.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{meeting.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className={cn(
              "text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase border",
              meeting.status === "completed"
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : meeting.status === "cancelled"
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
            )}
          >
            {meeting.status}
          </span>
          <button
            onClick={() => onEdit(meeting)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-[#FFC107] transition-all max-md:opacity-100"
            title="Edit Meeting"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => deleteMeeting(meeting.id)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all max-md:opacity-100"
            title="Delete Meeting"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Meet info metadata */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground font-medium border-t border-white/05 pt-2.5">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#FFC107]" />
          <span>{format(parseISO(meeting.scheduledAt), "EEE, d MMM · h:mm a")} ({meeting.durationMinutes}m)</span>
        </div>
        {meeting.meetingLink && (
          <a
            href={meeting.meetingLink.startsWith("http") ? meeting.meetingLink : `https://${meeting.meetingLink}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[#FFC107] hover:underline"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Video Call</span>
          </a>
        )}
        {meeting.location && (
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>{meeting.location}</span>
          </div>
        )}
      </div>

      {/* Attendees list */}
      {meeting.attendees.length > 0 && (
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Attendees:</span>
          <div className="flex -space-x-1.5 overflow-hidden">
            {meeting.attendees.map(att => (
              <div
                key={att}
                className="w-5.5 h-5.5 rounded-full flex items-center justify-center text-[9px] font-bold text-[#111] ring-2 ring-[var(--card)]"
                style={{ background: att === "Sourabh" ? "#FFC107" : att === "Asher" ? "#3B82F6" : "#10B981" }}
                title={att}
              >
                {att === "Subin" ? "Su" : att.charAt(0)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agenda toggle */}
      <div className="border-t border-white/05 pt-2 mt-1 flex items-center justify-between">
        <button
          onClick={() => setShowAgenda(!showAgenda)}
          className="text-xs text-[#FFC107] hover:underline font-semibold flex items-center gap-1 cursor-pointer select-none"
        >
          <ListTodo className="w-3.5 h-3.5" />
          <span>Agenda & Action Items ({meeting.agenda?.length || 0} topics, {linkedTasks.length} tasks)</span>
          {showAgenda ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
        </button>
      </div>

      <AnimatePresence>
        {showAgenda && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/05 pt-3 mt-1 space-y-4 overflow-hidden"
          >
            {/* Discussion Topics list */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Discussion Topics</h4>
              
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {(!meeting.agenda || meeting.agenda.length === 0) ? (
                  <p className="text-xs text-muted-foreground/60 italic p-1">No discussion topics added yet.</p>
                ) : (
                  meeting.agenda.map(topic => (
                    <div key={topic.id} className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg bg-white/[0.01] border border-white/[0.03] hover:bg-white/[0.02] group/topic">
                      <button onClick={() => handleToggleTopic(topic.id)} className="text-muted-foreground hover:text-[#FFC107] transition-colors flex-shrink-0">
                        {topic.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>
                      <span className={cn("text-xs flex-1 text-foreground/80", topic.completed && "line-through text-muted-foreground/60")}>
                        {topic.text}
                      </span>
                      <button
                        onClick={() => handleDeleteTopic(topic.id)}
                        className="opacity-0 group-hover/topic:opacity-100 p-0.5 rounded text-muted-foreground hover:text-red-400 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Topic Input */}
              <div className="flex gap-2 mt-2">
                <input
                  value={newTopic}
                  onChange={e => setNewTopic(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddTopic()}
                  placeholder="Add discussion point..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground focus:border-[rgba(255,193,7,0.4)]"
                />
                <button onClick={handleAddTopic} className="px-3 py-1.5 rounded-xl bee-gradient text-[#111] text-xs font-semibold">
                  Add
                </button>
              </div>
            </div>

            {/* Meeting Tasks Section */}
            <div className="space-y-2 border-t border-white/05 pt-3">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Action Items / Linked Tasks</h4>

              {/* Tasks List */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {linkedTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 italic p-1">No action items created yet.</p>
                ) : (
                  linkedTasks.map(t => (
                    <div key={t.id} className="flex items-center justify-between text-xs bg-white/[0.01] hover:bg-white/[0.02] p-2 rounded-lg border border-white/[0.03]">
                      <div className="flex items-center gap-2 truncate">
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-[#111]"
                          style={{ background: t.assignee === "Sourabh" ? "#FFC107" : t.assignee === "Asher" ? "#3B82F6" : "#10B981" }}
                          title={t.assignee}
                        >
                          {t.assignee.charAt(0)}
                        </div>
                        <span className="truncate text-foreground/80 font-medium">{t.title}</span>
                      </div>
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase",
                        t.status === "todo" ? "bg-gray-500/10 text-gray-400" : t.status === "doing" ? "bg-amber-500/10 text-amber-400" : "bg-green-500/10 text-green-400"
                      )}>
                        {t.status}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Create Task Form */}
              <form onSubmit={handleCreateTask} className="space-y-2 bg-white/[0.01] p-2.5 rounded-xl border border-white/05 mt-2">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Create Action Item</p>
                <input
                  required
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="Task title..."
                  className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground focus:border-[rgba(255,193,7,0.4)]"
                />
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-muted-foreground mb-0.5 block font-medium">Assignee</label>
                    <select
                      value={taskAssignee}
                      onChange={e => setTaskAssignee(e.target.value as Person)}
                      className="w-full px-2 py-1 rounded-lg bg-[#161616] border border-white/08 text-[11px] outline-none text-foreground"
                    >
                      {PERSONS.filter(p => p !== "All").map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground mb-0.5 block font-medium">Priority</label>
                    <select
                      value={taskPriority}
                      onChange={e => setTaskPriority(e.target.value as Priority)}
                      className="w-full px-2 py-1 rounded-lg bg-[#161616] border border-white/08 text-[11px] outline-none text-foreground"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-[9px] text-muted-foreground mb-0.5 block font-medium">Deadline</label>
                    <input
                      type="date"
                      required
                      value={taskDeadline}
                      onChange={e => setTaskDeadline(e.target.value)}
                      className="w-full px-2 py-0.5 rounded-lg bg-[#161616] border border-white/08 text-[11px] outline-none text-foreground"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={addingTask || !taskTitle.trim()}
                    className="px-3.5 py-1.5 rounded-xl bee-gradient text-[#111] text-xs font-semibold disabled:opacity-50"
                  >
                    Add Task
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes container for Past meetings */}
      {isPastMeeting && (
        <div className="border-t border-white/05 pt-2.5 mt-0.5">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Post-Meeting Notes
            </h4>
            {!editingNotes ? (
              <button
                onClick={() => setEditingNotes(true)}
                className="text-[10px] text-[#FFC107] hover:underline font-semibold"
              >
                Edit
              </button>
            ) : (
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="text-[10px] text-green-400 hover:underline font-semibold flex items-center gap-0.5"
              >
                <Save className="w-3 h-3" />
                Save
              </button>
            )}
          </div>
          {editingNotes ? (
            <textarea
              value={notesText}
              onChange={e => setNotesText(e.target.value)}
              rows={2}
              placeholder="Add post-meeting notes, actions, or decisions..."
              className="w-full mt-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground resize-none"
            />
          ) : (
            <p className="text-xs text-muted-foreground/80 mt-1 italic leading-relaxed">
              {notesText || "No notes captured yet. Click Edit to record key outcomes."}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function MeetingsPage() {
  const { meetings, loading } = useMeetingStore();
  const { tasks, subscribeToTasks } = useTaskStore();
  const [creating, setCreating] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [pastOpen, setPastOpen] = useState(false);

  const now = new Date();

  useEffect(() => {
    const unsubMeetings = useMeetingStore.getState().subscribeToMeetings();
    const unsubTasks = subscribeToTasks();
    return () => {
      unsubMeetings();
      unsubTasks();
    };
  }, [subscribeToTasks]);

  // Split upcoming vs past
  const upcomingMeetings = useMemo(() => {
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    return meetings
      .filter(m => isAfter(parseISO(m.scheduledAt), twelveHoursAgo))
      .sort((a, b) => parseISO(a.scheduledAt).getTime() - parseISO(b.scheduledAt).getTime());
  }, [meetings, now]);

  const pastMeetings = useMemo(() => {
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    return meetings
      .filter(m => isBefore(parseISO(m.scheduledAt), twelveHoursAgo))
      .sort((a, b) => parseISO(b.scheduledAt).getTime() - parseISO(a.scheduledAt).getTime());
  }, [meetings, now]);

  const upcomingCount = useMemo(() => {
    return meetings.filter(m => isAfter(parseISO(m.scheduledAt), now)).length;
  }, [meetings, now]);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerContainer}
      className="px-4 py-6 max-w-5xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#FFC107]" />
            Meetings
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {upcomingCount} upcoming meetings scheduled
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.02 }}
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bee-gradient text-[#111] text-sm font-semibold shadow-md"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Create Meeting
        </motion.button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Upcoming Section */}
          <div className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60 px-1">Upcoming & Recent</h2>
            {upcomingMeetings.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-white/[0.05] rounded-2xl">
                <Calendar className="w-8 h-8 text-[#FFC107] mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">No upcoming or recent meetings. Click Schedule to plan one.</p>
              </div>
            ) : (
              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingMeetings.map(m => (
                  <MeetingCard key={m.id} meeting={m} onEdit={setEditingMeeting} tasks={tasks} />
                ))}
              </motion.div>
            )}
          </div>

          {/* Past Collapsible Section */}
          {pastMeetings.length > 0 && (
            <div className="border-t border-white/05 pt-4">
              <button
                onClick={() => setPastOpen(!pastOpen)}
                className="w-full flex items-center justify-between py-2 text-xs font-medium uppercase tracking-widest text-muted-foreground/60 px-1 select-none hover:text-foreground transition-colors"
              >
                <span>Past Meetings ({pastMeetings.length})</span>
                {pastOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              <AnimatePresence>
                {pastOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden mt-3"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                      {pastMeetings.map(m => (
                        <MeetingCard key={m.id} meeting={m} onEdit={setEditingMeeting} tasks={tasks} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {creating && (
          <MeetingModal onClose={() => setCreating(false)} />
        )}
        {editingMeeting && (
          <MeetingModal meeting={editingMeeting} onClose={() => setEditingMeeting(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
