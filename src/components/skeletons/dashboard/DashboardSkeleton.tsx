import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardSkeleton } from "../common/StatCardSkeleton";

export function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading dashboard"
      className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-300"
    >
      {/* 1. Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-sm" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Big Card (5 Cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-32 rounded-sm" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-10 rounded-2xl" />
          </div>
          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-24 rounded-sm" />
              <Skeleton className="h-3 w-20 rounded-sm" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </div>

        {/* 3 Small Cards (7 Cols) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      </div>

      {/* 3. 3-Column Parallel Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Column 1: Priority Tasks */}
        <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <Skeleton className="h-4 w-36 rounded-sm" />
            <Skeleton className="h-6 w-14 rounded-md" />
          </div>
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-muted/20 border border-border/40 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 flex-1">
                  <Skeleton className="h-4 w-4 rounded-sm" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-3.5 w-4/5 rounded-sm" />
                    <Skeleton className="h-2.5 w-1/3 rounded-sm" />
                  </div>
                </div>
                <Skeleton className="h-5 w-12 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Deadlines / Upcoming */}
        <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <Skeleton className="h-4 w-36 rounded-sm" />
            <Skeleton className="h-6 w-14 rounded-md" />
          </div>
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-muted/20 border border-border/40 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 flex-1">
                  <Skeleton className="h-7 w-7 rounded-lg" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-3.5 w-3/4 rounded-sm" />
                    <Skeleton className="h-2.5 w-24 rounded-sm" />
                  </div>
                </div>
                <Skeleton className="h-4 w-14 rounded-sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Live Audit Stream */}
        <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <Skeleton className="h-4 w-32 rounded-sm" />
            <Skeleton className="h-4 w-16 rounded-sm" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2.5 pb-2">
                <Skeleton className="h-6 w-6 rounded-full shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3 w-4/5 rounded-sm" />
                  <Skeleton className="h-2.5 w-20 rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
