"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, CheckCircle2, Coffee } from "lucide-react";
import { useWorkdayStore } from "@/store/useWorkdayStore";
import { getISTDateInfo } from "@/lib/supabase/workday";
import type { FounderName } from "@/lib/types";
import { cn } from "@/lib/utils";

const FOUNDERS: { name: FounderName; role: string; color: string; border: string; bg: string }[] = [
  {
    name: "Sourabh",
    role: "CEO",
    color: "text-[#FFC107]",
    border: "border-[#FFC107]/25",
    bg: "bg-[#FFC107]/10",
  },
  {
    name: "Asher",
    role: "CTO",
    color: "text-[#3B82F6]",
    border: "border-[#3B82F6]/25",
    bg: "bg-[#3B82F6]/10",
  },
  {
    name: "Subin",
    role: "COO",
    color: "text-[#10B981]",
    border: "border-[#10B981]/25",
    bg: "bg-[#10B981]/10",
  },
];

export function OfficePresenceCard() {
  const { todayWorkdays, initRealtime } = useWorkdayStore();
  const { dateStr } = getISTDateInfo();

  const [breaks, setBreaks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsub = initRealtime();
    return () => unsub();
  }, [initRealtime]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const breakMap: Record<string, boolean> = {};
    FOUNDERS.forEach((f) => {
      try {
        const saved = localStorage.getItem(`autobee_break_${f.name}_${dateStr}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.isOnBreak) breakMap[f.name] = true;
        }
      } catch {}
    });
    setBreaks(breakMap);
  }, [dateStr]);

  return (
    <div className="glass-card-premium p-3.5 sm:p-4 rounded-2xl space-y-2.5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[#FFC107]">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">
            TODAY AT THE OFFICE
          </h3>
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[9px] font-bold text-emerald-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          <span>LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {FOUNDERS.map(({ name, role, color, border, bg }) => {
          const workday = todayWorkdays.find((w) => w.founderName === name);
          const isOnBreak = breaks[name];

          let statusBadge = (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
              <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <span>Not yet</span>
            </div>
          );

          if (workday?.status === "working") {
            const checkInTime = new Date(workday.checkInAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            });

            if (isOnBreak) {
              statusBadge = (
                <div className="flex items-center gap-1 text-[11px] text-amber-300 font-medium">
                  <Coffee className="w-3 h-3 text-amber-400" />
                  <span>On Break</span>
                </div>
              );
            } else {
              statusBadge = (
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Working {checkInTime}</span>
                </div>
              );
            }
          } else if (workday?.status === "completed") {
            const checkOutTime = workday.checkOutAt
              ? new Date(workday.checkOutAt).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "";
            statusBadge = (
              <div className="flex items-center gap-1 text-[11px] text-blue-400 font-medium">
                <CheckCircle2 className="w-3 h-3 text-blue-400" />
                <span>Finished {checkOutTime}</span>
              </div>
            );
          } else if (workday?.status === "leave") {
            statusBadge = (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                <span>Leave</span>
              </div>
            );
          }

          return (
            <div
              key={name}
              className={cn(
                "flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border transition-all",
                workday?.status === "working"
                  ? isOnBreak
                    ? "border-amber-500/25 bg-amber-500/[0.03]"
                    : "border-emerald-500/25 bg-emerald-500/[0.03]"
                  : workday?.status === "completed"
                  ? "border-blue-500/20 bg-blue-500/[0.02]"
                  : "border-white/[0.05]"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg ${bg} border ${border} flex items-center justify-center font-bold text-xs ${color} shrink-0`}
                >
                  {name[0]}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-foreground leading-tight truncate">
                      {name}
                    </span>
                    <span className="text-[8px] font-bold text-muted-foreground bg-white/5 px-1 py-0.2 rounded border border-white/05 uppercase">
                      {role}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate">{statusBadge}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
