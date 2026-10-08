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
      <CardContent className="p-4 pt-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32 rounded-sm" />
              <Skeleton className="h-3 w-40 rounded-sm" />
            </div>
          </div>
          <Skeleton className="h-7 w-7 rounded-lg shrink-0 opacity-40" />
        </div>

        {/* Footer: Tasks count + Timestamp */}
        <div className="flex items-center gap-2 pt-1 text-xs">
          <Skeleton className="h-3 w-12 rounded-sm" />
          <span className="text-muted-foreground/40">·</span>
          <Skeleton className="h-3 w-24 rounded-sm" />
        </div>
      </CardContent>
    </Card>
  );
}
