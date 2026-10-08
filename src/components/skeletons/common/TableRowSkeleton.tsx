import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TableRow, TableCell } from "@/components/ui/table";

interface TableRowSkeletonProps {
  className?: string;
}

export function TableRowSkeleton({ className }: TableRowSkeletonProps) {
  return (
    <TableRow className="hover:bg-transparent border-border/50">
      {/* 1. Task Column (38% pl-4) */}
      <TableCell className="w-[38%] py-3.5 pl-4">
        <div className="flex items-center gap-3 min-w-0">
          <Skeleton className="h-5 w-5 rounded-md shrink-0" />
          <div className="flex flex-col min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-sm shrink-0" />
              <Skeleton className="h-4 w-3/4 rounded-sm" />
            </div>
            <Skeleton className="h-3 w-1/2 rounded-sm" />
          </div>
        </div>
      </TableCell>

      {/* 2. Board Column (18%) */}
      <TableCell className="w-[18%] py-3.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/40">
          <Skeleton className="h-3.5 w-3.5 rounded-sm shrink-0" />
          <Skeleton className="h-3.5 w-20 rounded-sm" />
        </div>
      </TableCell>

      {/* 3. Priority Column (14%) */}
      <TableCell className="w-[14%] py-3.5">
        <Skeleton className="h-5 w-16 rounded-full" />
      </TableCell>

      {/* 4. Assigned Column (18%) */}
      <TableCell className="w-[18%] py-3.5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full shrink-0" />
          <Skeleton className="h-3.5 w-20 rounded-sm" />
        </div>
      </TableCell>

      {/* 5. Due Date Column (12% pr-4) */}
      <TableCell className="w-[12%] py-3.5 pr-4">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3.5 w-3.5 rounded-sm shrink-0" />
          <Skeleton className="h-3.5 w-16 rounded-sm" />
        </div>
      </TableCell>
    </TableRow>
  );
}
