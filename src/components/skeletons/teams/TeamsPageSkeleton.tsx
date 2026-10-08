import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function TeamsPageSkeleton() {
  return (
    <main
      role="status"
      aria-label="Loading team directory"
      className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 space-y-8 animate-in fade-in duration-300"
    >
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
            <Skeleton className="h-8 w-56 rounded-lg" />
          </div>
          <Skeleton className="h-3.5 w-80 max-w-full rounded-sm" />
        </div>

        <Skeleton className="h-9 w-36 rounded-xl shrink-0" />
      </div>

      {/* 2. Workspace Boards Overview */}
      <div className="space-y-4">
        <Skeleton className="h-5 w-44 rounded-sm" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <Skeleton className="h-4 w-32 rounded-sm" />
                  <Skeleton className="h-3 w-24 rounded-sm" />
                </div>
              </div>
              <Skeleton className="h-7 w-16 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* 3. Teammates & Collaborators Directory */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Skeleton className="h-5 w-48 rounded-sm" />
          <Skeleton className="h-8 w-full sm:w-64 rounded-xl" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col justify-between gap-4"
            >
              <div className="flex items-start gap-3 min-w-0">
                <Skeleton className="h-11 w-11 rounded-full shrink-0" />
                <div className="flex flex-col min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32 rounded-sm" />
                  <Skeleton className="h-3 w-40 rounded-sm" />
                  <Skeleton className="h-4 w-16 rounded-md mt-0.5" />
                </div>
              </div>

              <div className="space-y-1">
                <Skeleton className="h-2.5 w-20 rounded-sm" />
                <div className="flex flex-wrap gap-1">
                  <Skeleton className="h-4 w-14 rounded-md" />
                  <Skeleton className="h-4 w-16 rounded-md" />
                </div>
              </div>

              <div className="pt-3 border-t border-border/40">
                <Skeleton className="h-8 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
