"use client";
// src/components/layout/BottomNav.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard, CheckSquare, DollarSign, Bot, BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/",         label: "Home",     icon: LayoutDashboard },
  { href: "/tasks",    label: "Tasks",    icon: CheckSquare },
  { href: "/money",    label: "Money",    icon: DollarSign },
  { href: "/ai",       label: "AI",       icon: Bot },
  { href: "/insights", label: "Insights", icon: BarChart3 },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 pb-safe"
      style={{
        background: "rgba(13,13,13,0.92)",
        backdropFilter: "blur(16px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        height: "64px",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href} className="flex-1">
            <motion.div
              whileTap={{ scale: 0.88 }}
              className="flex flex-col items-center justify-center gap-0.5 py-2"
            >
              <div className="relative">
                {active && (
                  <motion.div
                    layoutId="bottom-active"
                    className="absolute inset-0 -m-1.5 rounded-lg bg-[rgba(255,193,7,0.15)]"
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
    </nav>
  );
}
