import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function ConversationListSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading conversations"
      className="w-full md:w-80 h-full flex flex-col bg-card/95 border-r border-border/60 shrink-0 select-none"
    >
      {/* 1. Header & Controls */}
      <div className="p-3 border-b border-border/50 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded shrink-0" />
            <Skeleton className="h-4 w-20 rounded-sm" />
          </div>
          <Skeleton className="h-7 w-20 rounded-xl" />
        </div>

        {/* Search Bar */}
        <Skeleton className="h-8 w-full rounded-xl" />

        {/* Filter Tabs */}
        <div className="grid grid-cols-3 bg-muted/50 p-0.5 rounded-xl h-7 gap-1">
          <Skeleton className="h-6 rounded-lg" />
          <Skeleton className="h-6 rounded-lg" />
          <Skeleton className="h-6 rounded-lg" />
        </div>
      </div>

      {/* 2. Conversation rows */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-2.5 rounded-2xl bg-muted/20 border border-transparent"
          >
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
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
