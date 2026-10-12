import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function BoardCardSkeleton() {
  return (
    <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm flex flex-col">
      {/* Hero Image Aspect Video Placeholder */}
      <div className="aspect-video w-full bg-muted/60 relative overflow-hidden">
        <Skeleton className="w-full h-full rounded-none" />
      </div>

      {/* Color bar */}
      <div className="h-1 w-full bg-primary/20" />

      {/* Card Content */}
      <CardContent className="p-4 pt-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Skeleton className="h-4 w-28 rounded-sm" />
                <Skeleton className="h-4 w-14 rounded-full" />
                <Skeleton className="h-4 w-14 rounded-full" />
              </div>
              <Skeleton className="h-3 w-40 rounded-sm" />
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Skeleton className="h-8 w-8 rounded-lg shrink-0 opacity-40" />
            <Skeleton className="h-8 w-8 rounded-lg shrink-0 opacity-40" />
          </div>
        </div>

        {/* Footer: Open tasks count + Updated timestamp on left, member avatar stack on right */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Skeleton className="h-3.5 w-16 rounded-sm" />
            <span className="text-muted-foreground/40">·</span>
            <Skeleton className="h-3.5 w-20 rounded-sm" />
          </div>
          <div className="flex items-center -space-x-1.5 shrink-0">
            <Skeleton className="h-6 w-6 rounded-full ring-2 ring-background" />
            <Skeleton className="h-6 w-6 rounded-full ring-2 ring-background" />
            <Skeleton className="h-6 w-6 rounded-full ring-2 ring-background" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
