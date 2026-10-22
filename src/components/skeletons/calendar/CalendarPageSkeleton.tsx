import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function CalendarPageSkeleton() {
  return (
    <main
      role="status"
      aria-label="Loading calendar"
      className="flex-1 max-w-7xl w-full mx-auto p-3 md:px-6 md:py-8 lg:px-8 pb-20 space-y-4 md:space-y-6 animate-in fade-in duration-300"
    >
      {/* 1. Page Header & Toolbar */}
      <div className="space-y-2 md:hidden">
        <Skeleton className="h-8 w-44 rounded-lg" />
        <Skeleton className="h-3 w-64 max-w-full rounded-sm" />
      </div>
      <div className="flex items-center justify-between gap-2 md:hidden">
        <div className="flex items-center gap-1">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-16 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
      </div>
      <div className="hidden md:flex md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <Skeleton className="h-8 w-44 rounded-lg lg:h-9 lg:w-60" />
          <Skeleton className="h-3.5 w-80 max-w-full rounded-sm" />
        </div>

        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-6 w-36 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* 2. Calendar Grid & Sidebar (4-Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Main 7-Day Month Grid (3 cols) */}
        <div className="lg:col-span-3 bg-card rounded-2xl border border-border/60 shadow-xs overflow-hidden flex h-[clamp(300px,40dvh,370px)] flex-col md:h-auto">
          <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-3 py-2 md:hidden">
            <Skeleton className="h-4 w-24 rounded-sm" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
          {/* Weekday Header */}
          <div className="grid grid-cols-7 border-b border-border/60 bg-muted/20 py-2.5 text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((_, i) => (
              <Skeleton key={i} className="h-3.5 w-8 mx-auto rounded-sm" />
            ))}
          </div>

          {/* Days Matrix (35 cells) */}
          <div className="grid min-h-0 flex-1 grid-cols-7 auto-rows-fr divide-x divide-y divide-border/40">
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                className="min-h-0 p-1 md:min-h-[105px] md:p-2 flex flex-col justify-between"
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
        <div className="grid w-full grid-cols-2 gap-3 md:flex md:flex-col md:gap-6">
          {/* Selected Day Agenda */}
          <div className="col-span-2 block h-[clamp(200px,28dvh,260px)] p-3 rounded-2xl bg-card border border-border/60 shadow-xs space-y-3 md:col-span-1 md:h-auto md:p-5">
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
          <div className="h-[clamp(190px,26dvh,240px)] md:h-auto overflow-hidden p-3 md:p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-3">
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

          {/* Completed Tasks List (mobile footer companion) */}
          <div className="h-[clamp(190px,26dvh,240px)] overflow-hidden p-3 rounded-2xl bg-card border border-border/60 shadow-xs space-y-3 md:hidden">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-1 rounded-full bg-green-500/30" />
              <Skeleton className="h-4 w-28 rounded-sm" />
            </div>

            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-green-500/5 border border-green-500/20 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3.5 w-3/4 rounded-sm" />
                    <Skeleton className="h-3 w-10 rounded-sm" />
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
