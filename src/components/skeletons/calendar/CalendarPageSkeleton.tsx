import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function CalendarPageSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading calendar"
      className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-300"
    >
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-36 rounded-lg" />
          <Skeleton className="h-4 w-60 rounded-sm" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* 2. Month Nav & Controls */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/60 shadow-xs">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-xl" />
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-xl" />
        </div>
        <Skeleton className="h-8 w-20 rounded-xl" />
      </div>

      {/* 3. Calendar Grid & Sidebar Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Grid (8-9 Cols) */}
        <div className="lg:col-span-8 xl:col-span-9 bg-card rounded-2xl border border-border/60 p-4 shadow-xs space-y-3">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 gap-2 pb-2 border-b border-border/40 text-center">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((_, i) => (
              <Skeleton key={i} className="h-4 w-10 mx-auto rounded-sm" />
            ))}
          </div>

          {/* 5 Weeks of Cells */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                className="h-24 sm:h-28 rounded-xl bg-muted/20 border border-border/30 p-2 flex flex-col justify-between"
              >
                <Skeleton className="h-3.5 w-5 rounded-sm" />
                {i % 3 === 0 && (
                  <Skeleton className="h-4 w-full rounded-md bg-primary/20" />
                )}
                {i % 5 === 0 && (
                  <Skeleton className="h-4 w-4/5 rounded-md bg-muted/60" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Upcoming Deadlines (3-4 Cols) */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
            <Skeleton className="h-4 w-36 rounded-sm pb-1 border-b border-border/40" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3.5 w-3/4 rounded-sm" />
                    <Skeleton className="h-4 w-10 rounded-md" />
                  </div>
                  <Skeleton className="h-3 w-24 rounded-sm" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
