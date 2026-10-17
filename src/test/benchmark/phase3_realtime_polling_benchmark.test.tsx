import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTasks, clearTasksCache } from "@/hooks/useTasks";
import { useActivity, ActivityProvider } from "@/hooks/useActivity";
import {
  useBoardRealtime,
  isBoardRealtimeConnected,
  clearBoardRealtimeStatus,
} from "@/hooks/useBoardRealtime";
import { taskApi } from "@/services/api";
import { authenticatedFetch } from "@/services/apiUtils";

vi.mock("@/services/api", () => ({
  taskApi: {
    getTasks: vi.fn().mockResolvedValue([]),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  },
  boardApi: {
    getBoards: vi.fn().mockResolvedValue([]),
    getBoard: vi.fn().mockResolvedValue({ id: "bench-board-1", columns: [] }),
    getMembers: vi.fn().mockResolvedValue([]),
    getPendingInvitations: vi.fn().mockResolvedValue([]),
    getSentInvitations: vi.fn().mockResolvedValue([]),
  },
  userApi: {
    getTeammates: vi.fn().mockResolvedValue([]),
  },
  notificationApi: {
    getNotifications: vi.fn().mockResolvedValue({ notifications: [], unreadCount: 0 }),
  },
  messageApi: {
    getConversations: vi.fn().mockResolvedValue([]),
    getUnreadCount: vi.fn().mockResolvedValue({ unreadCount: 0 }),
  },
}));

vi.mock("@/services/apiUtils", () => ({
  authenticatedFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [],
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  AuthContext: React.createContext({
    user: { id: "bench-user-1", email: "user@test.com" },
    token: "mock-token",
  }),
  useAuth: () => ({
    user: { id: "bench-user-1", email: "user@test.com" },
    token: "mock-token",
  }),
}));

vi.mock("@/contexts/DevModeContext", () => ({
  useDevMode: () => ({ devSettings: {} }),
}));

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close = vi.fn();

  emitOpen() {
    if (this.onopen) this.onopen();
  }

  emitMessage(data: any) {
    if (this.onmessage) this.onmessage({ data: JSON.stringify(data) });
  }
}

describe("Phase 3 Performance Benchmark: Background Polling & SSE Real-time Stream Consolidation", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    clearTasksCache();
    clearBoardRealtimeStatus();
    MockEventSource.instances = [];
    (global as any).EventSource = MockEventSource;
    vi.useFakeTimers();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchIntervalInBackground: false,
        },
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    clearTasksCache();
    clearBoardRealtimeStatus();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ActivityProvider>{children}</ActivityProvider>
    </QueryClientProvider>
  );

  it("Benchmark 1: useTasks suppresses periodic polling while real-time SSE stream is connected", async () => {
    const boardId = "bench-board-1";

    // 1. Mount useBoardRealtime to open SSE connection
    const realtimeHook = renderHook(() => useBoardRealtime({ boardId }), { wrapper });
    expect(isBoardRealtimeConnected(boardId)).toBe(false);

    // Simulate SSE connection established
    const es = MockEventSource.instances[0];
    expect(es).toBeDefined();
    act(() => {
      es.emitOpen();
    });
    expect(isBoardRealtimeConnected(boardId)).toBe(true);

    // 2. Mount useTasks for this board
    renderHook(() => useTasks(boardId), { wrapper });
    // Initial fetch on mount
    expect(taskApi.getTasks).toHaveBeenCalledTimes(1);

    // 3. Fast-forward timer by 30 seconds (previously would have polled 7+ times)
    await act(async () => {
      vi.advanceTimersByTime(30000);
      await Promise.resolve();
    });

    // Zero additional HTTP polling calls while SSE is connected!
    expect(taskApi.getTasks).toHaveBeenCalledTimes(1);

    realtimeHook.unmount();
    expect(isBoardRealtimeConnected(boardId)).toBe(false);
  });

  it("Benchmark 2: useActivity suppresses periodic polling while real-time SSE stream is connected", async () => {
    const boardId = "bench-board-2";

    // 1. Mount useBoardRealtime
    const realtimeHook = renderHook(() => useBoardRealtime({ boardId }), { wrapper });
    const es = MockEventSource.instances[0];
    act(() => {
      es.emitOpen();
    });
    expect(isBoardRealtimeConnected(boardId)).toBe(true);

    // 2. Mount useActivity
    const activityHook = renderHook(() => useActivity(), { wrapper });
    act(() => {
      activityHook.result.current.setBoardId(boardId);
    });

    // Reset calls recorded during initial mount
    vi.mocked(authenticatedFetch).mockClear();

    // 3. Fast-forward timer by 40 seconds (previously would have polled 8 times at 5s interval)
    await act(async () => {
      vi.advanceTimersByTime(40000);
      await Promise.resolve();
    });

    // Zero background polling calls while SSE is actively handling activity events!
    expect(authenticatedFetch).toHaveBeenCalledTimes(0);

    realtimeHook.unmount();
  });

  it("Benchmark 3: useTasks resumes fallback polling at 15s intervals when SSE is disconnected", async () => {
    const boardId = "bench-board-3";
    expect(isBoardRealtimeConnected(boardId)).toBe(false);

    // Mount useTasks without SSE
    renderHook(() => useTasks(boardId), { wrapper });
    expect(taskApi.getTasks).toHaveBeenCalledTimes(1);

    // Advance 14s - should not have polled yet (15s interval)
    await act(async () => {
      vi.advanceTimersByTime(14000);
      await Promise.resolve();
    });
    expect(taskApi.getTasks).toHaveBeenCalledTimes(1);

    // Advance past 15s - fallback polling executes once
    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });
    expect(taskApi.getTasks).toHaveBeenCalledTimes(2);
  });
});
