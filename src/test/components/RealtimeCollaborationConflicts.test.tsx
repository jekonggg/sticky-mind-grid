import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { TaskDetailWorkspace } from "@/components/task/TaskDetailWorkspace";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { TaskCard } from "@/components/kanban/TaskCard";
import { boardApi } from "@/services/boardApi";
import { Task } from "@/types/task";
import { Board } from "@/types/board";
import { toast } from "sonner";

const mockNavigate = vi.fn();
let latestRealtimeCallbacks: any = null;
let mockRealtimeState = { isConnected: true, isReconnecting: false };

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ boardId: "board-1", taskId: "task-1" }),
    useNavigate: () => mockNavigate,
  };
});

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/services/boardApi", () => ({
  boardApi: {
    getBoard: vi.fn(),
    getBoards: vi.fn().mockResolvedValue([]),
    getMembers: vi.fn().mockResolvedValue([]),
    updateBoard: vi.fn(),
  },
}));

vi.mock("@/services/notificationApi", () => ({
  notificationApi: {
    getNotifications: vi.fn().mockResolvedValue({ notifications: [], unreadCount: 0 }),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}));

const mockFetchTasks = vi.fn();
const mockSetTasks = vi.fn();
const mockUpdateTask = vi.fn();
const mockReorderTasks = vi.fn();

const initialTasks: Task[] = [
  {
    id: "task-1",
    boardId: "board-1",
    title: "Critical API Integration",
    emoji: "⚡",
    description: "Initial shared description.",
    status: "todo",
    priority: "high",
    progress: 30,
    tags: [],
    checklist: [],
    attachments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

vi.mock("@/hooks/useTasks", () => ({
  useTasks: () => ({
    loading: false,
    tasks: initialTasks,
    setTasks: mockSetTasks,
    columns: [
      { id: "todo", title: "To Do", color: "#3b82f6" },
      { id: "in-progress", title: "In Progress", color: "#eab308" },
      { id: "done", title: "Done", color: "#22c55e" },
    ],
    addTask: vi.fn(),
    updateTask: mockUpdateTask,
    reorderTasks: mockReorderTasks,
    deleteTask: vi.fn(),
    fetchTasks: mockFetchTasks,
    getTasksByStatus: (status: string) => initialTasks.filter((t) => t.status === status),
  }),
}));

vi.mock("@/hooks/useBoardRealtime", () => ({
  useBoardRealtime: (options: any) => {
    latestRealtimeCallbacks = options;
    return mockRealtimeState;
  },
}));

const mockBoard: Board = {
  id: "board-1",
  name: "Realtime Collaboration Board",
  ownerId: "owner-999",
  role: "editor",
  color: "hsl(220, 80%, 56%)",
  columns: [
    { id: "todo", title: "To Do", color: "#3b82f6" },
    { id: "in-progress", title: "In Progress", color: "#eab308" },
    { id: "done", title: "Done", color: "#22c55e" },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Realtime Collaboration Conflicts & Edge Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestRealtimeCallbacks = null;
    mockRealtimeState = { isConnected: true, isReconnecting: false };
    vi.mocked(boardApi.getBoard).mockResolvedValue(mockBoard);
    vi.mocked(boardApi.getMembers).mockResolvedValue([
      {
        id: "m-1",
        boardId: "board-1",
        userId: mockUser.id,
        role: "editor",
        status: "accepted",
        joinedAt: new Date().toISOString(),
        user: mockUser,
      },
    ]);
  });

  describe("1. Concurrent Description Edit Conflicts", () => {
    it("displays conflict banner when remote description updates while user has unsaved draft, and resolves via Load Remote or Overwrite With Mine", async () => {
      const onUpdateTask = vi.fn().mockResolvedValue({});
      const { rerender } = renderWithProviders(
        <TaskDetailWorkspace
          task={initialTasks[0]}
          board={mockBoard}
          members={[]}
          onClose={vi.fn()}
          onUpdateTask={onUpdateTask}
          onDeleteTask={vi.fn()}
        />
      );

      const descInput = screen.getByPlaceholderText(/write detailed task notes/i);
      fireEvent.change(descInput, { target: { value: "User B local unsaved draft" } });

      // Simulate User A updating description remotely via SSE
      rerender(
        <TaskDetailWorkspace
          task={{
            ...initialTasks[0],
            description: "User A remote saved description",
            updatedAt: new Date(Date.now() + 5000),
          }}
          board={mockBoard}
          members={[]}
          onClose={vi.fn()}
          onUpdateTask={onUpdateTask}
          onDeleteTask={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Concurrent Edit Conflict:/i)).toBeInTheDocument();
      });

      // Test "Overwrite With Mine"
      const overwriteBtn = screen.getByRole("button", { name: /overwrite with mine/i });
      fireEvent.click(overwriteBtn);

      await waitFor(() => {
        expect(onUpdateTask).toHaveBeenCalledWith(
          expect.objectContaining({
            description: "User B local unsaved draft",
            forceOverwrite: true,
          })
        );
      });
      expect(screen.queryByText(/Concurrent Edit Conflict:/i)).not.toBeInTheDocument();
    });

    it("surfaces conflict banner when saving returns HTTP 409 Conflict, and allows Load Remote", async () => {
      const conflictError: any = new Error("Concurrent edit conflict");
      conflictError.status = 409;
      conflictError.currentTask = {
        ...initialTasks[0],
        description: "Server remote description from User A",
      };
      const onUpdateTask = vi.fn().mockRejectedValueOnce(conflictError);

      renderWithProviders(
        <TaskDetailWorkspace
          task={initialTasks[0]}
          board={mockBoard}
          members={[]}
          onClose={vi.fn()}
          onUpdateTask={onUpdateTask}
          onDeleteTask={vi.fn()}
        />
      );

      const descInput = screen.getByPlaceholderText(/write detailed task notes/i);
      fireEvent.change(descInput, { target: { value: "User B conflicting save" } });

      const saveBtn = screen.getByRole("button", { name: /^save$/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText(/Concurrent Edit Conflict:/i)).toBeInTheDocument();
      });

      // Click "Load Remote" to accept User A's remote version
      const loadRemoteBtn = screen.getByRole("button", { name: /load remote/i });
      fireEvent.click(loadRemoteBtn);

      expect(descInput).toHaveValue("Server remote description from User A");
      expect(screen.queryByText(/Concurrent Edit Conflict:/i)).not.toBeInTheDocument();
    });
  });

  describe("2. Card Moved Remotely While Viewing It", () => {
    it("updates status live and shows task-status-live-highlight in TaskDetailWorkspace and data-highlighted on TaskCard", async () => {
      const { rerender } = renderWithProviders(
        <TaskDetailWorkspace
          task={initialTasks[0]}
          board={mockBoard}
          members={[]}
          onClose={vi.fn()}
          onUpdateTask={vi.fn()}
          onDeleteTask={vi.fn()}
        />
      );

      expect(screen.queryByTestId("task-status-live-highlight")).not.toBeInTheDocument();

      // Simulate remote user moving the task from 'todo' to 'done'
      rerender(
        <TaskDetailWorkspace
          task={{
            ...initialTasks[0],
            status: "done",
            updatedAt: new Date(Date.now() + 2000),
          }}
          board={mockBoard}
          members={[]}
          onClose={vi.fn()}
          onUpdateTask={vi.fn()}
          onDeleteTask={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("task-status-live-highlight")).toBeInTheDocument();
        expect(screen.getByText("Moved live")).toBeInTheDocument();
      });

      // Also verify TaskCard renders data-highlighted="true" when isHighlighted is true
      const { container } = renderWithProviders(
        <TaskCard task={initialTasks[0]} isHighlighted={true} onClick={vi.fn()} />
      );
      expect(container.querySelector('[data-highlighted="true"]')).toBeInTheDocument();
    });
  });

  describe("3. User Role Downgraded Mid-Session", () => {
    it("switches UI to read-only immediately and shows toast when member:role_updated downgrades user to viewer", async () => {
      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(screen.getByText("Realtime Collaboration Board")).toBeInTheDocument();
      });

      // Initially editor can see Create New Task button
      expect(screen.getByRole("button", { name: /create new task/i })).toBeInTheDocument();

      // Simulate SSE member:role_updated downgrading current user to viewer
      act(() => {
        latestRealtimeCallbacks?.onMemberChange?.({
          eventType: "member:role_updated",
          userId: mockUser.id,
          role: "viewer",
        });
      });

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith(
          "Your role on this board was updated to viewer."
        );
        expect(screen.queryByRole("button", { name: /create new task/i })).not.toBeInTheDocument();
      });
    });
  });

  describe("4. Member Removed While Connected", () => {
    it("shows error toast and navigates to / on member:removed or force_disconnect", async () => {
      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(screen.getByText("Realtime Collaboration Board")).toBeInTheDocument();
      });

      act(() => {
        latestRealtimeCallbacks?.onMemberChange?.({
          eventType: "member:removed",
          userId: mockUser.id,
        });
      });

      expect(toast.error).toHaveBeenCalledWith("You no longer have access to this board.");
      expect(mockNavigate).toHaveBeenCalledWith("/");

      vi.clearAllMocks();

      act(() => {
        latestRealtimeCallbacks?.onForceDisconnect?.({ reason: "removed" });
      });

      expect(toast.error).toHaveBeenCalledWith("You no longer have access to this board.");
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  describe("5. Offline or Dropped Connection & Reconnect Reconciliation", () => {
    it("displays Read-only • Reconnecting... badge, disables task creation while reconnecting, and reconciles on onReconnect", async () => {
      mockRealtimeState = { isConnected: false, isReconnecting: true };

      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(screen.getByText("Realtime Collaboration Board")).toBeInTheDocument();
      });

      // Reconnecting badge is visible
      const badge = screen.getByTestId("realtime-reconnecting-badge");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent(/Read-only • Reconnecting\.\.\./i);

      // Add Task button is hidden while in effective read-only mode
      expect(screen.queryByRole("button", { name: /create new task/i })).not.toBeInTheDocument();

      // Simulate reconnect callback
      act(() => {
        latestRealtimeCallbacks?.onReconnect?.();
      });

      expect(mockFetchTasks).toHaveBeenCalled();
      expect(boardApi.getBoard).toHaveBeenCalledWith("board-1");
    });
  });
});
