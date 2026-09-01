"use client";
// src/components/layout/TopBar.tsx
import { motion } from "framer-motion";
import { Search, Plus, Menu, User, ChevronDown } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import type { FounderName } from "@/lib/types";

const FOUNDER_INFO: Record<FounderName, { role: string; color: string; initial: string }> = {
  Sourabh: { role: "CEO", color: "bg-[#FFC107] text-[#111]", initial: "S" },
  Asher: { role: "CTO", color: "bg-[#3B82F6] text-[#fff]", initial: "A" },
  Subin: { role: "COO", color: "bg-[#10B981] text-[#fff]", initial: "Su" },
};

export function TopBar() {
  const { setCommandOpen, setQuickAddOpen, setSidebarOpen, sidebarOpen, currentUser, setCurrentUser } = useUIStore();
  const currentFounder = FOUNDER_INFO[currentUser] || FOUNDER_INFO.Sourabh;

  return (
    <header
      className="fixed top-0 right-0 left-0 md:left-auto h-14 z-30 flex items-center px-4 gap-3"
      style={{
        background: "rgba(13,13,13,0.92)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Mobile: Autobee logo + menu */}
      <div className="md:hidden flex items-center gap-2 flex-1">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-xl hover:bg-white/5 text-muted-foreground transition-colors cursor-pointer"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center overflow-hidden bg-white/5 border border-white/10">
            <img src="/logo.png" alt="Autobee Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-sm tracking-tight text-foreground">AutoBee</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 ml-auto">
        {/* Founder Selector with Avatar */}
        <div className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/15 transition-all">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${currentFounder.color} shrink-0`}>
            {currentFounder.initial}
          </div>
          <select
            value={currentUser}
            onChange={(e) => setCurrentUser(e.target.value as FounderName)}
            className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer pr-1"
          >
            <option value="Sourabh" className="bg-[#161616] text-[#f5f5f5]">Sourabh (CEO)</option>
            <option value="Asher" className="bg-[#161616] text-[#f5f5f5]">Asher (CTO)</option>
            <option value="Subin" className="bg-[#161616] text-[#f5f5f5]">Subin (COO)</option>
          </select>
        </div>

        {/* Notifications */}
        <NotificationCenter />

        {/* Search / Command */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setCommandOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 border border-white/[0.08] transition-all cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline text-[9px] px-1.5 py-0.5 rounded bg-white/10 font-mono text-muted-foreground">⌘K</kbd>
        </motion.button>

        {/* Quick add */}
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => setQuickAddOpen(true, "task")}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#111] bee-gradient shadow-sm hover:scale-[1.02] transition-transform cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          <span className="hidden sm:inline">Add</span>
        </motion.button>
      </div>
    </header>
  );
}

