"use client";
// src/components/layout/BottomNav.tsx
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, CheckSquare, DollarSign, Bot, BarChart3, Calendar,
  Handshake, FolderLock, Lightbulb, Settings, Menu, X
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRIMARY_ITEMS = [
  { href: "/",         label: "Home",     icon: LayoutDashboard },
  { href: "/tasks",    label: "Tasks",    icon: CheckSquare },
  { href: "/partners", label: "Partners", icon: Handshake },
  { href: "/money",    label: "Money",    icon: DollarSign },
];

const OVERFLOW_ITEMS = [
  { href: "/meetings", label: "Meetings",      icon: Calendar },
  { href: "/vault",     label: "Vault",         icon: FolderLock },
  { href: "/ideas",     label: "Ideas Vault",   icon: Lightbulb },
  { href: "/ai",        label: "AI Assistant",  icon: Bot },
  { href: "/insights",  label: "Insights",      icon: BarChart3 },
  { href: "/settings",  label: "Settings",      icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2"
        style={{
          background: "rgba(13,13,13,0.92)",
          backdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          minHeight: "64px",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)",
        }}
      >
        {PRIMARY_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href && !menuOpen;
          return (
            <Link key={href} href={href} className="flex-1" onClick={() => setMenuOpen(false)}>
              <motion.div
                whileTap={{ scale: 0.88 }}
                className="flex flex-col items-center justify-center gap-0.5 py-2"
              >
                <div className="relative">
                  {active && (
                    <motion.div
                      layoutId="bottom-active"
                      className="absolute -bottom-1.5 left-1/4 right-1/4 h-0.5 rounded-full bg-[#FFC107]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={cn(
                      "w-5 h-5 relative",
                      active ? "text-[#FFC107]" : "text-muted-foreground"
                    )}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    active ? "text-[#FFC107]" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </motion.div>
            </Link>
          );
        })}

        {/* More Button */}
        <button className="flex-1 cursor-pointer" onClick={() => setMenuOpen(!menuOpen)}>
          <motion.div
            whileTap={{ scale: 0.88 }}
            className="flex flex-col items-center justify-center gap-0.5 py-2"
          >
            <div className="relative">
              {menuOpen && (
                <motion.div
                  layoutId="bottom-active"
                  className="absolute -bottom-1.5 left-1/4 right-1/4 h-0.5 rounded-full bg-[#FFC107]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {menuOpen ? (
                <X className="w-5 h-5 text-[#FFC107]" strokeWidth={2.5} />
              ) : (
                <Menu
                  className={cn(
                    "w-5 h-5 relative",
                    OVERFLOW_ITEMS.some(item => pathname === item.href) ? "text-[#FFC107]/80" : "text-muted-foreground"
                  )}
                  strokeWidth={2}
                />
              )}
            </div>
            <span
              className={cn(
                "text-[10px] font-medium",
                menuOpen || OVERFLOW_ITEMS.some(item => pathname === item.href) ? "text-[#FFC107]" : "text-muted-foreground"
              )}
            >
              More
            </span>
          </motion.div>
        </button>
      </nav>

      {/* Overflow Drawer */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-xs"
            />
            {/* Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="md:hidden fixed bottom-[64px] left-0 right-0 z-40 p-5 rounded-t-2xl border-t border-white/10 flex flex-col gap-4 shadow-2xl overflow-hidden"
              style={{
                background: "rgba(18,18,18,0.96)",
                backdropFilter: "blur(20px)",
                paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)",
              }}
            >
              <div className="flex items-center justify-between border-b border-white/05 pb-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">More Applications</span>
                <button onClick={() => setMenuOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                {OVERFLOW_ITEMS.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link key={href} href={href} onClick={() => setMenuOpen(false)}>
                      <motion.div
                        whileTap={{ scale: 0.92 }}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center",
                          active
                            ? "bg-[#FFC107]/10 border-[#FFC107]/30 text-[#FFC107]"
                            : "bg-white/[0.02] border-white/05 hover:bg-white/[0.04] text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className="w-5 h-5 mb-1.5" strokeWidth={active ? 2.5 : 2} />
                        <span className="text-[10px] font-semibold tracking-tight truncate w-full">{label}</span>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
