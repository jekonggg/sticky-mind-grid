import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function ChatAreaSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading chat"
      className="flex-1 h-full flex flex-col bg-background select-none overflow-hidden"
    >
      {/* 1. Header Toolbar */}
      <div className="h-16 px-4 border-b border-border/60 bg-card/60 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-2xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32 rounded-sm" />
            <Skeleton className="h-2.5 w-20 rounded-sm" />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-8 w-8 rounded-xl" />
          <Skeleton className="h-8 w-8 rounded-xl" />
        </div>
      </div>

      {/* 2. Message Bubbles Thread */}
      <div className="flex-1 p-4 space-y-4 overflow-hidden">
        {/* Received message 1 */}
        <div className="flex items-start gap-2.5 max-w-[70%]">
          <Skeleton className="h-8 w-8 rounded-full shrink-0 mt-0.5" />
          <div className="space-y-1">
            <Skeleton className="h-16 w-56 rounded-2xl rounded-tl-sm" />
            <Skeleton className="h-2.5 w-12 rounded-sm" />
          </div>
        </div>

        {/* Sent message 1 */}
        <div className="flex flex-col items-end ml-auto max-w-[70%] space-y-1">
          <Skeleton className="h-12 w-48 rounded-2xl rounded-tr-sm bg-primary/20" />
          <Skeleton className="h-2.5 w-12 rounded-sm" />
        </div>

        {/* Received message 2 */}
        <div className="flex items-start gap-2.5 max-w-[70%]">
          <Skeleton className="h-8 w-8 rounded-full shrink-0 mt-0.5" />
          <div className="space-y-1">
            <Skeleton className="h-20 w-72 rounded-2xl rounded-tl-sm" />
            <Skeleton className="h-2.5 w-12 rounded-sm" />
          </div>
        </div>

        {/* Sent message 2 */}
        <div className="flex flex-col items-end ml-auto max-w-[70%] space-y-1">
          <Skeleton className="h-14 w-64 rounded-2xl rounded-tr-sm bg-primary/20" />
          <Skeleton className="h-2.5 w-12 rounded-sm" />
        </div>
      </div>

      {/* 3. Composer Box */}
      <div className="p-3 border-t border-border/60 bg-card/60">
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    </div>
  );
}
