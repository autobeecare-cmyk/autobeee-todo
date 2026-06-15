"use client";
// src/app/meetings/page.tsx — Meetings Module
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Plus, X, Video, MapPin, Clock, FileText, ChevronDown, ChevronUp, Save, Trash2, Edit
} from "lucide-react";
import { format, isAfter, isBefore, parseISO } from "date-fns";
import { useMeetingStore } from "@/store/useMeetingStore";
import { createMeeting, updateMeeting, deleteMeeting } from "@/lib/supabase/meetings";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Meeting, Person } from "@/lib/types";
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
        createdBy: meeting?.createdBy ?? "Sourabh"
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

function MeetingCard({ meeting, onEdit }: { meeting: Meeting; onEdit: (meeting: Meeting) => void }) {
  const [notesText, setNotesText] = useState(meeting.notes ?? "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  const isPastMeeting = isBefore(parseISO(meeting.scheduledAt), new Date());

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await updateMeeting(meeting.id, { notes: notesText.trim() || undefined });
      setEditingNotes(false);
    } finally {
      setSavingNotes(false);
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
  const [creating, setCreating] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [pastOpen, setPastOpen] = useState(false);

  const now = new Date();

  // Split upcoming vs past
  const upcomingMeetings = useMemo(() => {
    return meetings
      .filter(m => isAfter(parseISO(m.scheduledAt), now))
      .sort((a, b) => parseISO(a.scheduledAt).getTime() - parseISO(b.scheduledAt).getTime());
  }, [meetings]);

  const pastMeetings = useMemo(() => {
    return meetings
      .filter(m => isBefore(parseISO(m.scheduledAt), now))
      .sort((a, b) => parseISO(b.scheduledAt).getTime() - parseISO(a.scheduledAt).getTime());
  }, [meetings]);

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
            {upcomingMeetings.length} upcoming meetings scheduled
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
            <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60 px-1">Upcoming Meetings</h2>
            {upcomingMeetings.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-white/[0.05] rounded-2xl">
                <Calendar className="w-8 h-8 text-[#FFC107] mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">No upcoming meetings. Click Schedule to plan one.</p>
              </div>
            ) : (
              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingMeetings.map(m => (
                  <MeetingCard key={m.id} meeting={m} onEdit={setEditingMeeting} />
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
                        <MeetingCard key={m.id} meeting={m} onEdit={setEditingMeeting} />
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
