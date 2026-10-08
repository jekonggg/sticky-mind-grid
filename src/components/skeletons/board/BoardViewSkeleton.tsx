import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { KanbanColumnSkeleton } from "./KanbanColumnSkeleton";
import { AvatarGroupSkeleton } from "../common/AvatarGroupSkeleton";

export function BoardViewSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading board"
      className="flex flex-col h-screen bg-background overflow-hidden"
    >
      {/* 1. Header Toolbar Skeleton */}
      <div className="border-b border-border/60 bg-card/60 backdrop-blur-md px-6 py-3.5 space-y-3">
        {/* Top row: Title + Actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-2xl" />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-36 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-48 rounded-sm" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AvatarGroupSkeleton count={4} size="sm" />
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
        </div>

        {/* Bottom row: View Switcher Tabs + Search/Filter */}
        <div className="flex items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-8 w-20 rounded-xl" />
            <Skeleton className="h-8 w-16 rounded-xl" />
            <Skeleton className="h-8 w-20 rounded-xl" />
            <Skeleton className="h-8 w-16 rounded-xl" />
            <Skeleton className="h-8 w-20 rounded-xl" />
          </div>

          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-44 rounded-xl" />
            <Skeleton className="h-8 w-8 rounded-xl" />
          </div>
        </div>
      </div>

      {/* 2. Kanban Columns Canvas Skeleton */}
      <div className="flex-1 overflow-x-auto p-6 flex gap-6 items-start">
        <KanbanColumnSkeleton cardCount={3} />
        <KanbanColumnSkeleton cardCount={2} />
        <KanbanColumnSkeleton cardCount={3} />
        <KanbanColumnSkeleton cardCount={1} />
      </div>
    </div>
  );
}
