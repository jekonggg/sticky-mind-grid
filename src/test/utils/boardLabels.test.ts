import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getBoardLabels,
  saveBoardLabel,
  saveBoardLabels,
  removeBoardLabel,
  deduplicateTags,
  normalizeTagName,
  getBoardLabelsStorageKey,
} from "@/utils/boardLabels";
import { Tag } from "@/types/task";

describe("boardLabels utility", () => {
  const boardId = "test-board-123";

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns empty array when boardId is empty or no labels exist", () => {
    expect(getBoardLabels("")).toEqual([]);
    expect(getBoardLabels(boardId)).toEqual([]);
  });

  it("saves and retrieves board labels from localStorage", () => {
    const tag: Tag = { id: "tag-1", name: "Frontend", color: "#3b82f6" };
    saveBoardLabel(boardId, tag);

    const labels = getBoardLabels(boardId);
    expect(labels).toHaveLength(1);
    expect(labels[0].name).toBe("Frontend");
    expect(labels[0].color).toBe("#3b82f6");
  });

  it("merges task tags with stored labels and deduplicates by normalized name", () => {
    saveBoardLabel(boardId, { id: "tag-1", name: "Bug", color: "#ef4444" });

    const taskTags: Tag[] = [
      { id: "tag-2", name: "bug", color: "#ef4444" }, // duplicate (case variant)
      { id: "tag-3", name: "Feature", color: "#22c55e" },
    ];

    const merged = getBoardLabels(boardId, taskTags);
    expect(merged).toHaveLength(2);
    expect(merged.map((t) => t.name)).toEqual(["Bug", "Feature"]);
  });

  it("avoids adding duplicates when saveBoardLabels is called multiple times", () => {
    saveBoardLabels(boardId, [
      { id: "tag-1", name: "DevOps", color: "#8b5cf6" },
      { id: "tag-2", name: "devops", color: "#8b5cf6" },
    ]);

    const labels = getBoardLabels(boardId);
    expect(labels).toHaveLength(1);
    expect(labels[0].name).toBe("DevOps");
  });

  it("dispatches board:labels-updated event on save", () => {
    const listener = vi.fn();
    window.addEventListener("board:labels-updated", listener);

    saveBoardLabel(boardId, { id: "tag-1", name: "Backend", color: "#10b981" });

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.detail.boardId).toBe(boardId);
    expect(event.detail.labels).toHaveLength(1);
    expect(event.detail.labels[0].name).toBe("Backend");

    window.removeEventListener("board:labels-updated", listener);
  });

  it("removes a label from board pool", () => {
    saveBoardLabels(boardId, [
      { id: "tag-1", name: "Label 1", color: "#ef4444" },
      { id: "tag-2", name: "Label 2", color: "#3b82f6" },
    ]);

    removeBoardLabel(boardId, "tag-1");
    const labels = getBoardLabels(boardId);
    expect(labels).toHaveLength(1);
    expect(labels[0].name).toBe("Label 2");
  });

  it("deduplicateTags cleans duplicate tags in a list", () => {
    const raw: Tag[] = [
      { id: "1", name: "UI", color: "#3b82f6" },
      { id: "2", name: " ui ", color: "#3b82f6" },
      { id: "3", name: "UX", color: "#ec4899" },
    ];

    const cleaned = deduplicateTags(raw);
    expect(cleaned).toHaveLength(2);
    expect(cleaned[0].name).toBe("UI");
    expect(cleaned[1].name).toBe("UX");
  });
});
