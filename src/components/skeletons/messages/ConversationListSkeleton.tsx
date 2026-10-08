import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function ConversationListSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading conversations"
      className="w-full md:w-80 h-full flex flex-col bg-card/95 border-r border-border/60 shrink-0 select-none p-3 space-y-3"
    >
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-24 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>

      <Skeleton className="h-8 w-full rounded-xl" />

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/40 rounded-xl">
        <Skeleton className="h-6 flex-1 rounded-lg" />
        <Skeleton className="h-6 flex-1 rounded-lg" />
        <Skeleton className="h-6 flex-1 rounded-lg" />
      </div>

      {/* Conversation rows */}
      <div className="flex-1 space-y-2 overflow-hidden pt-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-2.5 rounded-2xl bg-muted/20 border border-transparent"
          >
            <Skeleton className="h-10 w-10 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-24 rounded-sm" />
                <Skeleton className="h-2.5 w-10 rounded-sm" />
              </div>
              <Skeleton className="h-3 w-40 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
