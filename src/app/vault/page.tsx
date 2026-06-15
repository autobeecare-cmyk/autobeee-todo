"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderLock, Search, Plus, X, Trash2, Download, Eye, FileText, Image,
  Table, File, User, Calendar, ExternalLink, HardDrive, CheckCircle2, ChevronRight, ChevronDown
} from "lucide-react";
import { format } from "date-fns";

import { useDocumentStore } from "@/store/useDocumentStore";
import { usePartnerStore } from "@/store/usePartnerStore";
import { cn } from "@/lib/utils";
import type { Document, Partner } from "@/lib/types";
import { fadeUp, staggerContainer } from "@/lib/animations";

const CATEGORIES = [
  "Legal", "Contracts", "Finance", "Marketing",
  "Operations", "Research", "Partner Docs", "General"
] as const;

const PERFORMED_BY = ["Sourabh", "Asher", "Subin"] as const;

// Helper to determine file icon
const getFileIcon = (type: Document['file_type']) => {
  if (type === 'pdf') return <FileText className="w-8 h-8 text-red-400" />;
  if (type === 'image') return <Image className="w-8 h-8 text-blue-400" />;
  if (type === 'sheet') return <Table className="w-8 h-8 text-green-400" />;
  return <File className="w-8 h-8 text-gray-400" />;
};

