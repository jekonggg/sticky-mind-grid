import React from "react";
import { cn } from "@/lib/utils";
import type { BoardViewId } from "@/config/boardViews";

export type { BoardViewId } from "@/config/boardViews";

export interface BoardViewRailItem {
  id: BoardViewId;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number | string }>;
}

interface BoardViewRailProps {
  items: readonly BoardViewRailItem[];
  activeId: BoardViewId;
  onChange: (id: BoardViewId) => void;
  className?: string;
}

/**
 * Compact icon-only board view switcher for mobile.
 * Keeps the six board destinations visible without a bottom dock.
 */
export function BoardViewRail({
  items,
  activeId,
  onChange,
  className,
}: BoardViewRailProps) {
  return (
    <nav
      aria-label="Board views"
      data-testid="board-view-rail"
      className={cn("grid grid-cols-6 gap-1 md:hidden", className)}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeId === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            title={item.label}
            data-view-id={item.id}
            className={cn(
              "relative flex h-11 min-h-11 min-w-0 items-center justify-center rounded-xl border transition-colors cursor-pointer",
              "outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              isActive
                ? "bg-primary/10 text-primary border-primary/25 shadow-xs"
                : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Icon
              className={cn(
                "h-[18px] w-[18px] shrink-0 transition-all",
                isActive ? "stroke-[2.2]" : "stroke-[1.8]"
              )}
            />
          </button>
        );
      })}
    </nav>
  );
}
