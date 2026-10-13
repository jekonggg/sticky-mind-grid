import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBoardRealtime } from "@/hooks/useBoardRealtime";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user-1" }, token: "mock-token" }),
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

  emitMessage(data: any) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  emitOpen() {
    if (this.onopen) {
      this.onopen();
    }
  }
}

describe("useBoardRealtime SSE Event Handling", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    MockEventSource.instances = [];
    (global as any).EventSource = MockEventSource;
    queryClient = new QueryClient();
    vi.spyOn(queryClient, "invalidateQueries");
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("handles comment:* events by invalidating taskComments queries and invoking onCommentChange", () => {
    const onCommentChange = vi.fn();
    renderHook(
      () =>
        useBoardRealtime({
          boardId: "board-1",
          onCommentChange,
        }),
      { wrapper }
    );

    const es = MockEventSource.instances[0];
    expect(es).toBeDefined();

    act(() => {
      es.emitMessage({
        type: "comment:created",
        boardId: "board-1",
        data: { id: "c1", taskId: "task-100", content: "New comment" },
      });
    });

    expect(onCommentChange).toHaveBeenCalledWith({
      id: "c1",
      taskId: "task-100",
      content: "New comment",
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["taskComments", "task-100"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["taskComments"],
    });
  });

  it("handles note:* events by invalidating boardNotes and notes queries and invoking onNoteChange", () => {
    const onNoteChange = vi.fn();
    renderHook(
      () =>
        useBoardRealtime({
          boardId: "board-1",
          onNoteChange,
        }),
      { wrapper }
    );

    const es = MockEventSource.instances[0];

    act(() => {
      es.emitMessage({
        type: "note:created",
        boardId: "board-1",
        data: { id: "n1", title: "Meeting Note" },
      });
    });

    expect(onNoteChange).toHaveBeenCalledWith({ id: "n1", title: "Meeting Note" });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["boardNotes", "board-1"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["notes", "board-1"],
    });
  });

  it("handles trash:emptied by invalidating trashTasks and invoking onTrashEmptied", () => {
    const onTrashEmptied = vi.fn();
    renderHook(
      () =>
        useBoardRealtime({
          boardId: "board-1",
          onTrashEmptied,
        }),
      { wrapper }
    );

    const es = MockEventSource.instances[0];

    act(() => {
      es.emitMessage({
        type: "trash:emptied",
        boardId: "board-1",
        data: { count: 5 },
      });
    });

    expect(onTrashEmptied).toHaveBeenCalledWith({ count: 5 });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["trashTasks", "board-1"],
    });
  });

  it("handles member:invited and member:invite_resent by invalidating boardMembers and pendingInvitations", () => {
    const onMemberChange = vi.fn();
    renderHook(
      () =>
        useBoardRealtime({
          boardId: "board-1",
          onMemberChange,
        }),
      { wrapper }
    );

    const es = MockEventSource.instances[0];

    act(() => {
      es.emitMessage({
        type: "member:invited",
        boardId: "board-1",
        data: { email: "new@example.com", role: "editor" },
      });
    });

    expect(onMemberChange).toHaveBeenCalledWith({
      email: "new@example.com",
      role: "editor",
      eventType: "member:invited",
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["boardMembers", "board-1"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["pendingInvitations"],
    });
  });
});
