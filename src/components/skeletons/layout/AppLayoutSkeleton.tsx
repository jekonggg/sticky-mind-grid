import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarNavSkeleton } from "./SidebarNavSkeleton";

export function AppLayoutSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading application"
      className="flex h-screen w-screen bg-background overflow-hidden"
    >
      {/* Sidebar Placeholder */}
      <div className="hidden md:flex w-64 h-full flex-col border-r border-border/60 bg-card/80 p-4 space-y-6 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2">
          <Skeleton className="h-8 w-8 rounded-xl" />
          <Skeleton className="h-5 w-32 rounded-md" />
        </div>

        {/* Nav links */}
        <div className="space-y-1">
          <SidebarNavSkeleton />
        </div>

        {/* Boards Section */}
        <div className="space-y-2 pt-4 border-t border-border/40">
          <Skeleton className="h-3 w-20 px-2 rounded-sm" />
          <SidebarNavSkeleton />
        </div>

        {/* User Footer */}
        <div className="mt-auto pt-4 border-t border-border/40 flex items-center gap-3 px-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-3.5 w-24 rounded-sm" />
            <Skeleton className="h-2.5 w-32 rounded-sm" />
          </div>
        </div>
      </div>

      {/* Main Content Area Placeholder */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navbar */}
        <div className="h-14 border-b border-border/60 bg-card/40 px-6 flex items-center justify-between">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-xl" />
            <Skeleton className="h-8 w-8 rounded-xl" />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 md:p-8 space-y-6 overflow-hidden">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-4 w-72 rounded-sm" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
