"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  icon,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2", className)}>
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {icon && (
            <div className="w-8 h-8 rounded-xl bg-[#FFC107]/10 border border-[#FFC107]/20 flex items-center justify-center text-[#FFC107] shrink-0">
              {icon}
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          {actions}
        </div>
      )}
    </div>
  );
}
