"use client";

import Link from "next/link";
import { Handshake, ChevronRight, PhoneCall, Building2 } from "lucide-react";
import type { Partner } from "@/lib/types";

interface PartnerPipelinePulseProps {
  partners: Partner[];
}

export function PartnerPipelinePulse({ partners }: PartnerPipelinePulseProps) {
  const followUpPartners = partners.filter((p) => p.pipeline_status === "Follow-Up");
  const inNegotiation = partners.filter((p) => p.pipeline_status === "Negotiating" || p.pipeline_status === "Interested");

  return (
    <div className="glass-card-premium p-4 sm:p-5 rounded-2xl space-y-3.5 border border-white/[0.08] shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Handshake className="w-4 h-4 text-[#FFC107]" />
          <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">
            PARTNER PIPELINE
          </h3>
        </div>
        <Link
          href="/partners"
          className="text-xs text-[#FFC107] font-semibold hover:underline flex items-center gap-0.5"
        >
          CRM ({partners.length}) <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Metric summary pills */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-0.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">
            Follow-Ups Due
          </span>
          <div className="text-lg font-black text-[#FFC107] tabular-nums">
            {followUpPartners.length}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-0.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">
            In Discussion
          </span>
          <div className="text-lg font-black text-purple-400 tabular-nums">
            {inNegotiation.length}
          </div>
        </div>
      </div>

      {/* Top follow-ups list */}
      <div className="space-y-2">
        {followUpPartners.slice(0, 3).map((partner) => (
          <Link
            key={partner.id}
            href="/partners"
            className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] transition-all group"
          >
            <div className="min-w-0 pr-2">
              <p className="text-xs font-semibold text-foreground/90 truncate group-hover:text-[#FFC107] transition-colors">
                {partner.name}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                {partner.partner_type || "Partner"}
                {partner.area ? ` · ${partner.area}` : ""}
              </p>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#FFC107]/10 text-[#FFC107] shrink-0 border border-[#FFC107]/20">
              Follow-Up
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
