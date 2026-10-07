"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Bot, ArrowRight, RotateCcw, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Task, Goal, Meeting, Expense, Partner, FounderName } from "@/lib/types";

interface AiBriefingCardProps {
  currentUser: FounderName;
  tasks: Task[];
  goals: Goal[];
  meetings: Meeting[];
  expenses: Expense[];
  partners: Partner[];
  onAddTask: () => void;
}

const AI_ACTION_CHIPS = [
  { label: "What should I focus on?", prompt: "What should I focus on today?" },
  { label: "Review partner pipeline", prompt: "Review our partner CRM pipeline and highlight overdue follow-ups." },
  { label: "Summarize my goals", prompt: "Summarize our active company goals and key progress bottlenecks." },
  { label: "Prepare next meeting", prompt: "What upcoming meetings do we have and how should we prepare?" },
];

export function AiBriefingCard({
  currentUser,
  tasks,
  goals,
  meetings,
  expenses,
  partners,
  onAddTask,
}: AiBriefingCardProps) {
  const router = useRouter();
  const [brief, setBrief] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [model, setModel] = useState<string>("gemini-2.5-flash");
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const now = new Date();
  const hours = now.getHours();

  const greeting = useMemo(() => {
    if (hours < 12) return { prefix: "Good morning", emoji: "☀️" };
    if (hours < 17) return { prefix: "Good afternoon", emoji: "👋" };
    return { prefix: "Good evening", emoji: "🌙" };
  }, [hours]);

  const dateStr = format(now, "EEEE, d MMMM");

  // Rule-based fallback summary if AI is unavailable or offline
  const fallbackBrief = useMemo(() => {
    const openTasksCount = tasks.filter((t) => t.status !== "done").length;
    const followUpPartners = partners.filter((p) => p.pipeline_status === "Follow-Up").length;
    const activeGoalsCount = goals.filter((g) => g.status === "active").length;
    const upcomingMeetingsCount = meetings.filter((m) => m.status === "upcoming").length;

    let message = `All systems operational. You have ${activeGoalsCount} active goals across the company.`;
    if (followUpPartners > 0) {
      message += ` There are ${followUpPartners} partner CRM leads needing follow-up outreach.`;
    }
    if (upcomingMeetingsCount > 0) {
      message += ` You have ${upcomingMeetingsCount} scheduled meetings.`;
    }
    if (openTasksCount === 0) {
      message += ` Personal priority task queue is clear — ideal window for strategic expansion.`;
    } else {
      message += ` ${openTasksCount} tasks in queue.`;
    }
    return message;
  }, [tasks, partners, goals, meetings]);

  const fetchBrief = useCallback(async (force = false) => {
    const todayKey = `autobee_brief_${currentUser}_${format(new Date(), "yyyyMMdd")}`;

    if (!force) {
      try {
        const cached = sessionStorage.getItem(todayKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.brief) {
            setBrief(parsed.brief);
            setModel(parsed.model || "gemini-2.5-flash");
            setLoading(false);
            return;
          }
        }
      } catch {}
    }

    setLoading(true);
    try {
      const response = await fetch("/api/ai/dashboard-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentUser,
          tasks: tasks.slice(0, 15),
          goals: goals.slice(0, 5),
          meetings: meetings.slice(0, 5),
          expenses: expenses.slice(0, 5),
          partners: partners.slice(0, 10),
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch AI brief");

      const data = await response.json();
      const generatedText = data.brief || fallbackBrief;
      setBrief(generatedText);
      if (data.model) setModel(data.model);
      setLastRefreshed(new Date());

      try {
        sessionStorage.setItem(
          todayKey,
          JSON.stringify({ brief: generatedText, model: data.model })
        );
      } catch {}
    } catch (err) {
      console.warn("AI Dashboard Brief fallback active:", err);
      setBrief(fallbackBrief);
    } finally {
      setLoading(false);
    }
  }, [currentUser, tasks, goals, meetings, expenses, partners, fallbackBrief]);

  useEffect(() => {
    fetchBrief();
  }, [fetchBrief]);

  const handleChipClick = (prompt: string) => {
    router.push(`/ai?q=${encodeURIComponent(prompt)}`);
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 sm:p-6 border border-white/[0.08] shadow-xl glass-card-premium"
      style={{
        background: "linear-gradient(135deg, rgba(22,22,22,0.94) 0%, rgba(14,14,14,0.98) 100%)",
      }}
    >
      {/* Subtle gold ambient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#FFC107]/[0.05] rounded-full blur-3xl pointer-events-none -mr-28 -mt-28" />

      {/* Top row: Greeting + Action */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-[#FFC107] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFC107] animate-pulse" />
              AutoBee Intelligence
            </span>
            <span className="text-white/20 text-xs">·</span>
            <span className="text-[11px] text-muted-foreground">{dateStr}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            {greeting.prefix}, {currentUser} {greeting.emoji}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchBrief(true)}
            disabled={loading}
            title="Refresh AI briefing"
            className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-muted-foreground hover:text-[#FFC107] transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#FFC107]" : ""}`} />
          </button>

          <Link
            href="/ai"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#FFC107]/40 text-foreground/90 hover:text-[#FFC107] transition-all cursor-pointer shadow-sm"
          >
            <Bot className="w-3.5 h-3.5 text-[#FFC107]" />
            <span>Open Copilot</span>
          </Link>
        </div>
      </div>

      {/* Middle row: Live Briefing text */}
      <div className="relative pt-3.5 pb-2">
        {loading ? (
          <div className="space-y-2 py-1">
            <div className="flex items-center gap-2 text-xs text-[#FFC107]">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span className="text-muted-foreground font-medium">
                AutoBee Intelligence synthesizing live operations...
              </span>
            </div>
            <div className="h-4 bg-white/[0.04] rounded-md animate-pulse w-11/12" />
            <div className="h-4 bg-white/[0.04] rounded-md animate-pulse w-3/4" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-1.5"
          >
            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal">
              {brief}
            </p>
          </motion.div>
        )}
      </div>

      {/* Bottom row: Quick Action Chips */}
      <div className="relative pt-3 flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-1 shrink-0">
          QUICK QUERIES:
        </span>
        {AI_ACTION_CHIPS.map((chip) => (
          <button
            key={chip.label}
            onClick={() => handleChipClick(chip.prompt)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-[#FFC107]/10 border border-white/[0.07] hover:border-[#FFC107]/30 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer group"
          >
            <span>{chip.label}</span>
            <ArrowRight className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#FFC107]" />
          </button>
        ))}
      </div>
    </div>
  );
}
