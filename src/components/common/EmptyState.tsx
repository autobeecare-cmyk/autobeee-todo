"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionText,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl bg-white/[0.015] border border-white/[0.04]",
        className
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/08 flex items-center justify-center mb-3.5 text-[#FFC107]">
          {icon}
        </div>
      )}
      <h3 className="font-bold text-sm sm:text-base text-foreground">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          {description}
        </p>
      )}
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-3.5 py-1.5 rounded-xl bee-gradient text-[#111] font-bold text-xs shadow hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
