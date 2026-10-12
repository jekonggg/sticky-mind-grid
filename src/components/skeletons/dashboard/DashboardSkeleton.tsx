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

      {/* 2. Aligned KPI Telemetry Strip (7 / 5 Split) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-12 gap-4">
          {/* Active Tasks Card */}
          <div className="sm:col-span-7 p-4 sm:p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Skeleton className="h-3.5 w-24 rounded-sm" />
                <Skeleton className="h-9 w-20 rounded-lg mt-2" />
              </div>
              <Skeleton className="h-6 w-32 rounded-lg" />
            </div>

            <div className="pt-2.5 border-t border-border/40 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24 rounded-sm" />
                <Skeleton className="h-3 w-28 rounded-sm" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          </div>

          {/* Completed Card */}
          <div className="sm:col-span-5">
            <StatCardSkeleton />
          </div>
        </div>

        {/* Right 5 Cols: Total Boards + Overdue */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      </div>

      {/* 3. Asymmetric 7 / 5 Workspace Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Primary Panel (7 Cols): My Priority Tasks */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-3.5">
            <Skeleton className="h-4 w-40 rounded-sm" />
            <Skeleton className="h-6 w-16 rounded-md" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="px-3.5 py-2.5 rounded-xl bg-muted/20 border border-border/40 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Skeleton className="h-4 w-4 rounded shrink-0" />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <Skeleton className="h-3.5 w-3/5 rounded-sm" />
                    <Skeleton className="h-2.5 w-28 rounded-sm" />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Skeleton className="hidden sm:block h-1.5 w-16 rounded-full" />
                  <Skeleton className="h-3.5 w-8 rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Context Rail (5 Cols): Stacked Upcoming Deadlines + Workspace Audit Stream */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Top Panel: Upcoming Deadlines */}
          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-3">
              <Skeleton className="h-4 w-36 rounded-sm" />
              <Skeleton className="h-6 w-16 rounded-md" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/20 border border-border/40 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Skeleton className="h-4 w-4 rounded-sm shrink-0" />
                    <Skeleton className="h-3.5 w-3/4 rounded-sm" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded-md shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Panel: Live Workspace Audit Stream */}
          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col flex-1">
            <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-3.5">
              <Skeleton className="h-4 w-40 rounded-sm" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <div className="space-y-3.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
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
      </div>
    </main>
  );
}
