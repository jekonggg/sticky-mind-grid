import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import React, { ReactNode } from "react";
import { useTasks, clearTasksCache } from "@/hooks/useTasks";
import { taskApi } from "@/services/api";
import { AuthContext, AuthContextType } from "@/contexts/AuthContext";
import { ActivityProvider } from "@/hooks/useActivity";
import { Task } from "@/types/task";
import { User } from "@/types/user";

vi.mock("@/services/api", () => ({
  taskApi: {
    getTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    reorderTasks: vi.fn(),
  },
}));

const mockUser: User = {
  id: "user-cache-1",
  email: "cacheuser@example.com",
  fullName: "Cache User",
  createdAt: new Date().toISOString(),
};

const mockTaskList: Task[] = [
  {
    id: "task-c1",
    boardId: "board-c1",
    title: "Implement Caching",
    status: "in_progress",
    priority: "high",
    progress: 75,
    tags: [],
    checklist: [],
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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

describe("useTasks In-Memory Caching (Stale-While-Revalidate)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTasksCache();
    vi.mocked(taskApi.getTasks).mockResolvedValue(mockTaskList);
  });

  afterEach(() => {
    clearTasksCache();
  });

  it("cold start: starts with loading=true, fetches tasks, and caches them", async () => {
    const { result } = renderHook(() => useTasks("board-c1"), {
      wrapper: createWrapper(mockUser),
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0].id).toBe("task-c1");
    });

    expect(taskApi.getTasks).toHaveBeenCalledWith("board-c1");
  });

  it("return navigation: second mount immediately renders cached tasks with loading=false", async () => {
    const firstRender = renderHook(() => useTasks("board-c1"), {
      wrapper: createWrapper(mockUser),
    });

    await waitFor(() => {
      expect(firstRender.result.current.loading).toBe(false);
    });

    firstRender.unmount();

    // 2nd mount (user returns to the board)
    const secondRender = renderHook(() => useTasks("board-c1"), {
      wrapper: createWrapper(mockUser),
    });

    // Instant data availability - no skeleton flash
    expect(secondRender.result.current.loading).toBe(false);
    expect(secondRender.result.current.tasks).toHaveLength(1);
    expect(secondRender.result.current.tasks[0].title).toBe("Implement Caching");
  });

  it("clearTasksCache resets the per-board cached tasks", async () => {
    const firstRender = renderHook(() => useTasks("board-c1"), {
      wrapper: createWrapper(mockUser),
    });

    await waitFor(() => {
      expect(firstRender.result.current.loading).toBe(false);
    });

    firstRender.unmount();

    clearTasksCache("board-c1");

    const secondRender = renderHook(() => useTasks("board-c1"), {
      wrapper: createWrapper(mockUser),
    });

    expect(secondRender.result.current.loading).toBe(true);

    await waitFor(() => {
      expect(secondRender.result.current.loading).toBe(false);
    });
  });
});
