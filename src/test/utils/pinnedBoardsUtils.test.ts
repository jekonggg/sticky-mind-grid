import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getPinnedBoardIds,
  isBoardPinned,
  togglePinnedBoardId,
  unpinBoardId,
} from "@/utils/pinnedBoardsUtils";

describe("pinnedBoardsUtils", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("returns empty array when no pinned boards are stored", () => {
    expect(getPinnedBoardIds("user-1")).toEqual([]);
    expect(getPinnedBoardIds()).toEqual([]);
  });

  it("pins a board and dispatches pinned_boards_updated event", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    const result = togglePinnedBoardId("board-1", "user-1");

    expect(result).toBe(true);
    expect(getPinnedBoardIds("user-1")).toEqual(["board-1"]);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "pinned_boards_updated",
        detail: { boardId: "board-1", isPinned: true, pinnedIds: ["board-1"] },
      })
    );
  });

  it("unpins a board using togglePinnedBoardId if already pinned", () => {
    togglePinnedBoardId("board-1", "user-1");
    expect(getPinnedBoardIds("user-1")).toEqual(["board-1"]);

    const result = togglePinnedBoardId("board-1", "user-1");
    expect(result).toBe(false);
    expect(getPinnedBoardIds("user-1")).toEqual([]);
  });

  it("unpinBoardId removes a board from pinned boards and fires event", () => {
    togglePinnedBoardId("board-1", "user-1");
    togglePinnedBoardId("board-2", "user-1");
    expect(getPinnedBoardIds("user-1")).toEqual(["board-1", "board-2"]);

    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    const removed = unpinBoardId("board-1", "user-1");

    expect(removed).toBe(true);
    expect(getPinnedBoardIds("user-1")).toEqual(["board-2"]);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "pinned_boards_updated",
        detail: { boardId: "board-1", isPinned: false, pinnedIds: ["board-2"] },
      })
    );
  });

  it("unpinBoardId returns false if the board was not pinned", () => {
    const removed = unpinBoardId("non-existent-board", "user-1");
    expect(removed).toBe(false);
  });

  it("isBoardPinned respects both storage and explicit flag", () => {
    expect(isBoardPinned("b1", "user-1")).toBe(false);
    expect(isBoardPinned("b1", "user-1", true)).toBe(true);

    togglePinnedBoardId("b1", "user-1");
    expect(isBoardPinned("b1", "user-1")).toBe(true);
  });
});
