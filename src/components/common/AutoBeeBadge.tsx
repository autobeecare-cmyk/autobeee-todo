"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Priority, TaskStatus } from "@/lib/types";

interface AutoBeeBadgeProps {
  variant?: "priority" | "status" | "role" | "custom";
  priority?: Priority;
  status?: TaskStatus | string;
  role?: string;
  children?: ReactNode;
  className?: string;
  size?: "sm" | "md";
}

const PRIORITY_STYLES: Record<Priority, { label: string; style: string }> = {
  urgent: {
    label: "Urgent",
    style: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  high: {
    label: "High",
    style: "bg-amber-500/15 text-[#FFC107] border-amber-500/30",
  },
  medium: {
    label: "Medium",
    style: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  low: {
    label: "Low",
    style: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  },
};

const STATUS_STYLES: Record<string, { label: string; style: string }> = {
  todo: {
    label: "To Do",
    style: "bg-white/[0.04] text-muted-foreground border-white/10",
  },
  doing: {
    label: "Doing",
    style: "bg-[#FFC107]/15 text-[#FFC107] border-[#FFC107]/30",
  },
  done: {
    label: "Done",
    style: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  active: {
    label: "Active",
    style: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  completed: {
    label: "Completed",
    style: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  paused: {
    label: "Paused",
    style: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  },
};

export function AutoBeeBadge({
  variant = "custom",
  priority,
  status,
  role,
  children,
  className,
  size = "sm",
}: AutoBeeBadgeProps) {
  let content = children;
  let styleClasses = "bg-white/[0.04] text-muted-foreground border-white/10";

  if (variant === "priority" && priority && PRIORITY_STYLES[priority]) {
    content = content || PRIORITY_STYLES[priority].label;
    styleClasses = PRIORITY_STYLES[priority].style;
  } else if (variant === "status" && status && STATUS_STYLES[status]) {
    content = content || STATUS_STYLES[status].label;
    styleClasses = STATUS_STYLES[status].style;
  } else if (variant === "role" && role) {
    content = content || role;
    styleClasses = "bg-white/[0.06] text-foreground/80 border-white/10";
  }

  const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-semibold rounded-md border tracking-wide uppercase",
        sizeClasses,
        styleClasses,
        className
      )}
    >
      {content}
    </span>
  );
}
