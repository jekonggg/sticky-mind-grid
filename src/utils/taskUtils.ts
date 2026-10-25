import { ChecklistItem, Column } from "@/types/task";

export const getProgressColor = (progress: number) => {
  if (progress <= 30) return "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]";
  if (progress <= 70) return "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.4)]";
  return "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]";
};

/**
 * Checks if a column represents a completed/done state.
 */
export function isDoneColumn(statusOrColumnId?: string, columns?: Column[]): boolean {
  if (!statusOrColumnId) return false;
  if (columns && columns.length > 0) {
    const explicitDone = columns.find(
      (c) => c.id !== 'archive' && Boolean((c as unknown as { isDone?: boolean }).isDone)
    );
    if (explicitDone) {
      return (
        explicitDone.id === statusOrColumnId ||
        explicitDone.id.toLowerCase() === statusOrColumnId.toLowerCase().trim()
      );
    }
  }
  const norm = statusOrColumnId.toLowerCase().trim();
  if (
    norm === "done" ||
    norm === "completed" ||
    norm === "complete" ||
    norm === "finished" ||
    norm === "closed" ||
    norm === "resolved"
  ) {
    return true;
  }
  if (columns && columns.length > 0) {
    const visibleCols = columns.filter((c) => c.id !== "archive");
    if (visibleCols.length > 0) {
      const lastCol = visibleCols[visibleCols.length - 1];
      if (lastCol && (lastCol.id === statusOrColumnId || lastCol.id.toLowerCase() === norm)) {
        return true;
      }
      const matched = columns.find(
        (c) => c.id === statusOrColumnId || c.id.toLowerCase() === norm
      );
      if (matched) {
        const titleNorm = matched.title.toLowerCase().trim();
        if (
          titleNorm.includes("done") ||
          titleNorm.includes("complete") ||
          titleNorm.includes("finish") ||
          titleNorm.includes("closed")
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Checks if a column represents an initial/todo/backlog state.
 */
export function isInitialColumn(statusOrColumnId?: string, columns?: Column[]): boolean {
  if (!statusOrColumnId) return false;
  const norm = statusOrColumnId.toLowerCase().trim();
  if (
    norm === "todo" ||
    norm === "to_do" ||
    norm === "to-do" ||
    norm === "backlog" ||
    norm === "new" ||
    norm === "pending" ||
    norm === "icebox" ||
    norm === "draft"
  ) {
    return true;
  }
  if (columns && columns.length > 0) {
    const visibleCols = columns.filter((c) => c.id !== "archive");
    if (
      visibleCols.length > 0 &&
      (visibleCols[0].id === statusOrColumnId || visibleCols[0].id.toLowerCase() === norm)
    ) {
      return true;
    }
    const matched = columns.find(
      (c) => c.id === statusOrColumnId || c.id.toLowerCase() === norm
    );
    if (matched) {
      const titleNorm = matched.title.toLowerCase().trim();
      if (
        titleNorm.includes("todo") ||
        titleNorm.includes("to do") ||
        titleNorm.includes("backlog") ||
        titleNorm.includes("new")
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Computes workflow progress responsive to the board's defined columns.
 * For a board with N visible columns:
 * - Column 0 (e.g. To Do) -> 0%
 * - Column N-1 (e.g. Done) -> 100%
 * - Intermediate column i -> Math.round((i / (N - 1)) * 100)
 */
export function computeColumnProgress(statusOrColumnId?: string, columns?: Column[]): number {
  if (!statusOrColumnId) return 0;
  if (isDoneColumn(statusOrColumnId, columns)) return 100;
  if (isInitialColumn(statusOrColumnId, columns)) return 0;

  if (columns && columns.length > 0) {
    const visibleCols = columns.filter((c) => c.id !== "archive");
    const total = visibleCols.length;
    if (total <= 1) return 0;

    const idx = visibleCols.findIndex(
      (c) => c.id === statusOrColumnId || c.id.toLowerCase() === statusOrColumnId.toLowerCase().trim()
    );

    if (idx === -1) return 0;
    if (idx === 0) return 0;
    if (idx === total - 1) return 100;

    return Math.round((idx / (total - 1)) * 100);
  }

  // Fallback defaults if columns array is not supplied
  const norm = statusOrColumnId.toLowerCase().trim();
  if (norm.includes("progress") || norm.includes("doing")) return 50;
  if (norm.includes("review") || norm.includes("qa") || norm.includes("test")) return 75;

  return 0;
}

/**
 * High-integrity progress computation rule:
 * 1. If task has checklist subtasks: progress is derived directly from completed subtasks (or 100% if moved to Done).
 * 2. If task has no checklist: progress is derived responsively from the column's workflow stage.
 */
export function computeTaskProgress(
  task: { checklist?: ChecklistItem[]; status?: string; progress?: number },
  targetStatus?: string,
  columns?: Column[]
): number {
  const currentStatus = targetStatus || task.status || "todo";
  const checklist = task.checklist || [];

  // When task is explicitly in or moved to a Done column, progress is 100%
  if (isDoneColumn(currentStatus, columns)) {
    return 100;
  }

  // If checklist subtasks exist, subtasks strictly dictate progress
  if (checklist.length > 0) {
    const completedCount = checklist.filter((item) => item.completed).length;
    return Math.round((completedCount / checklist.length) * 100);
  }

  // If no checklist exists, progress is determined by the column pipeline
  return computeColumnProgress(currentStatus, columns);
}

/**
 * Returns detailed progress information and source label for display in UI.
 */
export function getTaskProgressInfo(
  task: { checklist?: ChecklistItem[]; status?: string; progress?: number },
  targetStatus?: string,
  columns?: Column[]
): { progress: number; label: string; mode: "checklist" | "column" | "complete" } {
  const currentStatus = targetStatus || task.status || "todo";
  const checklist = task.checklist || [];
  const isDone = isDoneColumn(currentStatus, columns);

  if (isDone) {
    return {
      progress: 100,
      label: "Completed",
      mode: "complete",
    };
  }

  if (checklist.length > 0) {
    const completedCount = checklist.filter((item) => item.completed).length;
    const pct = Math.round((completedCount / checklist.length) * 100);
    return {
      progress: pct,
      label: `${completedCount}/${checklist.length} subtasks`,
      mode: "checklist",
    };
  }

  const colPct = computeColumnProgress(currentStatus, columns);
  const matchedCol = columns?.find((c) => c.id === currentStatus);
  const colName = matchedCol?.title || currentStatus;

  return {
    progress: colPct,
    label: `Stage: ${colName}`,
    mode: "column",
  };
}
