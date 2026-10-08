import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { BoardCardSkeleton } from "./BoardCardSkeleton";

export function BoardsOverviewSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading boards"
      className="w-full animate-in fade-in duration-300"
    >
      {/* 1. Hero Banner Skeleton */}
      <div className="relative w-full h-[280px] md:h-[340px] overflow-hidden bg-background">
        <div className="absolute inset-0 bg-primary/10" />
        
        {/* Ambient Grid Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Content Overlay */}
        <div className="relative h-full max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-12 md:pt-14 pb-20 flex flex-col justify-start">
          <div className="space-y-3">
            <Skeleton className="h-9 sm:h-11 md:h-13 lg:h-14 w-80 max-w-full rounded-xl" />
            <div className="h-1.5 w-20 bg-primary/20 rounded-full" />
            <Skeleton className="h-4 sm:h-5 md:h-6 w-60 max-w-full rounded-md" />
          </div>
        </div>

        {/* Bottom Ambient Transition */}
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </div>

      {/* 2. Floating Toolbox Skeleton */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 md:-mt-12 relative z-10">
        <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl shadow-xl p-4 md:p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-5 w-5 rounded-md shrink-0" />
              <Skeleton className="h-6 w-32 rounded-md" />
            </div>

            <div className="flex w-full md:w-auto gap-3 items-center">
              <Skeleton className="h-10 flex-1 md:w-64 rounded-md" />
              <Skeleton className="h-10 w-[140px] md:w-[160px] rounded-md shrink-0" />
              <Skeleton className="h-10 w-28 md:w-36 rounded-md shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Content Grid */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <BoardCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
