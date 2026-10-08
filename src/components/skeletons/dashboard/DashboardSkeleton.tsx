import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardSkeleton } from "../common/StatCardSkeleton";

export function DashboardSkeleton() {
  return (
    <main
      role="status"
      aria-label="Loading dashboard"
      className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 space-y-6 animate-in fade-in duration-300"
    >
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-border/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="h-4 w-24 rounded-sm" />
          </div>
          <Skeleton className="h-8 w-72 rounded-lg my-1" />
          <Skeleton className="h-4 w-96 max-w-full rounded-sm" />
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      {/* 2. Top Metric Cards (1 Big 5-Cols + 3 Small 7-Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Big Card: Active Tasks */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col justify-between">
          <div>
            <Skeleton className="h-3.5 w-24 rounded-sm" />
            <Skeleton className="h-9 w-20 rounded-lg mt-2" />
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24 rounded-sm" />
              <Skeleton className="h-3 w-28 rounded-sm" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </div>

        {/* 3 Small Cards */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      </div>

      {/* 3. 3-Column Parallel Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Column 1: My Priority Tasks */}
        <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-3">
            <Skeleton className="h-4 w-36 rounded-sm" />
            <Skeleton className="h-6 w-14 rounded-md" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-muted/20 border border-border/40 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <Skeleton className="h-4 w-4 rounded shrink-0" />
                  <div className="space-y-1 flex-1 min-w-0">
                    <Skeleton className="h-3.5 w-4/5 rounded-sm" />
                    <Skeleton className="h-2.5 w-24 rounded-sm" />
                  </div>
                </div>
                <Skeleton className="h-4 w-8 rounded-sm shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Upcoming Deadlines */}
        <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-3">
            <Skeleton className="h-4 w-36 rounded-sm" />
            <Skeleton className="h-6 w-14 rounded-md" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border/40 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Skeleton className="h-4 w-4 rounded-sm shrink-0" />
                  <Skeleton className="h-3.5 w-32 rounded-sm" />
                </div>
                <Skeleton className="h-3.5 w-16 rounded-sm shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Live Workspace Audit Stream */}
        <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-3">
            <Skeleton className="h-4 w-36 rounded-sm" />
            <Skeleton className="h-3.5 w-8 rounded-sm" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs">
                <Skeleton className="h-6 w-6 rounded-full shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1 min-w-0">
                  <Skeleton className="h-3.5 w-full rounded-sm" />
                  <Skeleton className="h-2.5 w-16 rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
