import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { KanbanColumnSkeleton } from "./KanbanColumnSkeleton";
import { BoardHeader } from "@/components/kanban/BoardHeader";

export function BoardViewSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading board"
      className="flex flex-col h-screen bg-background overflow-hidden font-sans"
    >
      {/* 1. Global Navigation Header */}
      <BoardHeader showSearch={false} />

      {/* 2. Main Board Viewport Screen */}
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 h-full min-w-0 relative flex flex-col overflow-hidden">
          {/* Pinned Board Header */}
          <div className="bg-background border-b border-border/50 shrink-0">
            {/* Row 1: Board Name, Emoji, Badges, & Actions */}
            <div className="px-6 pt-3.5 pb-2 md:px-8 flex items-center justify-between gap-4 w-full">
              <div className="flex items-center gap-3 min-w-0">
                <Skeleton className="h-10 w-10 md:h-11 md:w-11 rounded-xl shrink-0" />
                <div className="flex flex-col min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Skeleton className="h-6 md:h-7 w-44 rounded-lg" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                  <Skeleton className="h-3.5 w-64 max-w-full rounded-sm" />
                </div>
              </div>
            </div>

            {/* Row 2: Filter Toolbar */}
            <div className="px-6 pb-2.5 md:px-8 w-full flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <Skeleton className="h-7 w-16 rounded-full" />
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-full" />
              </div>
              <Skeleton className="h-7 w-16 rounded-full ml-auto" />
            </div>
          </div>

          {/* 3. Columns Canvas */}
          <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col bg-muted/20">
            <main className="p-6 md:p-8 flex-1 min-h-0 overflow-x-auto overflow-y-auto custom-scrollbar h-full">
              <div className="flex gap-6 md:gap-8 h-full min-w-max pb-28 items-start">
                <KanbanColumnSkeleton cardCount={3} />
                <KanbanColumnSkeleton cardCount={2} />
                <KanbanColumnSkeleton cardCount={3} />
                <KanbanColumnSkeleton cardCount={1} />
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
