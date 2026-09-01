"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AutoBeeCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  highlight?: boolean;
  onClick?: () => void;
}

export function AutoBeeCard({
  children,
  className,
  hover = true,
  highlight = false,
  onClick,
}: AutoBeeCardProps) {
  const CardEl = onClick ? "button" : "div";

  return (
    <CardEl
      onClick={onClick}
      className={cn(
        "rounded-2xl p-4 sm:p-5 border transition-all duration-200 text-left relative",
        highlight
          ? "stat-card-amber shadow-[0_4px_24px_rgba(255,193,7,0.08)]"
          : "bg-[#141414]/90 border-white/[0.08] backdrop-blur-md shadow-sm",
        hover && "hover:border-white/15 hover:bg-[#181818]/90",
        onClick && "cursor-pointer active:scale-[0.99]",
        className
      )}
    >
      {children}
    </CardEl>
  );
}
