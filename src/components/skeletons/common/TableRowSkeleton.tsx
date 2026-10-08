import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TableRow, TableCell } from "@/components/ui/table";

interface TableRowSkeletonProps {
  columns?: number;
  showCheckbox?: boolean;
}

export function TableRowSkeleton({ columns = 5, showCheckbox = true }: TableRowSkeletonProps) {
  return (
    <TableRow className="hover:bg-transparent">
      {showCheckbox && (
        <TableCell className="w-10">
          <Skeleton className="h-4 w-4 rounded-sm" />
        </TableCell>
      )}
      <TableCell className="w-[30%]">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-4 w-4 rounded-sm shrink-0" />
          <Skeleton className="h-4 w-3/4 rounded-sm" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-20 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16 rounded-md" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24 rounded-sm" />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
      </TableCell>
    </TableRow>
  );
}
