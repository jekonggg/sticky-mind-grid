import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "pulse" | "shimmer" | "none";
}

function Skeleton({ className, variant = "shimmer", ...props }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-hidden="true"
      className={cn(
        "rounded-md bg-muted/80 dark:bg-muted/40 transition-colors",
        variant === "pulse" && "animate-pulse motion-reduce:animate-none",
        variant === "shimmer" &&
          "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-foreground/5 before:to-transparent motion-reduce:before:hidden",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton, type SkeletonProps };
