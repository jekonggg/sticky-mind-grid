import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Fallback shown while a public auth route (login, register, OAuth callback)
 * is being lazy-loaded. It mirrors the centered auth card so navigating
 * between auth pages never flashes the application shell.
 */
export function AuthPageSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading auth page"
      className="min-h-screen flex items-center justify-center bg-muted/30 p-4"
    >
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <Skeleton className="h-7 w-56 rounded-lg" />
        </div>

        {/* Auth Card */}
        <div className="rounded-xl border border-border/50 bg-card/95 shadow-2xl p-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40 rounded-md" />
            <Skeleton className="h-4 w-full rounded-sm" />
          </div>

          <div className="space-y-4">
            {[0, 1].map((field) => (
              <div key={field} className="space-y-2">
                <Skeleton className="h-4 w-20 rounded-sm" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ))}
          </div>

          <Skeleton className="h-10 w-full rounded-md" />

          <div className="flex items-center gap-3">
            <Skeleton className="h-px flex-1" />
            <Skeleton className="h-3 w-16 rounded-sm" />
            <Skeleton className="h-px flex-1" />
          </div>

          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-4 w-52 max-w-full mx-auto rounded-sm" />
        </div>
      </div>
    </div>
  );
}
