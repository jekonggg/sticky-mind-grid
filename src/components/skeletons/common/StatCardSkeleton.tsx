import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardSkeletonProps {
  showIcon?: boolean;
  className?: string;
}

export function StatCardSkeleton({ showIcon = false, className }: StatCardSkeletonProps) {
  return (
    <div
      className={cn(
        "p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col justify-between gap-1.5 sm:gap-2",
        className
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <Skeleton className="h-2.5 w-14 rounded-sm min-[360px]:w-20 sm:h-3.5 sm:w-24" />
        {showIcon && <Skeleton className="h-7 w-7 rounded-lg" />}
      </div>
      <Skeleton className="h-6 w-10 rounded-md my-1 min-[360px]:h-7 min-[360px]:w-12 sm:h-8 sm:w-16" />
      <Skeleton className="h-2 w-16 rounded-sm min-[360px]:w-20 sm:h-3 sm:w-28" />
    </div>
  );
}
