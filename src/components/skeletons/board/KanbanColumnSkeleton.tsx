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
        "flex flex-col min-w-[280px] w-80 shrink-0 group/column",
        className
      )}
    >
      {/* Column Header */}
      <div className="flex items-center gap-2.5 px-1 mb-3 h-10">
        <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
        <Skeleton className="h-4 w-28 rounded-sm" />
        <Skeleton className="h-5 w-6 rounded-full shrink-0 ml-auto" />
      </div>

      {/* Column Body Container */}
      <div className="flex-1 rounded-xl p-2 space-y-2 min-h-[120px] bg-muted/30 border border-transparent">
        {Array.from({ length: cardCount }).map((_, i) => (
          <TaskCardSkeleton key={i} hasCover={i === 0} />
        ))}

        {/* Add Task Button placeholder */}
        <Skeleton className="h-8 w-full rounded-lg mt-1" />
      </div>
    </div>
  );
}
