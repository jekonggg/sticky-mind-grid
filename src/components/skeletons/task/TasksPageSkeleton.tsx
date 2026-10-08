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
    <main
      role="status"
      aria-label="Loading tasks"
      className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 space-y-6 animate-in fade-in duration-300"
    >
      {/* 1. Header Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
            <Skeleton className="h-8 w-48 rounded-lg" />
          </div>
          <Skeleton className="h-3.5 w-72 max-w-full rounded-sm" />
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* 2. Tab Filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-xl" />
        ))}
      </div>

      {/* 3. Search & Select Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-card p-3.5 rounded-2xl border border-border/60 shadow-xs">
        <Skeleton className="h-9 flex-1 min-w-[200px] rounded-xl" />
        <Skeleton className="h-9 w-[160px] rounded-xl" />
        <Skeleton className="h-9 w-[130px] rounded-xl" />
        <Skeleton className="h-9 w-[140px] rounded-xl" />
      </div>

      {/* 4. Content: Table or Grid */}
      {viewMode === "list" ? (
        <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-xs">
          <Table className="min-w-[760px] w-full">
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border/50">
                <TableHead className="w-[38%] py-3.5 pl-4 font-bold text-[11px] tracking-wider uppercase text-muted-foreground">
                  Task
                </TableHead>
                <TableHead className="w-[18%] py-3.5 font-bold text-[11px] tracking-wider uppercase text-muted-foreground">
                  Board
                </TableHead>
                <TableHead className="w-[14%] py-3.5 font-bold text-[11px] tracking-wider uppercase text-muted-foreground">
                  Priority
                </TableHead>
                <TableHead className="w-[18%] py-3.5 font-bold text-[11px] tracking-wider uppercase text-muted-foreground">
                  Assigned
                </TableHead>
                <TableHead className="w-[12%] py-3.5 pr-4 font-bold text-[11px] tracking-wider uppercase text-muted-foreground">
                  Due Date
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
    </main>
  );
}
