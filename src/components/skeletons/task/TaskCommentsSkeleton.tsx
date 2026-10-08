import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface TaskCommentsSkeletonProps {
  count?: number;
}

export function TaskCommentsSkeleton({ count = 3 }: TaskCommentsSkeletonProps) {
  return (
    <div className="space-y-3.5 py-1">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/30 border border-border/40"
        >
          <Skeleton className="h-7 w-7 rounded-full shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-20 rounded-sm" />
              <Skeleton className="h-2.5 w-14 rounded-sm" />
            </div>
            <Skeleton className="h-3 w-full rounded-sm" />
            {i % 2 === 0 && <Skeleton className="h-3 w-3/4 rounded-sm" />}
          </div>
        </div>
      ))}
    </div>
  );
}
