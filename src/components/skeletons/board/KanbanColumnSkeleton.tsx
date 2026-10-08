import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskCardSkeleton } from "./TaskCardSkeleton";
import { cn } from "@/lib/utils";

interface KanbanColumnSkeletonProps {
  cardCount?: number;
  className?: string;
}

export function KanbanColumnSkeleton({
  cardCount = 3,
  className,
}: KanbanColumnSkeletonProps) {
  return (
    <div
      className={cn(
        "flex flex-col w-80 shrink-0 bg-muted/40 dark:bg-card/40 rounded-3xl border border-border/60 p-3 max-h-full space-y-3",
        className
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-1.5 py-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-2.5 w-2.5 rounded-full" />
          <Skeleton className="h-4 w-24 rounded-sm" />
          <Skeleton className="h-5 w-6 rounded-full" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="h-6 w-6 rounded-lg" />
          <Skeleton className="h-6 w-6 rounded-lg" />
        </div>
      </div>

      {/* Cards container */}
      <div className="flex-1 space-y-3 overflow-hidden py-0.5">
        {Array.from({ length: cardCount }).map((_, i) => (
          <TaskCardSkeleton key={i} hasCover={i === 0} />
        ))}
      </div>

      {/* Add Task Button placeholder */}
      <Skeleton className="h-9 w-full rounded-2xl" />
    </div>
  );
}
