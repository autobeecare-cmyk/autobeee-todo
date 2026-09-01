"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: string | number;
    positive?: boolean;
  };
  highlight?: boolean;
  className?: string;
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  subtitle,
  icon,
  trend,
  highlight,
  className,
  onClick,
}: StatCardProps) {
  const CardWrapper = onClick ? "button" : "div";

  return (
    <CardWrapper
      onClick={onClick}
      className={cn(
        "rounded-2xl p-4 sm:p-5 border transition-all duration-200 text-left relative overflow-hidden",
        highlight
          ? "stat-card-amber shadow-[0_4px_20px_rgba(255,193,7,0.06)]"
          : "bg-white/[0.02] border-white/[0.06] hover:border-white/10 hover:bg-white/[0.03]",
        onClick && "cursor-pointer active:scale-[0.99]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
          {label}
        </span>
        {icon && (
          <div className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-muted-foreground shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              "text-[10px] font-semibold",
              trend.positive ? "text-emerald-400" : "text-red-400"
            )}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-[11px] text-muted-foreground mt-1 truncate">
          {subtitle}
        </p>
      )}
    </CardWrapper>
  );
}
