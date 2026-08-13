"use client";
// src/components/layout/TopBar.tsx
import { motion } from "framer-motion";
import { Search, Plus, Menu, User } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import type { FounderName } from "@/lib/types";

export function TopBar() {
  const { setCommandOpen, setQuickAddOpen, setSidebarOpen, sidebarOpen, currentUser, setCurrentUser } = useUIStore();

  return (
    <header
      className="fixed top-0 right-0 left-0 md:left-auto h-14 z-30 flex items-center px-4 gap-3"
      style={{
        background: "rgba(13,13,13,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Mobile: Autobee logo + menu */}
      <div className="md:hidden flex items-center gap-2 flex-1">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center overflow-hidden bg-white/5 border border-white/10">
            <img src="/logo.png" alt="Autobee Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-sm tracking-tight">Autobee</span>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Founder Selector */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white/5 border border-white/08">
          <User className="w-3.5 h-3.5 text-[#FFC107]" />
          <select
            value={currentUser}
            onChange={(e) => setCurrentUser(e.target.value as FounderName)}
            className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer"
          >
            <option value="Sourabh" className="bg-[#161616] text-[#f5f5f5]">Sourabh</option>
            <option value="Asher" className="bg-[#161616] text-[#f5f5f5]">Asher</option>
            <option value="Subin" className="bg-[#161616] text-[#f5f5f5]">Subin</option>
          </select>
        </div>

        {/* Notifications */}
        <NotificationCenter />

        {/* Search / Command */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setCommandOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">Search</span>
          <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-white/10 font-mono">⌘K</kbd>
        </motion.button>

        {/* Quick add */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setQuickAddOpen(true, "task")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[#111] bee-gradient"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          <span className="hidden sm:inline">Add</span>
        </motion.button>
      </div>
    </header>
  );
}
