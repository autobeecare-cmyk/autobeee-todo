"use client";
// src/app/ideas/page.tsx — Long Term Ideas Vault
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Pin, Search, Lightbulb, Rocket, Cpu, FlaskConical, AlertTriangle, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { useIdeaStore } from "@/store/useIdeaStore";
import { createIdea, updateIdea, deleteIdea } from "@/lib/supabase/ideas";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Idea, IdeaCategory } from "@/lib/types";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";


const CAT_CONFIG: Record<IdeaCategory, { label: string; color: string; icon: React.ElementType }> = {
  startup:  { label: "Startup",  color: "#FFC107", icon: Rocket },
  feature:  { label: "Feature",  color: "#6366f1", icon: Cpu },
  research: { label: "Research", color: "#06b6d4", icon: FlaskConical },
  problem:  { label: "Problem",  color: "#ef4444", icon: AlertTriangle },
  request:  { label: "Request",  color: "#22c55e", icon: MessageSquare },
};

const PRIORITY_COLOR = {
  high: { bg: "rgba(239,68,68,0.12)", text: "#ef4444" },
  medium: { bg: "rgba(255,193,7,0.12)", text: "#FFC107" },
  low: { bg: "rgba(107,114,128,0.12)", text: "#6b7280" },
};

function IdeaCard({ idea, onEdit }: { idea: Idea; onEdit: (i: Idea) => void }) {
  const cat = CAT_CONFIG[idea.category];
  const CatIcon = cat.icon;
  const p = PRIORITY_COLOR[idea.priority];

  const togglePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await updateIdea(idea.id, { pinned: !idea.pinned });
  };

  return (
    <motion.div
      layout
      variants={fadeUp}
      className="rounded-2xl p-4 cursor-pointer card-hover glass relative group"
      onClick={() => onEdit(idea)}
    >
      {/* Pin button */}
      <button
        onClick={togglePin}
        className={cn(
          "absolute top-3 right-3 p-1 rounded-lg transition-all",
          idea.pinned ? "text-[#FFC107]" : "text-muted-foreground opacity-0 group-hover:opacity-100"
        )}
      >
        <Pin className="w-3.5 h-3.5" fill={idea.pinned ? "#FFC107" : "none"} />
      </button>

      {/* Category badge */}
      <div className="flex items-center gap-1.5 mb-3">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: cat.color + "20" }}
        >
          <CatIcon className="w-3.5 h-3.5" style={{ color: cat.color }} />
        </div>
        <span className="text-[10px] font-semibold" style={{ color: cat.color }}>{cat.label}</span>
        <span
          className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md font-medium"
          style={{ background: p.bg, color: p.text }}
        >
          {idea.priority}
        </span>
      </div>

      <h3 className="font-semibold text-sm leading-snug mb-2 pr-6">{idea.title}</h3>

      {idea.notes && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{idea.notes}</p>
      )}

      {idea.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {idea.tags.map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-muted-foreground">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        {format(new Date(idea.createdAt), "d MMM yyyy")}
      </p>
    </motion.div>
  );
}

