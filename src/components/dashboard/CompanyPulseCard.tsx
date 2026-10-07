"use client";

import Link from "next/link";
import { Activity as ActivityIcon, CheckCircle2, Plus, ChevronRight, Clock } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import type { Activity } from "@/lib/types";

interface CompanyPulseCardProps {
  activities: Activity[];
}

export function CompanyPulseCard({ activities }: CompanyPulseCardProps) {
  const recent = activities.slice(0, 4);

  return (
    <div className="glass-card-premium p-4 sm:p-5 rounded-2xl space-y-3.5 border border-white/[0.08] shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ActivityIcon className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">
            COMPANY PULSE
          </h3>
        </div>
        <Link
          href="/insights"
          className="text-xs text-emerald-400 font-semibold hover:underline flex items-center gap-0.5"
        >
          Live Feed <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="py-5 text-center text-xs text-muted-foreground border border-dashed border-white/[0.07] rounded-xl bg-white/[0.01]">
          No recent activity logged.
        </div>
      ) : (
        <div className="space-y-2.5">
          {recent.map((item) => {
            let relativeTime = "";
            try {
              relativeTime = formatDistanceToNow(parseISO(item.timestamp), { addSuffix: true });
            } catch {
              relativeTime = "recent";
            }

            return (
              <div
                key={item.id}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mt-0.5 shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-foreground/90 leading-snug line-clamp-2">
                    {item.description}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {relativeTime}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
