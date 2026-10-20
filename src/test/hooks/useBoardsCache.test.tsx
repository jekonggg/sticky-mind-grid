import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import React, { ReactNode } from "react";
import { useBoards, clearBoardsCache } from "@/hooks/useBoards";
import { boardApi } from "@/services/boardApi";
import { AuthContext, AuthContextType } from "@/contexts/AuthContext";
import { ActivityProvider } from "@/hooks/useActivity";
import { Board } from "@/types/board";
import { User } from "@/types/user";
import { togglePinnedBoardId, getPinnedBoardIds } from "@/utils/pinnedBoardsUtils";

vi.mock("@/services/boardApi", () => ({
  boardApi: {
    getBoards: vi.fn(),
    getTrashedBoards: vi.fn(),
    createBoard: vi.fn(),
    updateBoard: vi.fn(),
    deleteBoard: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockUser: User = {
  id: "user-cache-1",
  email: "cacheuser@example.com",
  fullName: "Cache User",
  createdAt: new Date().toISOString(),
};

const mockBoardList: Board[] = [
  {
    id: "board-c1",
    name: "Engineering Sprint",
    columns: [],
    ownerId: "user-cache-1",
    role: "owner",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

function createWrapper(user: User | null = mockUser) {
  const authValue: AuthContextType = {
    user,
    token: user ? "mock-token" : null,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
  };

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider value={authValue}>
        <ActivityProvider>{children}</ActivityProvider>
      </AuthContext.Provider>
    );
  };
}

describe("useBoards In-Memory Caching (Stale-While-Revalidate)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearBoardsCache();
    vi.mocked(boardApi.getBoards).mockResolvedValue(mockBoardList);
    vi.mocked(boardApi.getTrashedBoards).mockResolvedValue([]);
  });

  afterEach(() => {
    clearBoardsCache();
  });

  it("cold start: starts with loading=true, fetches boards, and populates cache", async () => {
    const { result } = renderHook(() => useBoards(), {
      wrapper: createWrapper(mockUser),
    });

    // Cold start should indicate initial loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.boards).toHaveLength(1);
      expect(result.current.boards[0].id).toBe("board-c1");
    });

    expect(boardApi.getBoards).toHaveBeenCalledTimes(1);
  });

  it("return navigation: second mount immediately renders cached data with loading=false (no skeleton)", async () => {
    // 1st visit
    const firstRender = renderHook(() => useBoards(), {
      wrapper: createWrapper(mockUser),
    });

    await waitFor(() => {
      expect(firstRender.result.current.loading).toBe(false);
    });

    // Unmount (simulating navigating to another route like /dashboard or /tasks)
    firstRender.unmount();

    // 2nd visit (simulating navigating back to /)
    const secondRender = renderHook(() => useBoards(), {
      wrapper: createWrapper(mockUser),
    });

    // Must be instantly available without skeleton loading state
    expect(secondRender.result.current.loading).toBe(false);
    expect(secondRender.result.current.boards).toHaveLength(1);
    expect(secondRender.result.current.boards[0].name).toBe("Engineering Sprint");
  });

  it("invalidates cache when a different user logs in", async () => {
    // Load as User 1
    const user1Render = renderHook(() => useBoards(), {
      wrapper: createWrapper(mockUser),
    });

    await waitFor(() => {
      expect(user1Render.result.current.loading).toBe(false);
    });

    user1Render.unmount();

    // Now mount as User 2
    const otherUser: User = {
      id: "user-cache-2",
      email: "user2@example.com",
      fullName: "Other User",
      createdAt: new Date().toISOString(),
    };

    const user2Render = renderHook(() => useBoards(), {
      wrapper: createWrapper(otherUser),
    });

    // Because user switched, cached data from User 1 must NOT be used
    expect(user2Render.result.current.loading).toBe(true);

    await waitFor(() => {
      expect(user2Render.result.current.loading).toBe(false);
    });
  });

  it("clearBoardsCache resets the cached data", async () => {
    const firstRender = renderHook(() => useBoards(), {
      wrapper: createWrapper(mockUser),
    });

    await waitFor(() => {
      expect(firstRender.result.current.loading).toBe(false);
    });

    firstRender.unmount();

    // Manually clear cache
    clearBoardsCache();

    // Remount
    const secondRender = renderHook(() => useBoards(), {
      wrapper: createWrapper(mockUser),
    });

    // Should start fresh with loading=true
    expect(secondRender.result.current.loading).toBe(true);

    await waitFor(() => {
      expect(secondRender.result.current.loading).toBe(false);
    });
  });

  it("softDeleteBoard unpins the board, updates trashed state, and prevents resurrecting via background fetch", async () => {
    // Pin board-c1 first
    togglePinnedBoardId("board-c1", mockUser.id);
    expect(getPinnedBoardIds(mockUser.id)).toEqual(["board-c1"]);

    const { result } = renderHook(() => useBoards(), {
      wrapper: createWrapper(mockUser),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.boards).toHaveLength(1);
    });

    // Execute soft delete
    await act(async () => {
      await result.current.softDeleteBoard("board-c1");
    });

    // Board must be removed from active boards and added to trashedBoards
    expect(result.current.boards).toHaveLength(0);
    expect(result.current.trashedBoards).toHaveLength(1);
    expect(result.current.trashedBoards[0].id).toBe("board-c1");

    // Board must be automatically unpinned from storage
    expect(getPinnedBoardIds(mockUser.id)).toEqual([]);

    // Even if background fetch returns old list, deleted board must NOT be resurrected
    vi.mocked(boardApi.getBoards).mockResolvedValueOnce(mockBoardList);
    await act(async () => {
      await result.current.refreshBoards({ silent: true });
    });

    expect(result.current.boards).toHaveLength(0);
  });

  it("permanentlyDeleteBoard unpins the board from storage", async () => {
    togglePinnedBoardId("board-c1", mockUser.id);
    expect(getPinnedBoardIds(mockUser.id)).toEqual(["board-c1"]);

    const { result } = renderHook(() => useBoards(), {
      wrapper: createWrapper(mockUser),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.permanentlyDeleteBoard("board-c1", "Engineering Sprint");
    });

    expect(getPinnedBoardIds(mockUser.id)).toEqual([]);
    expect(result.current.boards).toHaveLength(0);
  });
});
