import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TaskCardSkeletonProps {
  hasCover?: boolean;
  className?: string;
}

export function TaskCardSkeleton({ hasCover = false, className }: TaskCardSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-card border border-border/60 p-3 shadow-sm flex flex-col justify-between space-y-2",
        className
      )}
    >
      {hasCover && (
        <div className="mb-1 overflow-hidden rounded-lg border border-border/50 aspect-video bg-muted/60">
          <Skeleton className="w-full h-full rounded-none" />
        </div>
      )}

      <div className="space-y-1.5">
        {/* Title and Emoji and Priority Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Skeleton className="h-4 w-4 rounded shrink-0" />
            <Skeleton className="h-4 w-3/5 rounded-sm" />
          </div>
          <Skeleton className="h-4 w-12 rounded-full shrink-0" />
        </div>

        {/* Description line */}
        <Skeleton className="h-3 w-4/5 rounded-sm mt-1" />

        {/* Tag Pill */}
        <div className="flex items-center gap-1 mt-1.5">
          <Skeleton className="h-3.5 w-12 rounded-full" />
        </div>
      </div>

      {/* Footer: Date / Checklist metadata + Avatar */}
      <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-4 w-12 rounded-md" />
        </div>
        <Skeleton className="h-6 w-6 rounded-full shrink-0 ml-auto" />
      </div>
    </div>
  );
}
