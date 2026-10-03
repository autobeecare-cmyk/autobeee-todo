"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Sparkles, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import type { FounderName } from "@/lib/types";

interface WelcomeBannerProps {
  currentUser: FounderName;
  contextualLine: string;
  onAddTask: () => void;
}

export function WelcomeBanner({ currentUser, contextualLine, onAddTask }: WelcomeBannerProps) {
  const now = new Date();
  const hours = now.getHours();

  const greeting = useMemo(() => {
    if (hours < 12) return { prefix: "Good morning", emoji: "☀️" };
    if (hours < 17) return { prefix: "Good afternoon", emoji: "👋" };
    return { prefix: "Good evening", emoji: "🌙" };
  }, [hours]);

  const dateStr = format(now, "EEEE, d MMMM");

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 sm:p-6 border border-white/[0.08] shadow-xl"
      style={{
        background: "linear-gradient(135deg, rgba(22,22,22,0.92) 0%, rgba(14,14,14,0.96) 100%)",
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Subtle gold ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFC107]/[0.04] rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#FFC107] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#FFC107]" />
              Executive Dashboard
            </span>
            <span className="text-white/20 text-xs">·</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" />
              {dateStr}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            {greeting.prefix}, {currentUser} {greeting.emoji}
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground font-medium">
            {contextualLine}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2.5">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onAddTask}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#111] bee-gradient shadow-md hover:scale-[1.02] transition-transform cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
