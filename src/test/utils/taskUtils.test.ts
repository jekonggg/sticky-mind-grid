import { describe, it, expect } from "vitest";
import {
  isDoneColumn,
  isInitialColumn,
  computeColumnProgress,
  computeTaskProgress,
  getTaskProgressInfo,
  getProgressColor,
} from "@/utils/taskUtils";
import { Column } from "@/types/task";

describe("taskUtils progress rules", () => {
  const threeColumns: Column[] = [
    { id: "todo", title: "To Do" },
    { id: "in_progress", title: "In Progress" },
    { id: "done", title: "Done" },
  ];

  const fourColumns: Column[] = [
    { id: "backlog", title: "Backlog" },
    { id: "dev", title: "In Development" },
    { id: "qa", title: "QA Testing" },
    { id: "done", title: "Released" },
  ];

  describe("isDoneColumn & isInitialColumn", () => {
    it("correctly identifies initial and done columns by ID and title", () => {
      expect(isInitialColumn("todo", threeColumns)).toBe(true);
      expect(isInitialColumn("backlog", fourColumns)).toBe(true);
      expect(isInitialColumn("dev", fourColumns)).toBe(false);

      expect(isDoneColumn("done", threeColumns)).toBe(true);
      expect(isDoneColumn("done", fourColumns)).toBe(true);
      expect(isDoneColumn("dev", fourColumns)).toBe(false);
    });
  });

  describe("computeColumnProgress", () => {
    it("computes 0% for first column and 100% for last column", () => {
      expect(computeColumnProgress("todo", threeColumns)).toBe(0);
      expect(computeColumnProgress("done", threeColumns)).toBe(100);

      expect(computeColumnProgress("backlog", fourColumns)).toBe(0);
      expect(computeColumnProgress("done", fourColumns)).toBe(100);
    });

    it("proportionally distributes intermediate column progress responsive to column count", () => {
      // 3 columns: [0%, 50%, 100%]
      expect(computeColumnProgress("in_progress", threeColumns)).toBe(50);

      // 4 columns: [0%, 33%, 67%, 100%]
      expect(computeColumnProgress("dev", fourColumns)).toBe(33);
      expect(computeColumnProgress("qa", fourColumns)).toBe(67);
    });
  });

  describe("computeTaskProgress", () => {
    it("derives progress from checklist subtasks when subtasks exist", () => {
      const task = {
        status: "in_progress",
        checklist: [
          { id: "1", title: "Subtask 1", completed: true },
          { id: "2", title: "Subtask 2", completed: false },
          { id: "3", title: "Subtask 3", completed: false },
          { id: "4", title: "Subtask 4", completed: false },
        ],
      };

      // 1 of 4 completed = 25%
      expect(computeTaskProgress(task, "in_progress", threeColumns)).toBe(25);

      // Even if in "todo", subtask progress is honored
      expect(computeTaskProgress(task, "todo", threeColumns)).toBe(25);
    });

    it("snaps to 100% if moved to a Done column", () => {
      const task = {
        status: "in_progress",
        checklist: [
          { id: "1", title: "Subtask 1", completed: false },
        ],
      };

      expect(computeTaskProgress(task, "done", threeColumns)).toBe(100);
    });

    it("responsively computes column progress when no checklist exists", () => {
      const task = {
        status: "in_progress",
        checklist: [],
      };

      expect(computeTaskProgress(task, "todo", threeColumns)).toBe(0);
      expect(computeTaskProgress(task, "in_progress", threeColumns)).toBe(50);
      expect(computeTaskProgress(task, "done", threeColumns)).toBe(100);

      expect(computeTaskProgress(task, "dev", fourColumns)).toBe(33);
      expect(computeTaskProgress(task, "qa", fourColumns)).toBe(67);
    });
  });

  describe("getTaskProgressInfo", () => {
    it("provides informative labels indicating whether progress comes from checklist or column stage", () => {
      const taskWithChecklist = {
        status: "in_progress",
        checklist: [
          { id: "1", title: "A", completed: true },
          { id: "2", title: "B", completed: true },
          { id: "3", title: "C", completed: false },
        ],
      };

      const infoChecklist = getTaskProgressInfo(taskWithChecklist, "in_progress", threeColumns);
      expect(infoChecklist.progress).toBe(67);
      expect(infoChecklist.label).toBe("2/3 subtasks");
      expect(infoChecklist.mode).toBe("checklist");

      const taskNoChecklist = {
        status: "in_progress",
        checklist: [],
      };

      const infoColumn = getTaskProgressInfo(taskNoChecklist, "in_progress", threeColumns);
      expect(infoColumn.progress).toBe(50);
      expect(infoColumn.label).toBe("Stage: In Progress");
      expect(infoColumn.mode).toBe("column");

      const infoDone = getTaskProgressInfo(taskNoChecklist, "done", threeColumns);
      expect(infoDone.progress).toBe(100);
      expect(infoDone.label).toBe("Completed");
      expect(infoDone.mode).toBe("complete");
    });
  });

  describe("getProgressColor", () => {
    it("returns correct color classes based on progress thresholds", () => {
      expect(getProgressColor(20)).toContain("bg-orange-500");
      expect(getProgressColor(50)).toContain("bg-amber-400");
      expect(getProgressColor(80)).toContain("bg-emerald-500");
    });
  });
});
