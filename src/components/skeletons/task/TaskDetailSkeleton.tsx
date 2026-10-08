import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskCommentsSkeleton } from "./TaskCommentsSkeleton";

export function TaskDetailSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading task details"
      className="min-h-screen bg-background text-foreground flex flex-col"
    >
      {/* 1. Header Toolbar */}
      <div className="border-b border-border/60 bg-card/60 backdrop-blur-md px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-xl" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24 rounded-sm" />
            <span className="text-muted-foreground/40">/</span>
            <Skeleton className="h-4 w-36 rounded-sm" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-xl" />
          <Skeleton className="h-8 w-8 rounded-xl" />
          <Skeleton className="h-8 w-8 rounded-xl" />
        </div>
      </div>

      {/* 2. Workspace Body (2-Column Split) */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Primary Content (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Title and Emoji */}
          <div className="flex items-start gap-4">
            <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-8 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-1/3 rounded-sm" />
            </div>
          </div>

          {/* Description Card */}
          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28 rounded-sm" />
              <Skeleton className="h-6 w-16 rounded-md" />
            </div>
            <Skeleton className="h-3.5 w-full rounded-sm" />
            <Skeleton className="h-3.5 w-5/6 rounded-sm" />
            <Skeleton className="h-3.5 w-2/3 rounded-sm" />
          </div>

          {/* Checklist Block */}
          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded-sm" />
              <Skeleton className="h-4 w-12 rounded-sm" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="space-y-2 pt-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-muted/20">
                  <Skeleton className="h-4 w-4 rounded-sm shrink-0" />
                  <Skeleton className="h-3.5 w-3/5 rounded-sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Attachments Block */}
          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28 rounded-sm" />
              <Skeleton className="h-7 w-20 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Skeleton className="h-18 rounded-xl" />
              <Skeleton className="h-18 rounded-xl" />
            </div>
          </div>

          {/* Discussion / Comments */}
          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <Skeleton className="h-4 w-32 rounded-sm" />
            </div>
            <TaskCommentsSkeleton count={2} />
          </div>
        </div>

        {/* Right Column: Metadata Sidebar (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
            <Skeleton className="h-4 w-24 rounded-sm pb-1 border-b border-border/40" />

            {/* Status */}
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-14 rounded-sm" />
              <Skeleton className="h-9 w-full rounded-xl" />
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16 rounded-sm" />
              <Skeleton className="h-9 w-full rounded-xl" />
            </div>

            {/* Assignee */}
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-18 rounded-sm" />
              <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/30">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-3.5 w-28 rounded-sm" />
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16 rounded-sm" />
              <Skeleton className="h-9 w-full rounded-xl" />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-12 rounded-sm" />
              <div className="flex flex-wrap gap-1.5">
                <Skeleton className="h-6 w-14 rounded-md" />
                <Skeleton className="h-6 w-16 rounded-md" />
                <Skeleton className="h-6 w-12 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
