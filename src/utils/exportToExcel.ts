import { Task } from "@/types/task";
import * as XLSX from "xlsx";

export interface ExportColumn {
  header: string;
  key: string;
  accessor: (task: Task) => string | number | boolean;
}

export interface ExportTasksOptions {
  filename?: string;
  includeBoardName?: boolean;
  columns?: ExportColumn[];
}

export function formatTaskChecklist(task: Task): string {
  const items = task.checklist || [];
  if (!items || items.length === 0) return "None";
  const completed = items.filter((i) => i.completed).length;
  return `${completed}/${items.length} completed`;
}

export function formatTaskDueDate(dueDate: Date | string | null | undefined): string {
  if (!dueDate) return "";
  try {
    const d = new Date(dueDate);
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export function formatTaskTags(tags: unknown): string {
  if (!tags) return "";
  if (Array.isArray(tags)) {
    return tags
      .map((t) => {
        if (typeof t === "string") return t;
        if (typeof t === "object" && t !== null && "name" in t) return (t as { name: string }).name;
        return String(t);
      })
      .filter(Boolean)
      .join(", ");
  }
  return String(tags);
}

export function getDefaultTaskColumns(includeBoardName = false): ExportColumn[] {
  const cols: ExportColumn[] = [];

  if (includeBoardName) {
    cols.push({
      header: "Board",
      key: "boardName",
      accessor: (t) => t.boardName || "Unknown Board",
    });
  }

  cols.push(
    {
      header: "Title",
      key: "title",
      accessor: (t) => t.title || "Untitled",
    },
    {
      header: "Status",
      key: "status",
      accessor: (t) => t.status || "",
    },
    {
      header: "Priority",
      key: "priority",
      accessor: (t) => t.priority || "none",
    },
    {
      header: "Progress (%)",
      key: "progress",
      accessor: (t) => t.progress ?? 0,
    },
    {
      header: "Assignee",
      key: "assignee",
      accessor: (t) => t.assignee?.fullName || t.assignee?.email || "Unassigned",
    },
    {
      header: "Created By",
      key: "creator",
      accessor: (t) => t.creator?.fullName || t.creator?.email || "Unknown",
    },
    {
      header: "Due Date",
      key: "dueDate",
      accessor: (t) => formatTaskDueDate(t.dueDate),
    },
    {
      header: "Tags",
      key: "tags",
      accessor: (t) => formatTaskTags(t.tags),
    },
    {
      header: "Checklist",
      key: "checklist",
      accessor: (t) => formatTaskChecklist(t),
    },
    {
      header: "Created At",
      key: "createdAt",
      accessor: (t) => (t.createdAt ? formatTaskDueDate(t.createdAt) : ""),
    }
  );

  return cols;
}

/**
 * Escapes values for standard RFC 4180 CSV compliance
 */
export function escapeCSVCell(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Exports an array of tasks into a downloadable CSV formatted with UTF-8 BOM for Microsoft Excel.
 */
export function exportTasksToCSV(tasks: Task[], options: ExportTasksOptions = {}): void {
  const {
    filename = "tasks_export.csv",
    includeBoardName = false,
    columns = getDefaultTaskColumns(includeBoardName),
  } = options;

  // 1. Build Header
  const headers = columns.map((c) => escapeCSVCell(c.header)).join(",");

  // 2. Build Rows
  const rows = tasks.map((task) =>
    columns.map((col) => escapeCSVCell(col.accessor(task))).join(",")
  );

  // 3. UTF-8 BOM (\uFEFF) ensures Excel opens emojis, symbols, and non-ASCII characters cleanly
  const csvContent = "\uFEFF" + [headers, ...rows].join("\r\n");

  // 4. Trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  // Sanitize filename
  const cleanFilename = filename.replace(/[/\\?%*:|"<>]/g, "_");
  const baseFilename = cleanFilename.replace(/\.(xlsx|csv)$/i, "");
  a.download = `${baseFilename}.csv`;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Exports an array of tasks into a downloadable native Microsoft Excel (.xlsx) workbook.
 */
export function exportTasksToExcel(tasks: Task[], options: ExportTasksOptions = {}): void {
  const {
    filename = "tasks_export.xlsx",
    includeBoardName = false,
    columns = getDefaultTaskColumns(includeBoardName),
  } = options;

  // 1. Build Header and Rows
  const headers = columns.map((c) => c.header);
  const rows = tasks.map((task) =>
    columns.map((col) => {
      const val = col.accessor(task);
      return val === null || val === undefined ? "" : val;
    })
  );

  // 2. Build Worksheet
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Compute column widths based on content length
  const colWidths = columns.map((col, colIdx) => {
    let maxLen = col.header.length;
    for (const row of rows) {
      const cellVal = String(row[colIdx] ?? "");
      if (cellVal.length > maxLen) {
        maxLen = Math.min(cellVal.length, 50);
      }
    }
    return { wch: Math.max(maxLen + 2, 10) };
  });
  worksheet["!cols"] = colWidths;

  // 3. Build Workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");

  // 4. Generate binary array buffer and trigger browser download
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  // Sanitize filename
  const cleanFilename = filename.replace(/[/\\?%*:|"<>]/g, "_");
  const baseFilename = cleanFilename.replace(/\.(xlsx|csv)$/i, "");
  a.download = `${baseFilename}.xlsx`;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Universal export function respecting the user's preferred format ('csv' | 'xlsx').
 */
export function exportTasks(
  tasks: Task[],
  format: "csv" | "xlsx" = "csv",
  options: ExportTasksOptions = {}
): void {
  if (format === "xlsx") {
    exportTasksToExcel(tasks, options);
  } else {
    exportTasksToCSV(tasks, options);
  }
}