function IdeaModal({ idea, onClose }: { idea: Idea | null; onClose: () => void }) {
  const [title, setTitle] = useState(idea?.title ?? "");
  const [notes, setNotes] = useState(idea?.notes ?? "");
  const [category, setCategory] = useState<IdeaCategory>(idea?.category ?? "feature");
  const [priority, setPriority] = useState<"high" | "medium" | "low">(idea?.priority ?? "medium");
  const [tagsInput, setTagsInput] = useState(idea?.tags.join(", ") ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
    const data = { title, notes, category, priority, tags, pinned: idea?.pinned ?? false };
    if (idea) {
      await updateIdea(idea.id, data);
    } else {
      await createIdea(data);
    }
    setSaving(false);
    onClose();
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
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 space-y-4 glass-strong"
        style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.09)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{idea ? "Edit Idea" : "Capture Idea"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <input
          autoFocus value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Idea title..."
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/08 text-sm outline-none focus:border-[rgba(255,193,7,0.4)] transition-colors"
        />
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Notes, context, or details..." rows={3}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/08 text-sm outline-none resize-none"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value as IdeaCategory)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm outline-none text-foreground">
              {Object.entries(CAT_CONFIG).map(([k, v]) => <option key={k} value={k} className="bg-[#161616] text-[#f5f5f5]">{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value as "high" | "medium" | "low")}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm outline-none text-foreground">
              <option value="high" className="bg-[#161616] text-[#f5f5f5]">🔴 High</option>
              <option value="medium" className="bg-[#161616] text-[#f5f5f5]">🟡 Medium</option>
              <option value="low" className="bg-[#161616] text-[#f5f5f5]">⚪ Low</option>
            </select>
          </div>
        </div>

        <input
          value={tagsInput} onChange={e => setTagsInput(e.target.value)}
          placeholder="Tags (comma-separated)"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/08 text-sm outline-none focus:border-[rgba(255,193,7,0.4)] transition-colors"
        />

        <div className="flex gap-3">
          {idea && (
            <button
              onClick={async () => { await deleteIdea(idea.id); onClose(); }}
              className="px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-sm"
            >
              Delete
            </button>
          )}
          <button
            onClick={save} disabled={saving || !title.trim()}
            className="flex-1 py-2.5 rounded-xl bee-gradient text-[#111] font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <div className="w-4 h-4 border-2 border-[#111]/30 border-t-[#111] rounded-full animate-spin" /> : (idea ? "Save" : "Capture")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function IdeasPage() {
  const { ideas, loading } = useIdeaStore();
  const [editIdea, setEditIdea] = useState<Idea | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<IdeaCategory | "all">("all");

  const filtered = useMemo(() => {
    let i = ideas;
    if (search) i = i.filter(x => x.title.toLowerCase().includes(search.toLowerCase()) || x.notes?.toLowerCase().includes(search.toLowerCase()));
    if (filterCat !== "all") i = i.filter(x => x.category === filterCat);
    return [...i.filter(x => x.pinned), ...i.filter(x => !x.pinned)];
  }, [ideas, search, filterCat]);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerContainer}
      className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 max-w-[1560px] w-full mx-auto space-y-5"
    >
      {/* Header */}
      <PageHeader
        title="Ideas Vault"
        subtitle={`${ideas.length} ideas captured`}
        actions={
          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bee-gradient text-[#111] text-xs font-bold shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            <span>Capture Idea</span>
          </motion.button>
        }
      />

      {/* Search + filter */}
      <div className="flex items-center gap-2 flex-wrap bg-white/[0.02] border border-white/[0.06] p-2.5 rounded-2xl">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search ideas..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none focus:border-[rgba(255,193,7,0.3)] transition-colors text-foreground"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {["all", ...Object.keys(CAT_CONFIG)].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat as IdeaCategory | "all")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border cursor-pointer",
                filterCat === cat
                  ? "bee-gradient text-[#111] border-transparent font-extrabold"
                  : "bg-white/5 text-muted-foreground border-white/08 hover:text-foreground hover:bg-white/10"
              )}
            >
              {cat === "all" ? "All" : CAT_CONFIG[cat as IdeaCategory].label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Lightbulb className="w-6 h-6" />}
          title="No ideas yet"
          description="Capture new startup concepts, feature requests, or market opportunities."
          actionText="+ Capture Idea"
          onAction={() => setCreating(true)}
          className="mt-6"
        />
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
          {filtered.map(idea => (
            <motion.div key={idea.id} variants={fadeUp} className="mb-4 break-inside-avoid">
              <IdeaCard idea={idea} onEdit={setEditIdea} />
            </motion.div>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {(editIdea || creating) && (
          <IdeaModal
            idea={editIdea}
            onClose={() => { setEditIdea(null); setCreating(false); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
