import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";
import { useTasks, tasksCache, clearTasksCache } from "@/hooks/useTasks";
import { taskApi } from "@/services/api";

vi.mock("@/services/api", () => ({
  taskApi: {
    getTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  },
}));

vi.mock("@/hooks/useActivity", () => ({
  useActivity: () => ({
    addActivity: vi.fn(),
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  AuthContext: {
    Consumer: ({ children }: any) => children({ user: { id: "user-1" } }),
    Provider: ({ children }: any) => children,
  },
}));

describe("Board Navigation & State Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTasksCache();
  });

  it("resets tasks and sets loading=true immediately when boardId changes to an uncached board", async () => {
    // Prime cache for board-1
    const board1Tasks = [
      { id: "t1", title: "Task 1", status: "todo", boardId: "board-1", checklist: [], tags: [], attachments: [], createdAt: new Date(), updatedAt: new Date() },
    ];
    (taskApi.getTasks as any).mockImplementation((boardId: string) => {
      if (boardId === "board-1") return Promise.resolve(board1Tasks);
      return new Promise(() => {}); // board-2 never resolves immediately
    });

    const { result, rerender } = renderHook(
      ({ boardId }) => useTasks(boardId),
      { initialProps: { boardId: "board-1" } }
    );

    // Let board-1 load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.tasks).toHaveLength(1);
    });

    // Now switch to board-2 (uncached)
    rerender({ boardId: "board-2" });

    // Stale tasks from board-1 MUST NOT leak to board-2; loading must immediately be true
    expect(result.current.tasks).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it("discards out-of-order task responses when quickly switching boards", async () => {
    let resolveBoard1: (val: any) => void;
    let resolveBoard2: (val: any) => void;

    (taskApi.getTasks as any).mockImplementation((boardId: string) => {
      if (boardId === "board-1") {
        return new Promise((res) => {
          resolveBoard1 = res;
        });
      }
      if (boardId === "board-2") {
        return new Promise((res) => {
          resolveBoard2 = res;
        });
      }
      return Promise.resolve([]);
    });

    const { result, rerender } = renderHook(
      ({ boardId }) => useTasks(boardId),
      { initialProps: { boardId: "board-1" } }
    );

    expect(result.current.loading).toBe(true);

    // Switch rapidly to board-2 before board-1 resolves
    rerender({ boardId: "board-2" });

    // Now resolve board-2 first with board-2 tasks
    const board2Tasks = [
      { id: "t2", title: "Board 2 Task", status: "todo", boardId: "board-2", checklist: [], tags: [], attachments: [], createdAt: new Date(), updatedAt: new Date() },
    ];
    await act(async () => {
      resolveBoard2(board2Tasks);
    });

    await waitFor(() => {
      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0].id).toBe("t2");
    });

    // Now late response from board-1 arrives
    const staleBoard1Tasks = [
      { id: "t1-late", title: "Late Task", status: "todo", boardId: "board-1", checklist: [], tags: [], attachments: [], createdAt: new Date(), updatedAt: new Date() },
    ];
    await act(async () => {
      resolveBoard1(staleBoard1Tasks);
    });

    // Stale response must be discarded; tasks must remain board-2's tasks
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].id).toBe("t2");
  });
});
