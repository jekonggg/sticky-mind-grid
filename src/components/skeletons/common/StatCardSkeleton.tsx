import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardSkeletonProps {
  className?: string;
}

export function StatCardSkeleton({ className }: StatCardSkeletonProps) {
  return (
    <div
      className={cn(
        "p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col justify-between space-y-3",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24 rounded-sm" />
        <Skeleton className="h-7 w-7 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-16 rounded-md my-1" />
      <Skeleton className="h-3 w-28 rounded-sm" />
    </div>
  );
}
