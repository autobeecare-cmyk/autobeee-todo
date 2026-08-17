"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, Clock, CheckCircle2 } from "lucide-react";
import { useWorkdayStore } from "@/store/useWorkdayStore";
import type { FounderName } from "@/lib/types";

const FOUNDERS: { name: FounderName; role: string; color: string; border: string; bg: string }[] = [
  {
    name: "Sourabh",
    role: "CEO",
    color: "text-[#FFC107]",
    border: "border-[#FFC107]/20",
    bg: "bg-[#FFC107]/10",
  },
  {
    name: "Asher",
    role: "CTO",
    color: "text-[#3B82F6]",
    border: "border-[#3B82F6]/20",
    bg: "bg-[#3B82F6]/10",
  },
  {
    name: "Subin",
    role: "COO",
    color: "text-[#10B981]",
    border: "border-[#10B981]/20",
    bg: "bg-[#10B981]/10",
  },
];

export function OfficePresenceCard() {
  const { todayWorkdays, initRealtime } = useWorkdayStore();

  useEffect(() => {
    const unsub = initRealtime();
    return () => unsub();
  }, [initRealtime]);

  return (
    <div className="rounded-2xl bg-[#141414]/90 border border-white/[0.08] p-4 sm:p-5 space-y-3 shadow-md backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[#FFC107]">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">
              TODAY AT THE OFFICE
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          LIVE
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {FOUNDERS.map(({ name, role, color, border, bg }) => {
          const workday = todayWorkdays.find((w) => w.founderName === name);

          let statusContent = (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <span>Not yet</span>
            </div>
          );

          if (workday?.status === "working") {
            const checkInTime = new Date(workday.checkInAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            });
            statusContent = (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                <span>Working · {checkInTime}</span>
              </div>
            );
          } else if (workday?.status === "completed") {
            const checkOutTime = workday.checkOutAt
              ? new Date(workday.checkOutAt).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "";
            statusContent = (
              <div className="flex items-center gap-1.5 text-[11px] text-blue-400 font-medium">
                <CheckCircle2 className="w-3 h-3 text-blue-400" />
                <span>Ended day · {checkOutTime}</span>
              </div>
            );
          } else if (workday?.status === "leave") {
            statusContent = (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                <span>Marked Leave</span>
              </div>
            );
          }

          return (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={`flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border ${
                workday?.status === "working" ? "border-emerald-500/25 bg-emerald-500/[0.03]" : "border-white/[0.06]"
              } transition-all`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl ${bg} border ${border} flex items-center justify-center font-bold text-xs ${color} shrink-0`}
                >
                  {name[0]}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-bold text-foreground/90 leading-tight truncate">
                      {name}
                    </span>
                    <span className="text-[9px] font-semibold text-muted-foreground bg-white/5 px-1.5 py-0.2 rounded border border-white/05 uppercase">
                      {role}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate">{statusContent}</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
