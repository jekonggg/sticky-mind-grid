import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function SidebarNavSkeleton() {
  return (
    <div className="space-y-2 py-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl">
          <Skeleton className="h-4 w-4 rounded-md shrink-0" />
          <Skeleton className="h-3.5 w-3/4 rounded-sm" />
        </div>
      ))}
    </div>
  );
}
