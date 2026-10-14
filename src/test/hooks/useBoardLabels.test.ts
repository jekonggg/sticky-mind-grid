import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBoardLabels } from "@/hooks/useBoardLabels";
import { Tag, Task } from "@/types/task";

describe("useBoardLabels hook", () => {
  const boardId = "board-abc";

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("seeds board labels from existing board tasks", () => {
    const mockTasks = [
      {
        id: "task-1",
        boardId,
        title: "Task 1",
        status: "todo",
        priority: "medium",
        progress: 0,
        attachments: [],
        tags: [{ id: "tag-1", name: "Urgent", color: "#ef4444" }],
      } as unknown as Task,
      {
        id: "task-2",
        boardId,
        title: "Task 2",
        status: "todo",
        priority: "medium",
        progress: 0,
        attachments: [],
        tags: [{ id: "tag-2", name: "urgent", color: "#ef4444" }], // duplicate name
      } as unknown as Task,
    ];

    const { result } = renderHook(() => useBoardLabels(boardId, mockTasks));
    expect(result.current.boardLabels).toHaveLength(1);
    expect(result.current.boardLabels[0].name).toBe("Urgent");
  });

  it("adds new labels and updates state across components", () => {
    const { result } = renderHook(() => useBoardLabels(boardId));
    expect(result.current.boardLabels).toHaveLength(0);

    act(() => {
      result.current.addLabel({ id: "tag-new", name: "Security", color: "#a855f7" });
    });

    expect(result.current.boardLabels).toHaveLength(1);
    expect(result.current.boardLabels[0].name).toBe("Security");
  });

  it("removes labels from board pool", () => {
    const { result } = renderHook(() => useBoardLabels(boardId));

    act(() => {
      result.current.addLabel({ id: "tag-1", name: "Frontend", color: "#3b82f6" });
      result.current.addLabel({ id: "tag-2", name: "Backend", color: "#10b981" });
    });

    expect(result.current.boardLabels).toHaveLength(2);

    act(() => {
      result.current.removeLabel("Frontend");
    });

    expect(result.current.boardLabels).toHaveLength(1);
    expect(result.current.boardLabels[0].name).toBe("Backend");
  });
});
