"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Clock, CheckCircle2, AlertCircle, Building2 } from "lucide-react";
import { useWorkdayStore } from "@/store/useWorkdayStore";
import { getISTDateInfo } from "@/lib/supabase/workday";
import type { FounderName } from "@/lib/types";

const FOUNDERS: { name: FounderName; color: string; bg: string }[] = [
  { name: "Sourabh", color: "#FFC107", bg: "bg-[#FFC107]/10" },
  { name: "Asher", color: "#3B82F6", bg: "bg-[#3B82F6]/10" },
  { name: "Subin", color: "#10B981", bg: "bg-[#10B981]/10" },
];

export function OfficePresenceCard() {
  const { todayWorkdays, initRealtime } = useWorkdayStore();
  const { isAfter3PM } = getISTDateInfo();

  useEffect(() => {
    const unsub = initRealtime();
    return () => unsub();
  }, [initRealtime]);

  return (
    <div className="rounded-2xl bg-[#141414] border border-white/10 p-5 space-y-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-white/5 text-[#FFC107]">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">Office Today</h3>
            <p className="text-[11px] text-muted-foreground">Real-time founder presence</p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#FFC107]/10 text-[#FFC107] border border-[#FFC107]/20">
          LIVE
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {FOUNDERS.map(({ name, color, bg }) => {
          const workday = todayWorkdays.find((w) => w.founderName === name);

          let statusBadge = (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-gray-500/50" />
              Not checked in
            </div>
          );

          if (workday?.status === "working") {
            const checkInTime = new Date(workday.checkInAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            });
            statusBadge = (
              <div className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                Working ({checkInTime})
              </div>
            );
          } else if (workday?.status === "completed") {
            const checkOutTime = workday.checkOutAt
              ? new Date(workday.checkOutAt).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "";
            statusBadge = (
              <div className="flex items-center gap-1.5 text-xs text-blue-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Ended day {checkOutTime}
              </div>
            );
          } else if (isAfter3PM && (!workday || workday.status === "leave")) {
            statusBadge = (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-gray-500" />
                Leave
              </div>
            );
          }

          return (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/05 hover:border-white/10 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center font-bold text-xs`}
                  style={{ color }}
                >
                  {name[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground/90">{name}</div>
                  {statusBadge}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
