"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, LayoutGrid, List, Calendar,
  Trash2, Phone, MessageSquare, MapPin, Handshake,
  CheckCircle2, AlertCircle, TrendingUp, DollarSign,
  ChevronDown, X, Edit3, Heart, PlusCircle, FileText,
  File, Table, Image, ExternalLink
} from "lucide-react";
import { format, isPast } from "date-fns";
import Link from "next/link";
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors,
  closestCorners
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { usePartnerStore } from "@/store/usePartnerStore";
import { useDocumentStore } from "@/store/useDocumentStore";
import { cn } from "@/lib/utils";
import type { Partner, PartnerInteraction, Document } from "@/lib/types";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { addInteraction, getInteractions } from "@/lib/supabase/partners";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { AutoBeeBadge } from "@/components/common/AutoBeeBadge";

const COLUMNS: { id: Partner['pipeline_status']; label: string; color: string; bg: string }[] = [
  { id: "Wishlist",    label: "Wishlist",    color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  { id: "Contacted",   label: "Contacted",   color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  { id: "Follow-Up",   label: "Follow-Up",   color: "#FFC107", bg: "rgba(255,193,7,0.12)" },
  { id: "Interested",  label: "Interested",  color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  { id: "Negotiating", label: "Negotiating", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  { id: "Joined",      label: "Joined",      color: "#059669", bg: "rgba(5,150,105,0.15)" },
  { id: "Rejected",    label: "Rejected",    color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
];

const TYPES = ["Car Wash", "Mechanic", "Detailing Studio", "Multi-Service", "Tyre Shop", "Auto Spa", "Other"];
const INTEREST_LEVELS = ["High", "Medium", "Low", "Unknown"];
const TIE_LEVELS = ["Basic", "Standard", "Premium", "Multi-Service"];
const FOLLOW_UP_METHODS = ["Call", "WhatsApp", "Visit", "Email"];
const PERFORMED_BY = ["Sourabh", "Asher", "Subin"];

// Helper to determine file icon
const getFileIcon = (type: Document['file_type']) => {
  if (type === 'pdf') return <FileText className="w-4 h-4 text-red-400" />;
  if (type === 'image') return <Image className="w-4 h-4 text-blue-400" />;
  if (type === 'sheet') return <Table className="w-4 h-4 text-green-400" />;
  return <File className="w-4 h-4 text-gray-400" />;
};

// ── Kanban Partner Card ──
function KanbanCard({ partner, onEdit, onLogInteraction }: {
  partner: Partner;
  onEdit: (p: Partner) => void;
  onLogInteraction: (p: Partner) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: partner.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const statusColor = COLUMNS.find(c => c.id === partner.pipeline_status)?.color || "#6b7280";
  const interestColor = partner.interest_level === "High" ? "text-green-400 bg-green-500/10" : partner.interest_level === "Medium" ? "text-amber-400 bg-amber-500/10" : "text-gray-400 bg-gray-500/10";
  const isOverdue = partner.next_follow_up_date && isPast(new Date(partner.next_follow_up_date));

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onEdit(partner)}
      className={cn(
        "group rounded-xl p-3.5 cursor-pointer transition-all duration-300 relative overflow-hidden bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04]",
        "hover:shadow-[0_8px_24px_rgba(255,193,7,0.08)] hover:border-[rgba(255,193,7,0.3)]",
        partner.pipeline_status === 'Joined' && "border-emerald-500/30 hover:border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.05)]",
        isDragging && "z-50 drag-overlay"
      )}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: statusColor }} />

      <div className="flex flex-col gap-2 pl-1.5">
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {partner.survey_id && (
              <span className="text-[9px] font-bold bg-white/5 border border-white/10 px-1.5 py-0.2 rounded-md text-muted-foreground">
                {partner.survey_id}
              </span>
            )}
            <h4 className="text-xs font-semibold leading-snug tracking-tight text-foreground/90 truncate max-w-[170px]">
              {partner.name}
            </h4>
          </div>
          <div
            {...attributes}
            {...listeners}
            className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-foreground flex-shrink-0 transition-opacity p-0.5"
            onClick={e => e.stopPropagation()}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3 flex-shrink-0" /> {partner.area}</span>
          <span>·</span>
          <span>{partner.partner_type}</span>
        </div>

        {partner.phone && (
          <div className="text-[10px] font-medium text-foreground/80 flex items-center gap-1">
            <Phone className="w-3 h-3 text-[#FFC107] flex-shrink-0" />
            <span>{partner.phone}</span>
          </div>
        )}

        {partner.interest_level && partner.interest_level !== "Unknown" && (
          <div className="mt-1 flex">
            <span className={cn("text-[9px] px-1.5 py-0.2 rounded-md font-semibold border border-white/05", interestColor)}>
              🔥 {partner.interest_level} Interest
            </span>
          </div>
        )}

        {partner.follow_up_needed && (
          <div className="flex items-center gap-1 mt-0.5">
            <span className={cn(
              "text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5 px-1.5 py-0.5 rounded",
              isOverdue ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-amber-500/10 text-[#FFC107] border border-amber-500/20"
            )}>
              💬 {partner.follow_up_method || 'Follow-Up'}
              {partner.next_follow_up_date && ` (${partner.next_follow_up_date.split('-')[2]}/${partner.next_follow_up_date.split('-')[1]})`}
            </span>
          </div>
        )}

        {partner.notes && (
          <p className="text-[10px] text-muted-foreground/75 italic line-clamp-2 leading-relaxed bg-white/[0.01] p-1.5 rounded-lg border border-white/[0.02]">
            &ldquo;{partner.notes}&rdquo;
          </p>
        )}

        <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-white/05 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onLogInteraction(partner)}
            className="text-[9px] font-bold text-[#FFC107] bg-[#FFC107]/10 hover:bg-[#FFC107]/20 border border-[#FFC107]/20 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
          >
            Log Contact
          </button>
          <button
            onClick={() => onEdit(partner)}
            className="text-[9px] font-bold text-foreground hover:bg-white/5 border border-white/10 px-2 py-1 rounded-lg transition-colors"
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Kanban Column ──
function KanbanColumn({ column, partners, onEdit, onLogInteraction }: {
  column: typeof COLUMNS[0];
  partners: Partner[];
  onEdit: (p: Partner) => void;
  onLogInteraction: (p: Partner) => void;
}) {
  const isFollowUpCol = column.id === "Follow-Up";
  const hasOverdue = useMemo(() =>
    partners.some(p => p.next_follow_up_date && isPast(new Date(p.next_follow_up_date))),
    [partners]
  );

  return (
    <div className="flex-1 min-w-[280px] bg-white/[0.015] border border-white/[0.03] rounded-2xl p-3 flex flex-col snap-start min-h-[500px]">
      <div className="flex items-center gap-2.5 mb-4 px-1.5 pt-1">
        <div
          className={cn(
            "w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]",
            isFollowUpCol && hasOverdue && "animate-pulse"
          )}
          style={{
            background: column.color,
            boxShadow: isFollowUpCol && hasOverdue ? `0 0 12px ${column.color}` : `0 0 8px ${column.color}80`
          }}
        />
        <span className="text-xs font-bold text-foreground/90 uppercase tracking-widest">{column.label}</span>
        <span className="text-[10px] font-bold text-muted-foreground bg-white/5 border border-white/10 px-2 py-0.5 rounded-full ml-auto">
          {partners.length}
        </span>
      </div>

      <SortableContext items={partners.map(p => p.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 flex flex-col gap-3 min-h-[400px]">
          {partners.map(partner => (
            <KanbanCard
              key={partner.id}
              partner={partner}
              onEdit={onEdit}
              onLogInteraction={onLogInteraction}
            />
          ))}
          {partners.length === 0 && (
            <div className="flex-1 border-2 border-dashed border-white/[0.03] rounded-xl flex items-center justify-center text-[10px] text-muted-foreground/30 py-12">
              Drop partners here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ── Slide-Over Detail Sheet ──
function PartnerDetailSheet({
  partner,
  onClose,
  onSave,
  onDelete,
  onAddInteractionLog,
  documents,
  onUploadDoc
}: {
  partner: Partner;
  onClose: () => void;
  onSave: (updates: Partial<Partner>) => Promise<void>;
  onDelete: () => Promise<void>;
  onAddInteractionLog: (interaction: Omit<PartnerInteraction, 'id' | 'created_at'>) => Promise<void>;
  documents: Document[];
  onUploadDoc: (file: File) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "interactions" | "commission" | "documents">("overview");
  const [interactions, setInteractions] = useState<PartnerInteraction[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);

  // Edit states
  const [name, setName] = useState(partner.name);
  const [ownerName, setOwnerName] = useState(partner.owner_name ?? "");
  const [phone, setPhone] = useState(partner.phone ?? "");
  const [altPhone, setAltPhone] = useState(partner.alternate_phone ?? "");
  const [area, setArea] = useState(partner.area);
  const [type, setType] = useState<Partner['partner_type']>(partner.partner_type);
  const [tier, setTier] = useState<Partner['tier']>(partner.tier);
  const [pipelineStatus, setPipelineStatus] = useState<Partner['pipeline_status']>(partner.pipeline_status);
  const [interestLevel, setInterestLevel] = useState<Partner['interest_level']>(partner.interest_level ?? "Unknown");
  const [gmapsLink, setGmapsLink] = useState(partner.google_maps_link ?? "");
  const [fullAddress, setFullAddress] = useState(partner.full_address ?? "");
  const [services, setServices] = useState<string[]>(partner.services ?? []);
  const [newService, setNewService] = useState("");

  const [notes, setNotes] = useState(partner.notes ?? "");
  const [internalNotes, setInternalNotes] = useState(partner.internal_notes ?? "");

  // Business metrics
  const [avgWeekdayCars, setAvgWeekdayCars] = useState(partner.avg_weekday_cars?.toString() ?? "");
  const [avgWeekendCars, setAvgWeekendCars] = useState(partner.avg_weekend_cars?.toString() ?? "");
  const [peakTime, setPeakTime] = useState(partner.peak_business_time ?? "");
  const [biggestIssue, setBiggestIssue] = useState(partner.biggest_issue ?? "");

  // Pricing
  const [priceHatch, setPriceHatch] = useState(partner.price_hatchback?.toString() ?? "");
  const [priceSedan, setPriceSedan] = useState(partner.price_sedan?.toString() ?? "");
  const [priceSuv, setPriceSuv] = useState(partner.price_suv?.toString() ?? "");

  // Commission Rate
  const [commissionRate, setCommissionRate] = useState(partner.commission_rate?.toString() ?? "0");

  // Interaction Form state
  const [intType, setIntType] = useState<PartnerInteraction['interaction_type']>("Call");
  const [intOutcome, setIntOutcome] = useState<PartnerInteraction['outcome']>("Positive");
  const [intNotes, setIntNotes] = useState("");
  const [intNextAction, setIntNextAction] = useState("");
  const [intPerformedBy, setIntPerformedBy] = useState("Sourabh");
  const [intSaving, setIntSaving] = useState(false);

  // File Upload State
  const [uploadingFile, setUploadingFile] = useState(false);

  // Load interactions on mount or partner change
  useEffect(() => {
    async function load() {
      setLoadingInteractions(true);
      try {
        const data = await getInteractions(partner.id);
        setInteractions(data);
      } catch (e) {
        console.error("Failed to load interactions:", e);
      } finally {
        setLoadingInteractions(false);
      }
    }
    load();
  }, [partner.id]);

  const handleSave = async () => {
    const data: Partial<Partner> = {
      name,
      owner_name: ownerName || undefined,
      phone: phone || undefined,
      alternate_phone: altPhone || undefined,
      area,
      partner_type: type,
      tier,
      pipeline_status: pipelineStatus,
      interest_level: interestLevel,
      google_maps_link: gmapsLink || undefined,
      full_address: fullAddress || undefined,
      services,
      notes: notes || undefined,
      internal_notes: internalNotes || undefined,
      avg_weekday_cars: avgWeekdayCars ? parseInt(avgWeekdayCars) : undefined,
      avg_weekend_cars: avgWeekendCars ? parseInt(avgWeekendCars) : undefined,
      peak_business_time: peakTime || undefined,
      biggest_issue: biggestIssue || undefined,
      price_hatchback: priceHatch ? parseFloat(priceHatch) : undefined,
      price_sedan: priceSedan ? parseFloat(priceSedan) : undefined,
      price_suv: priceSuv ? parseFloat(priceSuv) : undefined,
      commission_rate: commissionRate ? parseFloat(commissionRate) : undefined,
    };
    await onSave(data);
  };

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.trim()) return;
    if (!services.includes(newService.trim())) {
      const updated = [...services, newService.trim()];
      setServices(updated);
      onSave({ services: updated });
    }
    setNewService("");
  };

  const handleRemoveService = (srv: string) => {
    const updated = services.filter(s => s !== srv);
    setServices(updated);
    onSave({ services: updated });
  };

  const handleSaveInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntSaving(true);
    try {
      const data = {
        partner_id: partner.id,
        interaction_type: intType,
        outcome: intOutcome,
        notes: intNotes || undefined,
        next_action: intNextAction || undefined,
        performed_by: intPerformedBy,
        interaction_date: new Date().toISOString()
      };
      await onAddInteractionLog(data);
      // Reload log list
      const updated = await getInteractions(partner.id);
      setInteractions(updated);
      setIntNotes("");
      setIntNextAction("");
    } catch (err) {
      console.error(err);
    } finally {
      setIntSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      await onUploadDoc(file);
    } catch (err) {
      alert("Failed to upload: " + (err as any).message);
    } finally {
      setUploadingFile(false);
    }
  };

  const linkedDocs = useMemo(() => {
    return documents.filter(d => d.related_partner_id === partner.id);
  }, [documents, partner.id]);

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
        className="fixed top-0 right-0 h-full w-full sm:max-w-xl bg-[var(--card)] border-l border-white/10 z-[60] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/05 flex items-start justify-between bg-white/[0.01]">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {partner.survey_id && (
                <span className="text-[10px] font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-muted-foreground">
                  {partner.survey_id}
                </span>
              )}
              <span className="text-xs px-2 py-0.5 rounded bg-white/5 border border-white/08 text-muted-foreground capitalize">{partner.partner_type}</span>
            </div>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={handleSave}
              className="text-lg font-bold text-foreground outline-none bg-transparent w-full border-b border-transparent focus:border-[#FFC107]/50"
            />
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-white/05 px-3 bg-white/[0.01]">
          {([
            { id: "overview", label: "Overview" },
            { id: "interactions", label: "Interactions" },
            { id: "commission", label: "Commission & money" },
            { id: "documents", label: "Vault Docs" },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider relative transition-colors cursor-pointer",
                activeTab === tab.id ? "text-[#FFC107]" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="active-sheet-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFC107]"
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content Panel */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Pipeline Status Banner */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border border-white/05">
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">CRM Funnel Status</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <select
                      value={pipelineStatus}
                      onChange={e => {
                        setPipelineStatus(e.target.value as Partner['pipeline_status']);
                        onSave({ pipeline_status: e.target.value as Partner['pipeline_status'] });
                      }}
                      className="text-xs bg-white/5 border border-white/10 px-2 py-1 rounded-lg outline-none text-foreground cursor-pointer capitalize"
                    >
                      {COLUMNS.map(c => <option key={c.id} value={c.id} className="bg-[#161616] text-[#f5f5f5]">{c.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block text-right">Interest Level</span>
                  <select
                    value={interestLevel}
                    onChange={e => {
                      setInterestLevel(e.target.value as Partner['interest_level']);
                      onSave({ interest_level: e.target.value as Partner['interest_level'] });
                    }}
                    className="text-xs bg-white/5 border border-white/10 px-2 py-1 rounded-lg outline-none text-foreground mt-0.5 cursor-pointer"
                  >
                    {INTEREST_LEVELS.map(il => <option key={il} value={il} className="bg-[#161616] text-[#f5f5f5]">{il}</option>)}
                  </select>
                </div>
              </div>

              {/* Main Fields Form */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Owner Name</label>
                  <input
                    value={ownerName} onChange={e => setOwnerName(e.target.value)} onBlur={handleSave}
                    placeholder="Owner Contact"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground focus:border-[#FFC107]/45"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Primary Phone</label>
                  <input
                    value={phone} onChange={e => setPhone(e.target.value)} onBlur={handleSave}
                    placeholder="Phone number"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground focus:border-[#FFC107]/45"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Alternate Phone</label>
                  <input
                    value={altPhone} onChange={e => setAltPhone(e.target.value)} onBlur={handleSave}
                    placeholder="Alt Phone number"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground focus:border-[#FFC107]/45"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Business Tier</label>
                  <select
                    value={tier} onChange={e => { setTier(e.target.value as Partner['tier']); onSave({ tier: e.target.value as Partner['tier'] }); }}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
                  >
                    {TIE_LEVELS.map(t => <option key={t} value={t} className="bg-[#161616]">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Area / Locality</label>
                  <input
                    value={area} onChange={e => setArea(e.target.value)} onBlur={handleSave}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground focus:border-[#FFC107]/45"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Google Maps Link</label>
                  <div className="flex gap-1.5">
                    <input
                      value={gmapsLink} onChange={e => setGmapsLink(e.target.value)} onBlur={handleSave}
                      placeholder="Maps URL"
                      className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground focus:border-[#FFC107]/45"
                    />
                    {gmapsLink && (
                      <a href={gmapsLink} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-[#FFC107]/10 border border-[#FFC107]/20 text-[#FFC107] hover:bg-[#FFC107]/20 flex items-center justify-center">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Full Address</label>
                <textarea
                  value={fullAddress} onChange={e => setFullAddress(e.target.value)} onBlur={handleSave}
                  rows={2} placeholder="Complete physical address..."
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground resize-none focus:border-[#FFC107]/45"
                />
              </div>

              {/* Tag Services Input */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground block">Services Offered</label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white/[0.01] border border-white/05 min-h-[44px]">
                  {services.map(srv => (
                    <span key={srv} className="text-[10px] font-semibold bg-white/5 border border-white/08 text-foreground/90 pl-2 pr-1 py-0.5 rounded-lg flex items-center gap-1 group/srv">
                      {srv}
                      <button onClick={() => handleRemoveService(srv)} className="p-0.5 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  {services.length === 0 && (
                    <span className="text-[10px] text-muted-foreground/40 self-center pl-1 italic">No services listed yet</span>
                  )}
                </div>
                <form onSubmit={handleAddService} className="flex gap-2">
                  <input
                    value={newService} onChange={e => setNewService(e.target.value)}
                    placeholder="Add service (e.g. Steam Wash)..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground focus:border-[#FFC107]/45"
                  />
                  <button type="submit" className="px-3 py-1.5 rounded-xl bg-[#FFC107]/10 hover:bg-[#FFC107]/20 border border-[#FFC107]/20 text-[#FFC107] text-xs font-semibold">
                    Add
                  </button>
                </form>
              </div>

              {/* Pricing Cards */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Standard Pricing (₹)</span>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-2.5 rounded-xl bg-white/[0.01] border border-white/05 flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Hatchback</span>
                    <input
                      type="number" value={priceHatch} onChange={e => setPriceHatch(e.target.value)} onBlur={handleSave}
                      placeholder="₹"
                      className="bg-transparent border-0 border-b border-transparent focus:border-[#FFC107]/50 text-xs font-bold text-foreground outline-none w-full"
                    />
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.01] border border-white/05 flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Sedan</span>
                    <input
                      type="number" value={priceSedan} onChange={e => setPriceSedan(e.target.value)} onBlur={handleSave}
                      placeholder="₹"
                      className="bg-transparent border-0 border-b border-transparent focus:border-[#FFC107]/50 text-xs font-bold text-foreground outline-none w-full"
                    />
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.01] border border-white/05 flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">SUV</span>
                    <input
                      type="number" value={priceSuv} onChange={e => setPriceSuv(e.target.value)} onBlur={handleSave}
                      placeholder="₹"
                      className="bg-transparent border-0 border-b border-transparent focus:border-[#FFC107]/50 text-xs font-bold text-foreground outline-none w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Market Research Survey Statistics */}
              <div className="space-y-2 p-3.5 rounded-xl bg-white/[0.01] border border-white/05">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Market Research Survey Details</span>
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Avg Weekday Cars</label>
                    <input
                      type="number" value={avgWeekdayCars} onChange={e => setAvgWeekdayCars(e.target.value)} onBlur={handleSave}
                      placeholder="Weekday volume"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Avg Weekend Cars</label>
                    <input
                      type="number" value={avgWeekendCars} onChange={e => setAvgWeekendCars(e.target.value)} onBlur={handleSave}
                      placeholder="Weekend volume"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-muted-foreground mb-1 block">Peak Business Hours</label>
                    <input
                      value={peakTime} onChange={e => setPeakTime(e.target.value)} onBlur={handleSave}
                      placeholder="e.g. Saturdays 3 PM - 7 PM"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-muted-foreground mb-1 block">Biggest Painpoint / Challenge</label>
                    <textarea
                      value={biggestIssue} onChange={e => setBiggestIssue(e.target.value)} onBlur={handleSave}
                      rows={2} placeholder="Staff issues, lack of bookings, water issues, etc."
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">General Notes</label>
                  <textarea
                    value={notes} onChange={e => setNotes(e.target.value)} onBlur={handleSave}
                    rows={4} placeholder="General comments..."
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground resize-none focus:border-[#FFC107]/45"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Internal Notes (Team Only)</label>
                  <textarea
                    value={internalNotes} onChange={e => setInternalNotes(e.target.value)} onBlur={handleSave}
                    rows={4} placeholder="Confidential startup team remarks..."
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground resize-none focus:border-[#FFC107]/45"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "interactions" && (
            <div className="space-y-4">
              {/* Interaction Form */}
              <form onSubmit={handleSaveInteraction} className="p-4 rounded-xl bg-white/[0.01] border border-white/05 space-y-3.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Log New Contact Attempt</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Type</label>
                    <select
                      value={intType} onChange={e => setIntType(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
                    >
                      {FOLLOW_UP_METHODS.concat("Meeting").map(m => <option key={m} value={m} className="bg-[#161616]">{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Outcome</label>
                    <select
                      value={intOutcome} onChange={e => setIntOutcome(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
                    >
                      {["Positive", "Neutral", "Negative", "No Response"].map(o => <option key={o} value={o} className="bg-[#161616]">{o}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-muted-foreground mb-1 block">Contact Notes / Outcome Summary</label>
                    <input
                      value={intNotes} onChange={e => setIntNotes(e.target.value)}
                      placeholder="Notes about the conversation..." required
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground focus:border-[#FFC107]/40"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Next Action Plan</label>
                    <input
                      value={intNextAction} onChange={e => setIntNextAction(e.target.value)}
                      placeholder="e.g., follow up after 2 days"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Logged By</label>
                    <select
                      value={intPerformedBy} onChange={e => setIntPerformedBy(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
                    >
                      {PERFORMED_BY.map(p => <option key={p} value={p} className="bg-[#161616]">{p}</option>)}
                    </select>
                  </div>
                </div>
                <button
                  type="submit" disabled={intSaving || !intNotes}
                  className="w-full py-2 rounded-xl bee-gradient text-[#111] text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {intSaving ? <div className="w-3.5 h-3.5 border border-[#111]/30 border-t-[#111] rounded-full animate-spin" /> : "Save Interaction Log"}
                </button>
              </form>

              {/* Interactions List */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Interaction History</span>
                {loadingInteractions ? (
                  <div className="text-center text-xs text-muted-foreground py-4">Loading history...</div>
                ) : interactions.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-6 border border-dashed border-white/05 rounded-xl">No contact attempts logged yet.</div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {interactions.map(item => {
                      const outcomeColor = item.outcome === "Positive" ? "text-green-400 bg-green-500/10 border-green-500/20" : item.outcome === "Negative" ? "text-red-400 bg-red-500/10 border-red-500/20" : item.outcome === "No Response" ? "text-gray-400 bg-gray-500/10 border-gray-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20";
                      return (
                        <div key={item.id} className="p-3 rounded-xl bg-white/[0.01] border border-white/05 flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[#FFC107] uppercase tracking-wider">{item.interaction_type}</span>
                              <span className={cn("px-1.5 py-0.2 rounded font-bold border", outcomeColor)}>{item.outcome}</span>
                            </div>
                            <span>{format(new Date(item.interaction_date), "d MMM yyyy, h:mm a")}</span>
                          </div>
                          <p className="text-xs text-foreground/90 mt-1">{item.notes}</p>
                          {item.next_action && (
                            <p className="text-[10px] text-amber-400/90 font-medium mt-1">📌 Next Action: {item.next_action}</p>
                          )}
                          <span className="text-[8px] text-muted-foreground mt-0.5 self-end">Performed by {item.performed_by}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "commission" && (
            <div className="space-y-4">
              {/* Commission controls */}
              <div className="p-4 rounded-xl bg-white/[0.01] border border-white/05 space-y-4">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Partnership Revenue & Commission</span>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Commission Rate (%)</label>
                    <input
                      type="number" value={commissionRate} onChange={e => setCommissionRate(e.target.value)} onBlur={handleSave}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm outline-none text-foreground focus:border-[#FFC107]/45 font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground mb-1 block">Onboarded Date</span>
                    <span className="text-sm font-semibold text-foreground/90 block py-2 px-1">
                      {partner.onboarded_date ? format(new Date(partner.onboarded_date), "dd MMM yyyy") : "-"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5 pt-2 border-t border-white/05">
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/05">
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Total Revenue Generated</span>
                    <span className="text-lg font-bold text-foreground block mt-1">₹{(partner.total_revenue_generated ?? 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FFC107]/5 border border-[#FFC107]/15">
                    <span className="text-[9px] text-[#FFC107] uppercase tracking-wider font-semibold">Autobee Cut (Earned)</span>
                    <span className="text-lg font-bold text-[#FFC107] block mt-1">₹{(partner.total_commission_earned ?? 0).toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {partner.pipeline_status !== "Joined" && (
                  <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl flex items-start gap-1.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>This partner is not marked as <strong>Joined</strong>. Commission statistics and financial linkages will activate once they are officially onboarded.</span>
                  </div>
                )}

                <div className="pt-2">
                  <Link href={`/money?partner=${partner.id}`} className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-foreground hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    View Ledger entries for this Partner
                  </Link>
                </div>
              </div>
            </div>
          )}

          {activeTab === "documents" && (
            <div className="space-y-4">
              {/* Document upload trigger */}
              <div className="p-4 rounded-xl bg-white/[0.01] border border-white/05 space-y-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Partner Documents Vault</span>
                <p className="text-[10px] text-muted-foreground">Upload partnership agreements, photo survey sheets, legal papers, or marketing collaterals linked to this partner.</p>
                
                <div className="relative">
                  <input
                    type="file" id="partner-doc-upload" className="hidden"
                    onChange={handleFileChange} disabled={uploadingFile}
                  />
                  <label
                    htmlFor="partner-doc-upload"
                    className="w-full py-3 rounded-xl border-2 border-dashed border-white/15 hover:border-[#FFC107]/50 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer bg-white/[0.01] text-xs font-semibold text-foreground"
                  >
                    {uploadingFile ? (
                      <>
                        <div className="w-4 h-4 border border-white/30 border-t-[#FFC107] rounded-full animate-spin mb-1" />
                        <span>Uploading file to Storage...</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-5 h-5 text-[#FFC107] mb-1" />
                        <span>Select File to Upload</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Document items list */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Linked Files ({linkedDocs.length})</span>
                {linkedDocs.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-6 border border-dashed border-white/05 rounded-xl">No files linked to this partner.</div>
                ) : (
                  <div className="space-y-2">
                    {linkedDocs.map(doc => (
                      <div key={doc.id} className="p-3 rounded-xl bg-white/[0.01] border border-white/05 flex items-center justify-between gap-3 text-xs hover:bg-white/[0.02]">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                            {getFileIcon(doc.file_type)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground/95 truncate block">{doc.name}</span>
                            <span className="text-[9px] text-muted-foreground">
                              {doc.category} · {doc.file_size_bytes ? `${(doc.file_size_bytes / 1024 / 1024).toFixed(2)} MB` : "Unknown Size"}
                            </span>
                          </div>
                        </div>
                        <a
                          href={doc.file_url} target="_blank" rel="noreferrer"
                          className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground flex items-center justify-center flex-shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Delete action button */}
        <div className="p-5 border-t border-white/05 bg-white/[0.01]">
          <button
            onClick={async () => { if(confirm("Are you sure you want to delete this partner permanently?")) { await onDelete(); onClose(); } }}
            className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center justify-center gap-2 border border-red-500/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Partner Record
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Add Partner Modal ──
function AddPartnerModal({ onClose, onSave, nextSurveyId, existingAreas }: {
  onClose: () => void;
  onSave: (partner: Omit<Partner, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  nextSurveyId: string;
  existingAreas: string[];
}) {
  const [name, setName] = useState("");
  const [surveyId, setSurveyId] = useState(nextSurveyId);
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [type, setType] = useState<Partner['partner_type']>("Car Wash");
  const [tier, setTier] = useState<Partner['tier']>("Standard");
  const [area, setArea] = useState("");
  const [pipelineStatus, setPipelineStatus] = useState<Partner['pipeline_status']>("Wishlist");
  const [interestLevel, setInterestLevel] = useState<Partner['interest_level']>("Unknown");
  const [servicesInput, setServicesInput] = useState("");
  const [notes, setNotes] = useState("");
  const [addedBy, setAddedBy] = useState("Sourabh");
  const [mapsLink, setMapsLink] = useState("");
  const [saving, setSaving] = useState(false);

  const [areaSuggestions, setAreaSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleAreaChange = (val: string) => {
    setArea(val);
    if (!val.trim()) {
      setAreaSuggestions([]);
      return;
    }
    const filtered = existingAreas.filter(a => a.toLowerCase().includes(val.toLowerCase()) && a.toLowerCase() !== val.toLowerCase());
    setAreaSuggestions(filtered.slice(0, 4));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !area || !phone) return;
    setSaving(true);
    try {
      const servicesArray = servicesInput ? servicesInput.split(",").map(s => s.trim()).filter(Boolean) : [];
      await onSave({
        name,
        survey_id: surveyId || undefined,
        owner_name: ownerName || undefined,
        phone,
        alternate_phone: altPhone || undefined,
        partner_type: type,
        tier,
        area,
        city: "Trivandrum",
        state: "Kerala",
        pipeline_status: pipelineStatus,
        interest_level: interestLevel,
        services: servicesArray,
        notes: notes || undefined,
        added_by: addedBy,
        google_maps_link: mapsLink || undefined,
        commission_rate: 0,
        total_revenue_generated: 0,
        total_commission_earned: 0,
        follow_up_needed: pipelineStatus === 'Follow-Up'
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#121212] p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto no-scrollbar"
      >
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/05">
          <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
            <Plus className="w-5 h-5 text-[#FFC107]" /> Add New Partner Record
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3.5">
            <div className="col-span-2">
              <label className="text-[10px] text-muted-foreground mb-1.5 block">Partner / Shop Name*</label>
              <input
                value={name} onChange={e => setName(e.target.value)} required placeholder="PRO AUTOMOTIVE MASTER"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground focus:border-[#FFC107]/40 font-semibold"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1.5 block">Survey ID</label>
              <input
                value={surveyId} onChange={e => setSurveyId(e.target.value)} placeholder="AB-045"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1.5 block">Owner / Contact Name</label>
              <input
                value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Sandeep"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1.5 block">Phone Number*</label>
              <input
                value={phone} onChange={e => setPhone(e.target.value)} required placeholder="9605550596"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1.5 block">Alternate Phone</label>
              <input
                value={altPhone} onChange={e => setAltPhone(e.target.value)} placeholder="8590251641"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1.5 block">Partner Type*</label>
              <select
                value={type} onChange={e => setType(e.target.value as any)}
                className="w-full px-2.5 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              >
                {TYPES.map(t => <option key={t} value={t} className="bg-[#161616]">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1.5 block">Tier Classification</label>
              <select
                value={tier} onChange={e => setTier(e.target.value as any)}
                className="w-full px-2.5 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              >
                {TIE_LEVELS.map(t => <option key={t} value={t} className="bg-[#161616]">{t}</option>)}
              </select>
            </div>
            
            <div className="relative">
              <label className="text-[10px] text-muted-foreground mb-1.5 block">Area / Locality*</label>
              <input
                value={area}
                onChange={e => handleAreaChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                required placeholder="Kazhakuttam"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground focus:border-[#FFC107]/40"
              />
              {showSuggestions && areaSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-[56px] z-50 rounded-xl bg-[#1e1e1e] border border-white/10 py-1 shadow-lg">
                  {areaSuggestions.map(sug => (
                    <button
                      key={sug} type="button" onClick={() => setArea(sug)}
                      className="w-full text-left px-3 py-1.5 text-xs text-foreground/90 hover:bg-[#FFC107]/10 hover:text-[#FFC107] font-medium"
                    >
                      📍 {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground mb-1.5 block">Pipeline Status*</label>
              <select
                value={pipelineStatus} onChange={e => setPipelineStatus(e.target.value as any)}
                className="w-full px-2.5 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              >
                {COLUMNS.map(c => <option key={c.id} value={c.id} className="bg-[#161616]">{c.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground mb-1.5 block">Interest Level</label>
              <select
                value={interestLevel} onChange={e => setInterestLevel(e.target.value as any)}
                className="w-full px-2.5 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              >
                {INTEREST_LEVELS.map(il => <option key={il} value={il} className="bg-[#161616]">{il}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground mb-1.5 block">Added By</label>
              <select
                value={addedBy} onChange={e => setAddedBy(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              >
                {PERFORMED_BY.map(p => <option key={p} value={p} className="bg-[#161616]">{p}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-[10px] text-muted-foreground mb-1.5 block">Google Maps Location Link</label>
              <input
                value={mapsLink} onChange={e => setMapsLink(e.target.value)} placeholder="https://maps.google.com/..."
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[10px] text-muted-foreground mb-1.5 block">Services (Comma separated list)</label>
              <input
                value={servicesInput} onChange={e => setServicesInput(e.target.value)} placeholder="Basic Wash, Detailing, Steam Wash"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[10px] text-muted-foreground mb-1.5 block">Outreach Notes / Initial details</label>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                rows={2} placeholder="Add basic conversation summaries..."
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2.5 border-t border-white/05">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving || !name || !area || !phone}
              className="flex-1 py-2 rounded-xl bee-gradient text-[#111] font-semibold text-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {saving ? <div className="w-4 h-4 border-2 border-[#111]/30 border-t-[#111] rounded-full animate-spin" /> : "Create Partner"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Commission Prompt Modal ──
function CommissionPromptModal({ partner, onConfirm, onCancel }: {
  partner: { name: string; currentCommission?: number };
  onConfirm: (rate: number) => void;
  onCancel: () => void;
}) {
  const [rate, setRate] = useState(partner.currentCommission?.toString() ?? "10");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericRate = parseFloat(rate);
    if (!isNaN(numericRate)) {
      onConfirm(numericRate);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#161616] p-5 shadow-2xl space-y-4"
      >
        <div>
          <h3 className="text-sm font-bold text-[#FFC107] uppercase tracking-wider flex items-center gap-1">
            <Handshake className="w-4 h-4" /> Partner Onboarding Activation
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            You are moving <strong>{partner.name}</strong> to the <strong>Joined</strong> status. Please set their Autobee Booking Commission Rate.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="relative">
            <input
              type="number" step="0.1" value={rate} onChange={e => setRate(e.target.value)}
              placeholder="10" autoFocus required
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/08 text-lg font-bold outline-none focus:border-[#FFC107]/50 text-foreground pr-8"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-lg">%</span>
          </div>

          <div className="flex gap-2">
            <button
              type="button" onClick={onCancel}
              className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-xl bee-gradient text-[#111] text-xs font-semibold"
            >
              Set & Onboard Partner
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Log Quick Contact Modal ──
function QuickContactModal({ partner, onSave, onClose }: {
  partner: Partner;
  onSave: (interaction: Omit<PartnerInteraction, 'id' | 'created_at'>) => Promise<void>;
  onClose: () => void;
}) {
  const [type, setType] = useState<PartnerInteraction['interaction_type']>("Call");
  const [outcome, setOutcome] = useState<PartnerInteraction['outcome']>("Positive");
  const [notes, setNotes] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [performedBy, setPerformedBy] = useState("Sourabh");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;
    setSaving(true);
    try {
      await onSave({
        partner_id: partner.id,
        interaction_type: type,
        outcome,
        notes: notes.trim(),
        next_action: nextAction || undefined,
        performed_by: performedBy,
        interaction_date: new Date().toISOString()
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#161616] p-5 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-white/05 pb-2">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            💬 Contact Log: {partner.name}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/5 text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Type</label>
              <select
                value={type} onChange={e => setType(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              >
                {FOLLOW_UP_METHODS.map(m => <option key={m} value={m} className="bg-[#161616]">{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Outcome</label>
              <select
                value={outcome} onChange={e => setOutcome(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              >
                {["Positive", "Neutral", "Negative", "No Response"].map(o => <option key={o} value={o} className="bg-[#161616]">{o}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-muted-foreground mb-1 block">Call Notes / Discussion Summary*</label>
              <input
                value={notes} onChange={e => setNotes(e.target.value)} required
                placeholder="Spoke with owner, interest confirmed..."
                className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground focus:border-[#FFC107]/40"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Next Action Plan</label>
              <input
                value={nextAction} onChange={e => setNextAction(e.target.value)}
                placeholder="e.g. Call back on Friday"
                className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Logged By</label>
              <select
                value={performedBy} onChange={e => setPerformedBy(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/08 text-xs outline-none text-foreground"
              >
                {PERFORMED_BY.map(p => <option key={p} value={p} className="bg-[#161616]">{p}</option>)}
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
              type="submit" disabled={saving || !notes.trim()}
              className="flex-1 py-2 rounded-xl bee-gradient text-[#111] text-xs font-semibold flex items-center justify-center"
            >
              {saving ? <div className="w-3.5 h-3.5 border border-[#111]/30 border-t-[#111] rounded-full animate-spin" /> : "Save Interaction Log"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Main Page Component ──
export default function PartnersCRMPage() {
  const { partners, loading, updatePartner, deletePartner, addPartner, addInteraction: storeAddInteraction } = usePartnerStore();
  const { documents, addDocument } = useDocumentStore();

  const [view, setView] = useState<"pipeline" | "table">("pipeline");

  // Filters State
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterArea, setFilterArea] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterInterest, setFilterInterest] = useState<string>("all");
  const [quickFilter, setQuickFilter] = useState<"all" | "interested" | "followup" | "joined">("all");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const filterParam = params.get("filter");
      if (filterParam === "interested" || filterParam === "followup" || filterParam === "joined") {
        setQuickFilter(filterParam);
      }
    }
  }, []);

  // Selection state
  const [detailPartner, setDetailPartner] = useState<Partner | null>(null);
  const [quickContactPartner, setQuickContactPartner] = useState<Partner | null>(null);
  const [creatingPartner, setCreatingPartner] = useState(false);
  const [commissionRatePrompt, setCommissionRatePrompt] = useState<{ id: string; name: string; currentCommission?: number; pendingStatus: Partner['pipeline_status'] } | null>(null);

  // Drag Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Auto-calculated filter metrics
  const totalCount = partners.length;
  const interestedCount = useMemo(() => partners.filter(p => p.pipeline_status === "Interested" || p.pipeline_status === "Negotiating").length, [partners]);
  const followUpCount = useMemo(() => partners.filter(p => p.follow_up_needed || p.pipeline_status === "Follow-Up").length, [partners]);
  const joinedCount = useMemo(() => partners.filter(p => p.pipeline_status === "Joined").length, [partners]);

  // Derived filter list values
  const uniqueAreas = useMemo(() => {
    const areas = partners.map(p => p.area).filter(Boolean);
    return Array.from(new Set(areas)).sort();
  }, [partners]);

  // Compute next survey ID automatically
  const nextSurveyId = useMemo(() => {
    let maxNum = 0;
    partners.forEach(p => {
      if (p.survey_id && p.survey_id.startsWith("AB-")) {
        const num = parseInt(p.survey_id.substring(3));
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const nextNum = maxNum + 1;
    return `AB-${nextNum.toString().padStart(3, '0')}`;
  }, [partners]);

  const filteredPartners = useMemo(() => {
    return partners.filter(p => {
      // 1. Search text
      if (search) {
        const text = search.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(text);
        const matchesArea = p.area.toLowerCase().includes(text);
        const matchesPhone = p.phone?.toLowerCase().includes(text);
        const matchesOwner = p.owner_name?.toLowerCase().includes(text);
        const matchesNotes = p.notes?.toLowerCase().includes(text);
        if (!matchesName && !matchesArea && !matchesPhone && !matchesOwner && !matchesNotes) return false;
      }
      // 2. Dropdown filters
      if (filterType !== "all" && p.partner_type !== filterType) return false;
      if (filterArea !== "all" && p.area !== filterArea) return false;
      if (filterStatus !== "all" && p.pipeline_status !== filterStatus) return false;
      if (filterInterest !== "all" && p.interest_level !== filterInterest) return false;

      // 3. Quick stats bar filters
      if (quickFilter === "interested" && p.pipeline_status !== "Interested" && p.pipeline_status !== "Negotiating") return false;
      if (quickFilter === "followup" && !p.follow_up_needed && p.pipeline_status !== "Follow-Up") return false;
      if (quickFilter === "joined" && p.pipeline_status !== "Joined") return false;

      return true;
    });
  }, [partners, search, filterType, filterArea, filterStatus, filterInterest, quickFilter]);

  const byStatus = (status: Partner['pipeline_status']) =>
    filteredPartners.filter(p => p.pipeline_status === status);

  // Status cycling on table double click
  const cycleStatus = async (partner: Partner) => {
    const currentIndex = COLUMNS.findIndex(c => c.id === partner.pipeline_status);
    const nextIndex = (currentIndex + 1) % COLUMNS.length;
    const nextStatus = COLUMNS[nextIndex].id;

    if (nextStatus === 'Joined') {
      setCommissionRatePrompt({
        id: partner.id,
        name: partner.name,
        currentCommission: partner.commission_rate,
        pendingStatus: 'Joined'
      });
    } else {
      await updatePartner(partner.id, { pipeline_status: nextStatus });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const draggedPartner = partners.find(p => p.id === active.id);
    if (!draggedPartner) return;

    const targetCol = COLUMNS.find(c => c.id === over.id);
    if (targetCol) {
      if (targetCol.id === 'Joined') {
        setCommissionRatePrompt({
          id: draggedPartner.id,
          name: draggedPartner.name,
          currentCommission: draggedPartner.commission_rate,
          pendingStatus: 'Joined'
        });
      } else {
        await updatePartner(draggedPartner.id, {
          pipeline_status: targetCol.id,
          follow_up_needed: targetCol.id === 'Follow-Up'
        });
      }
      return;
    }

    const overPartner = partners.find(p => p.id === over.id);
    if (overPartner && overPartner.pipeline_status !== draggedPartner.pipeline_status) {
      if (overPartner.pipeline_status === 'Joined') {
        setCommissionRatePrompt({
          id: draggedPartner.id,
          name: draggedPartner.name,
          currentCommission: draggedPartner.commission_rate,
          pendingStatus: 'Joined'
        });
      } else {
        await updatePartner(draggedPartner.id, {
          pipeline_status: overPartner.pipeline_status,
          follow_up_needed: overPartner.pipeline_status === 'Follow-Up'
        });
      }
    }
  };

  const handleConfirmCommission = async (rate: number) => {
    if (!commissionRatePrompt) return;
    await updatePartner(commissionRatePrompt.id, {
      pipeline_status: 'Joined',
      commission_rate: rate,
      onboarded_date: new Date().toISOString().split("T")[0]
    });
    setCommissionRatePrompt(null);
  };

  const handleUploadDoc = async (file: File, partnerId: string) => {
    await addDocument(file, {
      name: file.name,
      category: 'Partner Docs',
      related_partner_id: partnerId,
      uploaded_by: 'Sourabh'
    });
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 max-w-[1720px] w-full mx-auto space-y-5">
      {/* Header bar */}
      <PageHeader
        title="Partners CRM"
        subtitle="Startup Outreach, Leads classification and Onboarding logs"
        actions={
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setCreatingPartner(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bee-gradient text-[#111] text-xs font-bold shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            <span>Add Partner Lead</span>
          </motion.button>
        }
      />

      {/* Section 1 — Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Leads"
          value={totalCount}
          subtitle="All CRM entries"
          onClick={() => setQuickFilter(quickFilter === "all" ? "all" : "all")}
          highlight={quickFilter === "all"}
        />
        <StatCard
          label="Interested"
          value={interestedCount}
          subtitle="High & Medium intent"
          onClick={() => setQuickFilter(quickFilter === "interested" ? "all" : "interested")}
          highlight={quickFilter === "interested"}
        />
        <StatCard
          label="Follow-Up Due"
          value={followUpCount}
          subtitle={followUpCount > 0 ? "Action required" : "No pending follow-ups"}
          onClick={() => setQuickFilter(quickFilter === "followup" ? "all" : "followup")}
          highlight={quickFilter === "followup"}
        />
        <StatCard
          label="Onboarded"
          value={joinedCount}
          subtitle="Active network partners"
          onClick={() => setQuickFilter(quickFilter === "joined" ? "all" : "joined")}
          highlight={quickFilter === "joined"}
        />
      </div>

      {/* Section 2 — Filters bar (Sticky on Scroll) */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur px-4 py-3.5 border border-white/05 rounded-2xl flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search partners, phones..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs outline-none focus:border-[rgba(255,193,7,0.4)] focus:bg-white/[0.05] transition-all text-foreground"
          />
        </div>

        {/* Type Filter */}
        <select
          value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-2 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs outline-none text-foreground select-none cursor-pointer hover:bg-white/[0.05]"
        >
          <option value="all">All Types</option>
          {TYPES.map(t => <option key={t} value={t} className="bg-[#161616]">{t}</option>)}
        </select>

        {/* Area Filter */}
        <select
          value={filterArea} onChange={e => setFilterArea(e.target.value)}
          className="px-2 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs outline-none text-foreground select-none cursor-pointer hover:bg-white/[0.05]"
        >
          <option value="all">All Areas</option>
          {uniqueAreas.map(a => <option key={a} value={a} className="bg-[#161616]">{a}</option>)}
        </select>

        {/* Status Filter */}
        <select
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-2 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs outline-none text-foreground select-none cursor-pointer hover:bg-white/[0.05]"
        >
          <option value="all">All Statuses</option>
          {COLUMNS.map(c => <option key={c.id} value={c.id} className="bg-[#161616]">{c.label}</option>)}
        </select>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/10 ml-auto">
          {[
            { id: "pipeline", icon: LayoutGrid, label: "Pipeline" },
            { id: "table", icon: List, label: "Table" }
          ].map(opt => (
            <button
              key={opt.id} onClick={() => setView(opt.id as any)}
              className={cn(
                "p-1.5 rounded-lg transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer",
                view === opt.id ? "bg-[#FFC107] text-[#111] shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <opt.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Loading Partners data...</div>
      ) : filteredPartners.length === 0 ? (
        <EmptyState
          icon={<Handshake className="w-6 h-6" />}
          title="No partners found"
          description="No leads match your selected criteria. Try adjusting the search query or filters."
          actionText="Clear Filters"
          onAction={() => { setSearch(""); setFilterType("all"); setFilterArea("all"); setFilterStatus("all"); setQuickFilter("all"); }}
          className="mt-6"
        />
      ) : view === "pipeline" ? (
        /* Section 3 — Kanban Pipeline View */
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory flex-1 items-stretch pb-4">
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.id}
                column={col}
                partners={byStatus(col.id)}
                onEdit={setDetailPartner}
                onLogInteraction={setQuickContactPartner}
              />
            ))}
          </div>
        </DndContext>
      ) : (
        /* Section 4 — Table View */
        <div className="overflow-x-auto rounded-xl border border-white/05 bg-white/[0.01] relative max-w-full">
          <table className="w-full text-left border-collapse text-xs min-w-[900px]">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-muted-foreground uppercase font-bold tracking-wider text-[9px]">
                <th className="py-3 px-4 w-12 text-center">ID</th>
                <th className="py-3 px-4">Partner Name</th>
                <th className="py-3 px-4">Area</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Tier</th>
                <th className="py-3 px-4">Pipeline Status</th>
                <th className="py-3 px-4">Interest</th>
                <th className="py-3 px-4">Follow-Up</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Onboarded Cut</th>
              </tr>
            </thead>
            <tbody>
              {filteredPartners.map((item, index) => {
                const isOverdue = item.next_follow_up_date && isPast(new Date(item.next_follow_up_date));
                const statusColor = COLUMNS.find(c => c.id === item.pipeline_status)?.color || "#fff";
                const interestColor = item.interest_level === "High" ? "text-green-400" : item.interest_level === "Medium" ? "text-amber-400" : "text-gray-400";
                
                return (
                  <tr
                    key={item.id}
                    onClick={() => setDetailPartner(item)}
                    className="border-b border-white/05 hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 text-center font-semibold text-muted-foreground">{item.survey_id || index + 1}</td>
                    <td className="py-3 px-4 font-bold text-foreground/90">{item.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{item.area}</td>
                    <td className="py-3 px-4 text-muted-foreground">{item.partner_type}</td>
                    <td className="py-3 px-4 text-muted-foreground">{item.tier}</td>
                    <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => cycleStatus(item)}
                        className="px-2 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wider transition-opacity hover:opacity-90"
                        style={{ backgroundColor: statusColor + "15", color: statusColor, border: `1px solid ${statusColor}30` }}
                        title="Click to cycle status"
                      >
                        {item.pipeline_status}
                      </button>
                    </td>
                    <td className={cn("py-3 px-4 font-semibold", interestColor)}>{item.interest_level || "-"}</td>
                    <td className="py-3 px-4">
                      {item.follow_up_needed ? (
                        <span className={cn("font-bold text-[10px]", isOverdue ? "text-red-400" : "text-[#FFC107]")}>
                          {item.next_follow_up_date ? format(new Date(item.next_follow_up_date), "d MMM") : "Yes"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/30">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono">{item.phone || "-"}</td>
                    <td className="py-3 px-4 font-bold text-foreground/80">
                      {item.pipeline_status === "Joined" ? (
                        <span className="text-emerald-400">₹{(item.total_commission_earned ?? 0).toLocaleString("en-IN")} ({item.commission_rate ?? 0}%)</span>
                      ) : (
                        <span className="text-muted-foreground/30">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sheet Details slideover */}
      <AnimatePresence>
        {detailPartner && (
          <PartnerDetailSheet
            partner={detailPartner}
            onClose={() => setDetailPartner(null)}
            onSave={async (updates) => {
              const updated = await updatePartner(detailPartner.id, updates);
              setDetailPartner(updated);
            }}
            onDelete={async () => {
              await deletePartner(detailPartner.id);
            }}
            onAddInteractionLog={async (interaction) => {
              await storeAddInteraction(interaction);
            }}
            documents={documents}
            onUploadDoc={(file) => handleUploadDoc(file, detailPartner.id)}
          />
        )}
      </AnimatePresence>

      {/* Add Partner Lead Modal */}
      <AnimatePresence>
        {creatingPartner && (
          <AddPartnerModal
            onClose={() => setCreatingPartner(false)}
            onSave={async (partner) => {
              await addPartner(partner);
            }}
            nextSurveyId={nextSurveyId}
            existingAreas={uniqueAreas}
          />
        )}
      </AnimatePresence>

      {/* Prompt Commission Rate Onboard modal */}
      <AnimatePresence>
        {commissionRatePrompt && (
          <CommissionPromptModal
            partner={commissionRatePrompt}
            onConfirm={handleConfirmCommission}
            onCancel={() => setCommissionRatePrompt(null)}
          />
        )}
      </AnimatePresence>

      {/* Quick interaction log modal */}
      <AnimatePresence>
        {quickContactPartner && (
          <QuickContactModal
            partner={quickContactPartner}
            onSave={async (interaction) => {
              await storeAddInteraction(interaction);
              // Also update last contacted date automatically
              await updatePartner(quickContactPartner.id, {
                last_contacted_date: new Date().toISOString().split("T")[0]
              });
            }}
            onClose={() => setQuickContactPartner(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
