"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  icon,
  badge,
  actionText,
  actionHref,
  onAction,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <div className="flex items-center gap-2 min-w-0">
        {icon && <div className="text-[#FFC107] shrink-0">{icon}</div>}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-xs sm:text-sm text-muted-foreground uppercase tracking-wider truncate">
              {title}
            </h3>
            {badge}
          </div>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground/70 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {(actionText && actionHref) ? (
        <Link
          href={actionHref}
          className="text-xs text-[#FFC107] font-semibold hover:underline flex items-center gap-1 shrink-0 ml-auto"
        >
          <span>{actionText}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      ) : actionText && onAction ? (
        <button
          onClick={onAction}
          className="text-xs text-[#FFC107] font-semibold hover:underline flex items-center gap-1 shrink-0 ml-auto cursor-pointer"
        >
          <span>{actionText}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      ) : null}
    </div>
  );
}
