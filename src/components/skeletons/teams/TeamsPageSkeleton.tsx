import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function TeamsPageSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading team directory"
      className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-300"
    >
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-44 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-sm" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-60 rounded-xl" />
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
      </div>

      {/* 2. Pending Invitations Skeleton */}
      <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-48 rounded-sm" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-border/60 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-28 rounded-sm" />
                    <Skeleton className="h-4 w-14 rounded-md" />
                  </div>
                  <Skeleton className="h-3 w-36 rounded-sm" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Skeleton className="h-8 w-18 rounded-lg" />
                <Skeleton className="h-8 w-18 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Teammates Directory Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40 rounded-sm" />
          <Skeleton className="h-4 w-24 rounded-sm" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4 flex flex-col justify-between"
            >
              <div className="flex items-start gap-3">
                <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <Skeleton className="h-4 w-32 rounded-sm" />
                  <Skeleton className="h-3 w-40 rounded-sm" />
                  <Skeleton className="h-4 w-16 rounded-md mt-1" />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <Skeleton className="h-3 w-24 rounded-sm" />
                <div className="flex flex-wrap gap-1.5">
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <Skeleton className="h-5 w-20 rounded-md" />
                </div>
              </div>

              <Skeleton className="h-8 w-full rounded-xl mt-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
