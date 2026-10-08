import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function TaskDetailSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading task details"
      className="h-full bg-background text-foreground flex flex-col overflow-hidden selection:bg-primary/20"
    >
      {/* 1. Header & Page Controls Breadcrumbs */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/40 bg-background/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-16 rounded-lg" />
          <span className="text-muted-foreground/40 font-light">/</span>
          <Skeleton className="h-4 w-24 rounded-sm" />
          <span className="text-muted-foreground/40 font-light">/</span>
          <Skeleton className="h-4 w-36 rounded-sm" />
        </div>

        <div className="flex items-center gap-1.5">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>

      {/* 2. Main Scrollable Document Body */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        {/* Page Title & Emoji Container */}
        <div className="max-w-4xl mx-auto w-full px-6 sm:px-12 pt-8 space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-2xl shrink-0" />
            <Skeleton className="h-6 w-20 rounded-md" />
          </div>
          <Skeleton className="h-10 w-3/4 rounded-xl" />
        </div>

        {/* Notion-Style Properties Grid */}
        <div className="max-w-4xl mx-auto w-full px-6 sm:px-12 py-6 border-b border-border/40 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6 py-1">
              <Skeleton className="h-4 w-24 rounded-sm shrink-0" />
              <Skeleton className="h-7 w-48 rounded-lg" />
            </div>
          ))}
        </div>

        {/* Description Block */}
        <div className="max-w-4xl mx-auto w-full px-6 sm:px-12 py-6 border-b border-border/40 space-y-3">
          <Skeleton className="h-4 w-28 rounded-sm" />
          <Skeleton className="h-4 w-full rounded-sm" />
          <Skeleton className="h-4 w-5/6 rounded-sm" />
          <Skeleton className="h-4 w-2/3 rounded-sm" />
        </div>

        {/* Checklist Block */}
        <div className="max-w-4xl mx-auto w-full px-6 sm:px-12 py-6 border-b border-border/40 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28 rounded-sm" />
            <Skeleton className="h-4 w-12 rounded-sm" />
          </div>
          <div className="space-y-2 pt-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-sm shrink-0" />
                <Skeleton className="h-4 w-3/5 rounded-sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Comments Section */}
        <div className="max-w-4xl mx-auto w-full px-6 sm:px-12 py-6 border-b border-border/40 space-y-4">
          <Skeleton className="h-4 w-32 rounded-sm" />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-32 rounded-sm" />
                  <Skeleton className="h-4 w-4/5 rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Sticky Micro-Status Bar Footer */}
      <div className="h-8 px-6 shrink-0 border-t border-border/40 bg-muted/20 backdrop-blur-sm flex items-center justify-between text-[11px] select-none">
        <Skeleton className="h-3 w-32 rounded-sm" />
        <Skeleton className="h-3 w-16 rounded-sm" />
      </div>
    </div>
  );
}
