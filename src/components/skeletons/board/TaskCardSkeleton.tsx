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
        "rounded-2xl bg-card/90 border border-border/60 p-3.5 shadow-2xs space-y-3",
        className
      )}
    >
      {hasCover && (
        <Skeleton className="h-28 w-full rounded-xl -mt-0.5 -mx-0.5 mb-2" />
      )}

      <div className="space-y-2">
        {/* Title and Emoji */}
        <div className="flex items-start gap-2">
          <Skeleton className="h-6 w-6 rounded-lg shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-3.5 w-4/5 rounded-sm" />
            <Skeleton className="h-3 w-1/2 rounded-sm" />
          </div>
        </div>
      </div>

      {/* Tags & Priority */}
      <div className="flex items-center gap-1.5 pt-1">
        <Skeleton className="h-5 w-14 rounded-md" />
        <Skeleton className="h-5 w-12 rounded-md" />
      </div>

      {/* Progress bar */}
      <Skeleton className="h-1.5 w-full rounded-full" />

      {/* Footer: Date & Avatar */}
      <div className="flex items-center justify-between pt-1 border-t border-border/40">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3.5 w-3.5 rounded-sm" />
          <Skeleton className="h-3 w-16 rounded-sm" />
        </div>
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
    </div>
  );
}
