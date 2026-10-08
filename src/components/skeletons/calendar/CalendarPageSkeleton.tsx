import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function CalendarPageSkeleton() {
  return (
    <main
      role="status"
      aria-label="Loading calendar"
      className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 space-y-6 animate-in fade-in duration-300"
    >
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
            <Skeleton className="h-8 w-44 rounded-lg" />
          </div>
          <Skeleton className="h-3.5 w-80 max-w-full rounded-sm" />
        </div>

        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-6 w-36 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* 2. Calendar Grid & Sidebar (4-Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main 7-Day Month Grid (3 cols) */}
        <div className="lg:col-span-3 bg-card rounded-2xl border border-border/60 shadow-xs overflow-hidden flex flex-col">
          {/* Weekday Header */}
          <div className="grid grid-cols-7 border-b border-border/60 bg-muted/20 py-2.5 text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((_, i) => (
              <Skeleton key={i} className="h-3.5 w-8 mx-auto rounded-sm" />
            ))}
          </div>

          {/* Days Matrix (35 cells) */}
          <div className="grid grid-cols-7 divide-x divide-y divide-border/40 flex-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                className="min-h-[105px] p-2 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  {i % 4 === 0 && <Skeleton className="h-3 w-8 rounded-sm" />}
                </div>

                <div className="space-y-1 overflow-hidden">
                  {i % 3 === 0 && (
                    <Skeleton className="h-4 w-full rounded bg-primary/15" />
                  )}
                  {i % 5 === 0 && (
                    <Skeleton className="h-4 w-4/5 rounded bg-muted/50" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar: Selected Day & Overdue (1 col) */}
        <div className="space-y-6">
          {/* Selected Day Agenda */}
          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
              <div className="space-y-1">
                <Skeleton className="h-4 w-28 rounded-sm" />
                <Skeleton className="h-3 w-20 rounded-sm" />
              </div>
              <Skeleton className="h-7 w-12 rounded-lg" />
            </div>

            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-muted/30 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3.5 w-3/4 rounded-sm" />
                    <Skeleton className="h-3 w-10 rounded-sm" />
                  </div>
                  <Skeleton className="h-2.5 w-1/2 rounded-sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Overdue Tasks List */}
          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-sm" />
              <Skeleton className="h-4 w-32 rounded-sm" />
            </div>

            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3.5 w-3/4 rounded-sm" />
                    <Skeleton className="h-3 w-12 rounded-sm" />
                  </div>
                  <Skeleton className="h-2.5 w-1/3 rounded-sm" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
