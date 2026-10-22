import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardSkeleton } from "../common/StatCardSkeleton";

export function DashboardSkeleton() {
  return (
    <main
      role="status"
      aria-label="Loading dashboard"
      className="flex-1 max-w-7xl w-full mx-auto px-3 min-[360px]:px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-28 lg:pb-20 space-y-4 sm:space-y-5 animate-in fade-in duration-300"
    >
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-4 border-b border-border/50">
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="h-4 w-24 rounded-sm" />
          </div>
          <Skeleton className="h-8 w-72 max-w-full rounded-lg" />
          <Skeleton className="h-4 w-96 max-w-full rounded-sm" />
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      {/* 2. Mobile KPI bento / desktop 7-5 telemetry strip */}
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3 sm:gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="contents lg:col-span-7 lg:grid lg:grid-cols-12 lg:gap-4">
          {/* Active Tasks Card */}
          <div className="col-start-1 row-span-3 min-w-0 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col justify-between gap-3 p-3 min-[360px]:p-3.5 sm:p-4 lg:col-span-7 lg:row-span-1 lg:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
              <div className="space-y-2">
                <Skeleton className="h-2.5 w-20 rounded-sm" />
                <Skeleton className="h-8 w-14 rounded-lg min-[360px]:h-9 min-[360px]:w-20" />
              </div>
              <Skeleton className="h-6 w-20 rounded-lg min-[360px]:w-28 sm:w-32" />
            </div>

            <div className="pt-2.5 border-t border-border/40 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-2.5 w-20 sm:w-24 rounded-sm" />
                <Skeleton className="h-2.5 w-20 sm:w-28 rounded-sm" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          </div>

          {/* Completed Card */}
          <StatCardSkeleton className="col-start-2 row-start-1 h-full min-w-0 p-2.5 min-[360px]:p-3 sm:p-4 lg:col-start-auto lg:row-start-auto lg:col-span-5 lg:p-5" />
        </div>

        {/* Right 5 Cols: Total Boards + Overdue */}
        <div className="contents lg:col-span-5 lg:grid lg:grid-cols-2 lg:gap-4">
          <StatCardSkeleton className="col-start-2 row-start-3 h-full min-w-0 p-2.5 min-[360px]:p-3 sm:p-4 lg:col-start-auto lg:row-start-auto lg:p-5" />
          <StatCardSkeleton className="col-start-2 row-start-2 h-full min-w-0 p-2.5 min-[360px]:p-3 sm:p-4 lg:col-start-auto lg:row-start-auto lg:p-5" />
        </div>
      </div>

      {/* 3. Mobile priority + deadlines row, full-width audit below / desktop 7-5 bento */}
      <div className="grid grid-cols-1 gap-3 items-stretch min-[360px]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] sm:gap-4 lg:grid-cols-12 lg:gap-5">
        {/* My Priority Tasks */}
        <div className="col-start-1 row-start-1 min-w-0 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col p-3 min-[360px]:p-3.5 sm:p-4 lg:col-span-7 lg:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border/50 mb-3 lg:pb-3 lg:mb-3.5">
            <Skeleton className="h-4 w-40 max-w-[70%] rounded-sm" />
            <Skeleton className="h-6 w-16 rounded-md" />
          </div>
          <div className="space-y-1.5 lg:space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="px-2.5 py-2 rounded-xl bg-muted/20 border border-border/40 flex items-center justify-between gap-2 lg:px-3.5 lg:py-2.5 lg:gap-4"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0 lg:gap-3">
                  <Skeleton className="h-[18px] w-[18px] rounded shrink-0" />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <Skeleton className="h-3.5 w-3/5 rounded-sm" />
                    <Skeleton className="h-2.5 w-24 max-w-full rounded-sm" />
                  </div>
                </div>
                <div className="hidden lg:flex items-center gap-2 shrink-0">
                  <Skeleton className="h-1.5 w-16 rounded-full" />
                  <Skeleton className="h-3.5 w-8 rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="contents lg:col-span-5 lg:flex lg:flex-col lg:gap-5">
          {/* Upcoming Deadlines */}
          <div className="min-w-0 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col p-3 min-[360px]:col-start-2 min-[360px]:row-start-1 min-[360px]:p-3.5 sm:p-4 lg:col-start-auto lg:row-start-auto lg:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2 pb-2.5 border-b border-border/50 mb-2.5 lg:pb-3 lg:mb-3">
              <Skeleton className="h-4 w-32 max-w-[70%] rounded-sm" />
              <Skeleton className="h-6 w-6 rounded-md lg:w-16" />
            </div>
            <div className="space-y-1.5 lg:space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-1.5 px-2 py-2 rounded-xl bg-muted/20 border border-border/40 lg:flex-row lg:items-center lg:justify-between lg:px-3"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Skeleton className="h-4 w-4 rounded-sm shrink-0" />
                    <Skeleton className="h-3.5 w-3/4 rounded-sm" />
                  </div>
                  <Skeleton className="h-5 w-12 rounded-md shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Workspace Audit Stream */}
          <div className="min-w-0 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col flex-1 p-3 min-[360px]:col-span-2 min-[360px]:row-start-2 min-[360px]:p-3.5 sm:p-4 lg:col-span-1 lg:row-start-auto lg:p-5">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/50 mb-2.5 sm:pb-3 sm:mb-3.5">
              <Skeleton className="h-4 w-40 max-w-[65%] rounded-sm" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <div className="space-y-3 sm:space-y-3.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-2.5 sm:gap-3 text-xs">
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