// Formatting helper for size bytes
const formatBytes = (bytes?: number) => {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// ── Document Card Component ──
function DocumentCard({ doc, partners, onDelete }: {
  doc: Document;
  partners: Partner[];
  onDelete: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  const matchedPartner = useMemo(() => {
    return partners.find(p => p.id === doc.related_partner_id);
  }, [partners, doc.related_partner_id]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${doc.name}"?`)) return;
    setDeleting(true);
    try {
      await onDelete();
    } catch (err) {
      alert("Failed to delete: " + (err as any).message);
    } finally {
      setDeleting(false);
    }
  };

  const triggerDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(doc.file_url);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = doc.name;
      window.document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      window.open(doc.file_url, "_blank");
    }
  };

  return (
    <div className="group rounded-xl p-4 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-[#FFC107]/25 transition-all flex flex-col justify-between gap-3 relative">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
          {getFileIcon(doc.file_type)}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-foreground/95 truncate" title={doc.name}>
            {doc.name}
          </h4>
          <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground block mt-0.5">
            {doc.category} · {formatBytes(doc.file_size_bytes)}
          </span>
          {doc.description && (
            <p className="text-[10px] text-muted-foreground/85 line-clamp-2 mt-1.5 leading-relaxed">
              {doc.description}
            </p>
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-white/05 flex flex-col gap-1.5 text-[9px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <User className="w-3 h-3 text-muted-foreground/70" />
          <span>Uploaded by <strong className="text-foreground/80">{doc.uploaded_by}</strong></span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-muted-foreground/70" />
            <span>{format(new Date(doc.created_at), "dd MMM yyyy")}</span>
          </div>
          {matchedPartner && (
            <span className="text-[8px] px-1.5 py-0.2 rounded bg-[#FFC107]/10 text-[#FFC107] font-semibold truncate max-w-[100px]">
              🤝 {matchedPartner.name}
            </span>
          )}
        </div>
      </div>

      {/* Hover action overlay buttons */}
      <div className="flex gap-1.5 mt-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={doc.file_url} target="_blank" rel="noreferrer"
          className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
          title="View in new tab"
        >
          <Eye className="w-3.5 h-3.5" />
        </a>
        <button
          onClick={triggerDownload}
          className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors cursor-pointer"
          title="Download File"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleDelete} disabled={deleting}
          className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors disabled:opacity-50"
          title="Delete file permanently"
        >
          {deleting ? (
            <div className="w-3.5 h-3.5 border border-red-400/30 border-t-red-400 rounded-full animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

// ── Upload Document Modal ──
// UploadDocumentModal contains all fields to match Document upload
function UploadDocumentModal({ onClose, onUpload, partners }: {
  onClose: () => void;
  onUpload: (file: File, metadata: { name: string; description?: string; category: Document['category']; tags?: string[]; related_partner_id?: string; uploaded_by: string }) => Promise<void>;
  partners: Partner[];
}) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Document['category']>("General");
  const [relatedPartnerId, setRelatedPartnerId] = useState("");
  const [uploadedBy, setUploadedBy] = useState<string>("Sourabh");
  const [saving, setSaving] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setName(selected.name.replace(/\.[^/.]+$/, "")); // Strip extension as default name
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name) return;
    setSaving(true);
    try {
      await onUpload(file, {
        name,
        description: description || undefined,
        category,
        related_partner_id: relatedPartnerId || undefined,
        uploaded_by: uploadedBy,
        tags: []
      });
      onClose();
    } catch (err) {
      alert("Upload failed: " + (err as any).message);
    } finally {
      setSaving(false);
    }
  };

  const joinedPartners = useMemo(() => {
    return partners.filter(p => p.pipeline_status === "Joined" || p.pipeline_status === "Interested" || p.pipeline_status === "Negotiating");
  }, [partners]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121212] p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar"
      >
        <div className="flex items-center justify-between border-b border-white/05 pb-2">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
            <HardDrive className="w-4 h-4 text-[#FFC107]" /> Upload Document to Vault
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/5 text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {/* File Picker */}
          <div className="relative">
            <input
              type="file" id="vault-doc-picker" required className="hidden"
              onChange={handleFileChange}
            />
            <label
              htmlFor="vault-doc-picker"
              className={cn(
                "w-full py-6 rounded-xl border-2 border-dashed border-white/15 hover:border-[#FFC107]/50 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-white/[0.01]",
                file && "border-green-500/30 bg-green-500/[0.01] hover:border-green-500/50"
              )}
            >
              {file ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                  <span className="text-xs font-bold text-foreground truncate max-w-[280px]">{file.name}</span>
                  <span className="text-[10px] text-muted-foreground">{formatBytes(file.size)}</span>
                </>
              ) : (
                <>
                  <Plus className="w-6 h-6 text-[#FFC107]" />
                  <span className="text-xs font-bold text-foreground">Select PDF, Image, doc, sheet</span>
                  <span className="text-[9px] text-muted-foreground">Max file size: 50MB</span>
                </>
              )}
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Document Display Name*</label>
              <input
                value={name} onChange={e => setName(e.target.value)} required placeholder="Partnership Contract"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground focus:border-[#FFC107]/40"
              />
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Description</label>
              <textarea
                value={description} onChange={e => setDescription(e.target.value)} rows={2}
                placeholder="Brief summary of document content..."
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground resize-none focus:border-[#FFC107]/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Category*</label>
                <select
                  value={category} onChange={e => setCategory(e.target.value as any)}
                  className="w-full px-2 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground cursor-pointer"
                >
                  {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#161616]">{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Uploaded By*</label>
                <select
                  value={uploadedBy} onChange={e => setUploadedBy(e.target.value)}
                  className="w-full px-2 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground cursor-pointer"
                >
                  {PERFORMED_BY.map(p => <option key={p} value={p} className="bg-[#161616]">{p}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Link to Partner (Optional)</label>
              <select
                value={relatedPartnerId} onChange={e => setRelatedPartnerId(e.target.value)}
                className="w-full px-2 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground cursor-pointer"
              >
                <option value="" className="bg-[#161616]">None</option>
                {joinedPartners.map(p => <option key={p.id} value={p.id} className="bg-[#161616]">{p.name} ({p.area})</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving || !file || !name}
              className="flex-1 py-2 rounded-xl bee-gradient text-[#111] text-xs font-semibold flex items-center justify-center"
            >
              {saving ? <div className="w-3.5 h-3.5 border border-[#111]/30 border-t-[#111] rounded-full animate-spin" /> : "Start Upload"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Main Page Component ──
export default function DocumentVaultPage() {
  const { documents, loading, addDocument, deleteDocument } = useDocumentStore();
  const { partners } = usePartnerStore();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [uploadOpen, setUploadOpen] = useState(false);

  // Category collapse state
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  // Filtered documents list
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      if (search && !doc.name.toLowerCase().includes(search.toLowerCase()) && !doc.description?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory !== "all" && doc.category !== filterCategory) return false;
      return true;
    });
  }, [documents, search, filterCategory]);

  // Recents (3 most recently uploaded documents)
  const recentDocs = useMemo(() => {
    return [...documents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 3);
  }, [documents]);

  const docsByCategory = useMemo(() => {
    const map: Record<string, Document[]> = {};
    CATEGORIES.forEach(c => { map[c] = []; });
    filteredDocs.forEach(d => {
      if (map[d.category]) {
        map[d.category].push(d);
      } else {
        map[d.category] = [d];
      }
    });
    return map;
  }, [filteredDocs]);

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground/95 flex items-center gap-2">
            <FolderLock className="w-6 h-6 text-[#FFC107]" />
            Secure Document Vault
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Corporate document attachments, partnership agreements & financials</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bee-gradient text-[#111] text-sm font-semibold shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Upload Document
        </motion.button>
      </div>

      {/* Statistics info banner */}
      <div className="flex items-center gap-4 bg-white/[0.01] border border-white/05 p-3.5 rounded-2xl">
        <div className="p-2 bg-[#FFC107]/10 text-[#FFC107] rounded-lg">
          <HardDrive className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Vault Space Capacity</span>
          <div className="text-xs font-semibold text-foreground/80 mt-0.5">
            {documents.length} secure documents saved · {CATEGORIES.length} folders classification
          </div>
        </div>
      </div>

      {/* Filter and search controls */}
      <div className="flex items-center gap-3 bg-white/[0.01] border border-white/05 px-4 py-3 rounded-2xl flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search vault documents..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs outline-none focus:border-[rgba(255,193,7,0.4)] focus:bg-white/[0.05] transition-all text-foreground"
          />
        </div>

        <select
          value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs outline-none text-foreground select-none cursor-pointer hover:bg-white/[0.05]"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#161616]">{c}</option>)}
        </select>
      </div>

      {/* SECTION 1 — Recents/Pinned row */}
      {recentDocs.length > 0 && !search && filterCategory === "all" && (
        <div className="space-y-2.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block px-1">Pinned / Recent Documents</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentDocs.map(doc => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                partners={partners}
                onDelete={async () => { await deleteDocument(doc.id, doc.file_url); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2 — Category Breakdown (Collapsible Grid) */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-xs">Loading Secure files list...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-xs border border-dashed border-white/05 rounded-2xl bg-white/[0.01]">
            No documents match your query or category filters.
          </div>
        ) : (
          CATEGORIES.map(cat => {
            const list = docsByCategory[cat] || [];
            if (list.length === 0) return null; // Hide empty categories

            const isCollapsed = collapsedCategories[cat] ?? false;

            return (
              <div key={cat} className="rounded-2xl border border-white/05 bg-white/[0.01] overflow-hidden">
                {/* Collapsible Header */}
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] border-b border-white/05 hover:bg-white/[0.04] cursor-pointer text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-[#FFC107]" />}
                    <span className="text-xs font-bold text-foreground/90 uppercase tracking-widest">{cat}</span>
                    <span className="text-[10px] font-bold text-muted-foreground bg-white/5 border border-white/10 px-2 py-0.2 rounded-full">
                      {list.length}
                    </span>
                  </div>
                </button>

                {/* Cards List Grid */}
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="p-4"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {list.map(doc => (
                          <DocumentCard
                            key={doc.id}
                            doc={doc}
                            partners={partners}
                            onDelete={async () => { await deleteDocument(doc.id, doc.file_url); }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Upload File Modal Dialog */}
      <AnimatePresence>
        {uploadOpen && (
          <UploadDocumentModal
            onClose={() => setUploadOpen(false)}
            onUpload={async (file, metadata) => {
              await addDocument(file, metadata);
            }}
            partners={partners}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
