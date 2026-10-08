import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableRowSkeleton } from "../common/TableRowSkeleton";
import { TaskCardSkeleton } from "../board/TaskCardSkeleton";

interface TasksPageSkeletonProps {
  viewMode?: "list" | "grid";
}

export function TasksPageSkeleton({ viewMode = "list" }: TasksPageSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading tasks"
      className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-300"
    >
      {/* 1. Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-40 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-sm" />
        </div>
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>

      {/* 2. Controls Toolbar (Search, Filter, View Mode) */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Skeleton className="h-9 w-64 rounded-xl" />
          <Skeleton className="h-9 w-40 rounded-xl" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 rounded-xl" />
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
      </div>

      {/* 3. Content: Table or Grid */}
      {viewMode === "list" ? (
        <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-xs">
          <Table className="min-w-[760px] w-full">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-10">
                  <Skeleton className="h-4 w-4 rounded-sm" />
                </TableHead>
                <TableHead className="w-[30%]">
                  <Skeleton className="h-4 w-20 rounded-sm" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-16 rounded-sm" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-16 rounded-sm" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-20 rounded-sm" />
                </TableHead>
                <TableHead className="text-right">
                  <Skeleton className="h-4 w-16 rounded-sm ml-auto" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 6 }).map((_, i) => (
                <TableRowSkeleton key={i} />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <TaskCardSkeleton key={i} />
          ))}
        </div>
      )}
    </div>
  );
}
