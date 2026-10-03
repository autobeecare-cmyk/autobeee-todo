"use client";
// src/components/layout/CommandPalette.tsx
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CheckSquare, Target, Lightbulb, DollarSign, X } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useGoalStore } from "@/store/useGoalStore";
import { useIdeaStore } from "@/store/useIdeaStore";
import { useRouter } from "next/navigation";

export function CommandPalette() {
  const { commandOpen, setCommandOpen } = useUIStore();
  const { tasks } = useTaskStore();
  const { goals } = useGoalStore();
  const { ideas } = useIdeaStore();
  const [query, setQuery] = useState("");
  const router = useRouter();

  const close = useCallback(() => {
    setCommandOpen(false);
    setQuery("");
  }, [setCommandOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [commandOpen, setCommandOpen, close]);

  const q = query.toLowerCase();
  const results = [
    ...tasks.filter(t => t.title.toLowerCase().includes(q) && q).slice(0, 3).map(t => ({
      type: "task", label: t.title, sub: t.status, icon: CheckSquare, action: () => router.push("/tasks")
    })),
    ...goals.filter(g => g.title.toLowerCase().includes(q) && q).slice(0, 2).map(g => ({
      type: "goal", label: g.title, sub: `${g.progress}%`, icon: Target, action: () => router.push("/goals")
    })),
    ...ideas.filter(i => i.title.toLowerCase().includes(q) && q).slice(0, 2).map(i => ({
      type: "idea", label: i.title, sub: i.category, icon: Lightbulb, action: () => router.push("/ideas")
    })),
  ];

  const shortcuts = [
    { label: "Go to Dashboard", action: () => router.push("/"), icon: CheckSquare },
    { label: "Go to Tasks", action: () => router.push("/tasks"), icon: CheckSquare },
    { label: "Go to Money Tracker", action: () => router.push("/money"), icon: DollarSign },
    { label: "Go to AI Assistant", action: () => router.push("/ai"), icon: Target },
  ];

  const items = q ? results : shortcuts;

  return (
    <AnimatePresence>
      {commandOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={close}
          />
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="w-full max-w-lg pointer-events-auto rounded-2xl overflow-hidden"
              style={{
                background: "rgba(22,22,22,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,193,7,0.08)",
              }}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search tasks, goals, ideas..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                <button onClick={close} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Results */}
              <div className="p-2 max-h-72 overflow-y-auto">
                {items.length === 0 && q && (
                  <p className="text-center text-sm text-muted-foreground py-6">No results for "{query}"</p>
                )}
                {items.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => { item.action(); close(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-left transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-[rgba(255,193,7,0.1)] transition-colors">
                      <item.icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-[#FFC107]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{item.label}</p>
                      {"sub" in item && <p className="text-xs text-muted-foreground capitalize">{(item as any).sub}</p>}
                    </div>
                  </button>
                ))}
              </div>

              <div className="px-4 py-2 border-t border-white/5 flex items-center gap-4">
                <span className="text-[10px] text-muted-foreground">↑↓ Navigate</span>
                <span className="text-[10px] text-muted-foreground">↵ Select</span>
                <span className="text-[10px] text-muted-foreground">Esc Close</span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
