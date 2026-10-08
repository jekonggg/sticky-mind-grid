import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarGroupSkeleton } from "../common/AvatarGroupSkeleton";

export function BoardCardSkeleton() {
  return (
    <div className="group relative flex flex-col justify-between p-5 rounded-2xl bg-card/90 border border-border/60 shadow-xs space-y-4">
      {/* Top row: Emoji & Star/Menu */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32 rounded-sm" />
            <Skeleton className="h-3 w-20 rounded-sm" />
          </div>
        </div>
        <Skeleton className="h-6 w-6 rounded-md" />
      </div>

      {/* Description lines */}
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-full rounded-sm" />
        <Skeleton className="h-3 w-4/5 rounded-sm" />
      </div>

      {/* Progress / Column indicator */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between items-center">
          <Skeleton className="h-2.5 w-16 rounded-sm" />
          <Skeleton className="h-2.5 w-8 rounded-sm" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>

      {/* Footer: Members & Timestamp */}
      <div className="flex items-center justify-between pt-3 border-t border-border/40">
        <AvatarGroupSkeleton count={3} size="sm" />
        <Skeleton className="h-3 w-20 rounded-sm" />
      </div>
    </div>
  );
}
