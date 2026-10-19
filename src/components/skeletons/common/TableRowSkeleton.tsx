import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TableRow, TableCell } from "@/components/ui/table";

interface TableRowSkeletonProps {
  className?: string;
}

export function TableRowSkeleton({ className }: TableRowSkeletonProps) {
  return (
    <TableRow className={`hover:bg-transparent border-border/50 ${className || ""}`}>
      {/* 1. Task Column (24% pl-4) */}
      <TableCell className="w-[24%] py-3.5 pl-4">
        <div className="flex items-center gap-3 min-w-0">
          <Skeleton className="h-5 w-5 rounded-md shrink-0" />
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Skeleton className="h-4 w-4 rounded-sm shrink-0" />
            <Skeleton className="h-4 w-3/4 rounded-sm" />
          </div>
        </div>
      </TableCell>

      {/* 2. Description Column (26%) */}
      <TableCell className="w-[26%] py-3.5">
        <Skeleton className="h-3.5 w-4/5 rounded-sm" />
      </TableCell>

      {/* 3. Board Column (14%) */}
      <TableCell className="w-[14%] py-3.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/40">
          <Skeleton className="h-3.5 w-3.5 rounded-sm shrink-0" />
          <Skeleton className="h-3.5 w-20 rounded-sm" />
        </div>
      </TableCell>

      {/* 4. Priority Column (10%) */}
      <TableCell className="w-[10%] py-3.5">
        <Skeleton className="h-5 w-16 rounded-full" />
      </TableCell>

      {/* 5. Assigned Column (14%) */}
      <TableCell className="w-[14%] py-3.5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full shrink-0" />
          <Skeleton className="h-3.5 w-20 rounded-sm" />
        </div>
      </TableCell>

      {/* 6. Due Date Column (12% pr-4) */}
      <TableCell className="w-[12%] py-3.5 pr-4">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3.5 w-3.5 rounded-sm shrink-0" />
          <Skeleton className="h-3.5 w-16 rounded-sm" />
        </div>
      </TableCell>
    </TableRow>
  );
}
