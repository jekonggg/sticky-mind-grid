import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  escapeCSVCell,
  formatTaskChecklist,
  formatTaskDueDate,
  formatTaskTags,
  getDefaultTaskColumns,
  exportTasksToCSV,
  exportTasksToExcel,
  exportTasks,
} from "@/utils/exportToExcel";
import { Task } from "@/types/task";

describe("exportToExcel utility", () => {
  describe("escapeCSVCell", () => {
    it("wraps string values in quotes", () => {
      expect(escapeCSVCell("Hello")).toBe('"Hello"');
    });

    it("escapes internal quotes with double quotes", () => {
      expect(escapeCSVCell('Task with "quotes"')).toBe('"Task with ""quotes"""');
    });

    it("handles null and undefined gracefully", () => {
      expect(escapeCSVCell(null)).toBe('""');
      expect(escapeCSVCell(undefined)).toBe('""');
    });

    it("handles numbers and booleans", () => {
      expect(escapeCSVCell(42)).toBe('"42"');
      expect(escapeCSVCell(true)).toBe('"true"');
    });
  });

  describe("formatTaskChecklist", () => {
    it("returns 'None' when checklist is empty or undefined", () => {
      expect(formatTaskChecklist({} as Task)).toBe("None");
      expect(formatTaskChecklist({ checklist: [] } as unknown as Task)).toBe("None");
    });

    it("returns completed count over total count", () => {
      const task = {
        checklist: [
          { id: "1", completed: true },
          { id: "2", completed: false },
          { id: "3", completed: true },
        ],
      } as unknown as Task;
      expect(formatTaskChecklist(task)).toBe("2/3 completed");
    });
  });

  describe("formatTaskDueDate", () => {
    it("returns empty string for null or undefined", () => {
      expect(formatTaskDueDate(null)).toBe("");
      expect(formatTaskDueDate(undefined)).toBe("");
    });

    it("returns formatted YYYY-MM-DD date", () => {
      expect(formatTaskDueDate("2026-10-25T14:30:00Z")).toBe("2026-10-25");
    });
  });

  describe("formatTaskTags", () => {
    it("formats array of string tags", () => {
      expect(formatTaskTags(["frontend", "bug", "urgent"])).toBe("frontend, bug, urgent");
    });

    it("formats array of tag objects", () => {
      expect(formatTaskTags([{ name: "design" }, { name: "v2" }])).toBe("design, v2");
    });

    it("returns empty string for null or empty", () => {
      expect(formatTaskTags(null)).toBe("");
      expect(formatTaskTags([])).toBe("");
    });
  });

  describe("getDefaultTaskColumns", () => {
    it("does not include Board column by default", () => {
      const cols = getDefaultTaskColumns(false);
      expect(cols.some((c) => c.header === "Board")).toBe(false);
    });

    it("includes Board column when includeBoardName is true", () => {
      const cols = getDefaultTaskColumns(true);
      expect(cols[0].header).toBe("Board");
    });
  });

  describe("exportTasksToCSV", () => {
    let originalCreateObjectURL: typeof window.URL.createObjectURL;
    let originalRevokeObjectURL: typeof window.URL.revokeObjectURL;

    beforeEach(() => {
      originalCreateObjectURL = window.URL.createObjectURL;
      originalRevokeObjectURL = window.URL.revokeObjectURL;
      window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
      window.URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      window.URL.createObjectURL = originalCreateObjectURL;
      window.URL.revokeObjectURL = originalRevokeObjectURL;
      vi.restoreAllMocks();
    });

    it("generates CSV and triggers download via link click", () => {
      const mockClick = vi.fn();
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
        const el = originalCreateElement(tag);
        if (tag === "a") {
          el.click = mockClick;
        }
        return el;
      });

      const tasks: Task[] = [
        {
          id: "t1",
          boardId: "b1",
          title: "Setup Analytics",
          status: "in-progress",
          priority: "high",
          progress: 50,
          assignee: { id: "u1", email: "alice@test.com", fullName: "Alice Smith" },
          creator: { id: "u2", email: "bob@test.com", fullName: "Bob Jones" },
          dueDate: new Date("2026-10-30T00:00:00Z"),
          tags: ["analytics", "core"],
          checklist: [{ id: "c1", completed: true }, { id: "c2", completed: false }],
          createdAt: new Date("2026-10-01T00:00:00Z"),
          updatedAt: new Date("2026-10-02T00:00:00Z"),
        } as unknown as Task,
      ];

      exportTasksToCSV(tasks, { filename: "marketing_tasks.csv" });

      expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(mockClick).toHaveBeenCalledTimes(1);
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });
  });

  describe("exportTasksToExcel", () => {
    let originalCreateObjectURL: typeof window.URL.createObjectURL;
    let originalRevokeObjectURL: typeof window.URL.revokeObjectURL;

    beforeEach(() => {
      originalCreateObjectURL = window.URL.createObjectURL;
      originalRevokeObjectURL = window.URL.revokeObjectURL;
      window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
      window.URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      window.URL.createObjectURL = originalCreateObjectURL;
      window.URL.revokeObjectURL = originalRevokeObjectURL;
      vi.restoreAllMocks();
    });

    it("generates native Excel workbook (.xlsx) and triggers download via link click", () => {
      let downloadedFilename = "";
      const mockClick = vi.fn();
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
        const el = originalCreateElement(tag);
        if (tag === "a") {
          el.click = mockClick;
          const originalSetAttribute = el.setAttribute.bind(el);
          el.setAttribute = (name, val) => {
            if (name === "download") downloadedFilename = val;
            return originalSetAttribute(name, val);
          };
          Object.defineProperty(el, "download", {
            set: (val) => {
              downloadedFilename = val;
            },
            get: () => downloadedFilename,
          });
        }
        return el;
      });

      const tasks: Task[] = [
        {
          id: "t1",
          boardId: "b1",
          boardName: "Engineering",
          title: "Setup CI/CD",
          status: "in-progress",
          priority: "high",
          progress: 80,
          assignee: { id: "u1", email: "alice@test.com", fullName: "Alice Smith" },
          creator: { id: "u2", email: "bob@test.com", fullName: "Bob Jones" },
          dueDate: new Date("2026-10-30T00:00:00Z"),
          tags: ["devops", "ci"],
          checklist: [{ id: "c1", completed: true }],
          createdAt: new Date("2026-10-01T00:00:00Z"),
          updatedAt: new Date("2026-10-02T00:00:00Z"),
        } as unknown as Task,
      ];

      exportTasksToExcel(tasks, { filename: "engineering_tasks.xlsx", includeBoardName: true });

      expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(mockClick).toHaveBeenCalledTimes(1);
      expect(downloadedFilename).toBe("engineering_tasks.xlsx");
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });
  });

  describe("exportTasks universal dispatcher", () => {
    let originalCreateObjectURL: typeof window.URL.createObjectURL;
    let originalRevokeObjectURL: typeof window.URL.revokeObjectURL;

    beforeEach(() => {
      originalCreateObjectURL = window.URL.createObjectURL;
      originalRevokeObjectURL = window.URL.revokeObjectURL;
      window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
      window.URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      window.URL.createObjectURL = originalCreateObjectURL;
      window.URL.revokeObjectURL = originalRevokeObjectURL;
      vi.restoreAllMocks();
    });

    it("exports as CSV when format is 'csv' or omitted", () => {
      let downloadedFilename = "";
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
        const el = originalCreateElement(tag);
        if (tag === "a") {
          el.click = vi.fn();
          Object.defineProperty(el, "download", {
            set: (val) => { downloadedFilename = val; },
            get: () => downloadedFilename,
          });
        }
        return el;
      });

      const tasks: Task[] = [{ id: "t1", title: "Task 1" } as unknown as Task];

      exportTasks(tasks, "csv", { filename: "export_test" });
      expect(downloadedFilename).toBe("export_test.csv");
    });

    it("exports as XLSX when format is 'xlsx'", () => {
      let downloadedFilename = "";
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
        const el = originalCreateElement(tag);
        if (tag === "a") {
          el.click = vi.fn();
          Object.defineProperty(el, "download", {
            set: (val) => { downloadedFilename = val; },
            get: () => downloadedFilename,
          });
        }
        return el;
      });

      const tasks: Task[] = [{ id: "t1", title: "Task 1" } as unknown as Task];

      exportTasks(tasks, "xlsx", { filename: "export_test" });
      expect(downloadedFilename).toBe("export_test.xlsx");
    });
  });
});
