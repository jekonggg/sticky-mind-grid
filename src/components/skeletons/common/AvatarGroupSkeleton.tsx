import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface AvatarGroupSkeletonProps {
  count?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AvatarGroupSkeleton({
  count = 3,
  size = "md",
  className,
}: AvatarGroupSkeletonProps) {
  const sizeClasses = {
    sm: "h-6 w-6 ring-1",
    md: "h-8 w-8 ring-2",
    lg: "h-10 w-10 ring-2",
  };

  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "rounded-full ring-background shrink-0",
            sizeClasses[size]
          )}
        />
      ))}
    </div>
  );
}
