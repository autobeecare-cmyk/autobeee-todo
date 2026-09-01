"use client";
// src/components/layout/Sidebar.tsx
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CheckSquare, Target, Lightbulb,
  DollarSign, Bot, BarChart3, Settings, ChevronLeft,
  ChevronRight, Calendar, Handshake, FolderLock, TrendingUp, Clock
} from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/",          label: "Dashboard",    icon: LayoutDashboard },
  { href: "/attendance", label: "Attendance",   icon: Clock },
  { href: "/tasks",     label: "Tasks",         icon: CheckSquare },
  { href: "/goals",     label: "Goals",         icon: Target },
  { href: "/roadmap",   label: "Roadmap",       icon: TrendingUp },
  { href: "/ideas",     label: "Ideas Vault",   icon: Lightbulb },
  { href: "/meetings",  label: "Meetings",      icon: Calendar },
  { href: "/partners",  label: "Partners",      icon: Handshake },
  { href: "/money",     label: "Money",         icon: DollarSign },
  { href: "/ai",        label: "AI Assistant",  icon: Bot },
  { href: "/insights",  label: "Insights",      icon: BarChart3 },
  { href: "/vault",     label: "Vault",         icon: FolderLock },
  { href: "/settings",  label: "Settings",      icon: Settings },
];

export function Sidebar() {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();
  const pathname = usePathname();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setSidebarOpen]);

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ width: sidebarOpen ? 220 : 64 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={cn(
          "flex flex-col fixed left-0 top-0 h-full z-50 overflow-hidden",
          "max-md:transition-transform max-md:duration-300",
          !sidebarOpen && "max-md:-translate-x-full"
        )}
        style={{ background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)" }}
      >
        {/* Logo area */}
        <div className="flex items-center h-14 px-3 gap-3 flex-shrink-0 mt-2 md:mt-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-white/5 border border-white/10">
            <img src="/logo.png" alt="Autobee Logo" className="w-full h-full object-contain" />
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="font-bold text-base tracking-tight text-foreground whitespace-nowrap"
              >
                Autobee
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto no-scrollbar">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} onClick={() => { if(window.innerWidth < 768) setSidebarOpen(false) }} className="relative block">
                <motion.div
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.96 }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 relative",
                    active
                      ? "text-[#FFC107] font-semibold"
                      : "text-[var(--sidebar-foreground)] hover:bg-white/5 opacity-70 hover:opacity-100"
                  )}
                  style={active ? {
                    boxShadow: "inset 3px 0 0 #FFC107, 0 0 20px rgba(255,193,7,0.08)",
                    background: "rgba(255, 193, 7, 0.08)"
                  } : {}}
                >
                  {active && (
                    <motion.div
                      layoutId="sidebar-active-pill"
                      className="absolute inset-0 bg-white/5 rounded-lg -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={active ? 2.5 : 2} />
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                        className="text-sm font-medium whitespace-nowrap"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle (Desktop only) */}
        <div className="hidden md:block p-2 border-t border-[var(--sidebar-border)]">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors text-muted-foreground hover:text-foreground"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
