import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { boardApi } from "@/services/boardApi";
import { taskApi } from "@/services/api";

const mockBoardData = {
  id: "board-1",
  name: "Sprint Engineering",
  emoji: "🚀",
  ownerId: mockUser.id,
  columns: [
    { id: "todo", title: "To Do" },
    { id: "in-progress", title: "In Progress" },
    { id: "done", title: "Done" },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockTasksData = [
  {
    id: "task-1",
    boardId: "board-1",
    title: "Subsea Platform Installation",
    emoji: "⚡",
    description: "Detailed platform installation and testing.",
    status: "todo",
    priority: "high" as const,
    progress: 40,
    tags: [],
    checklist: [],
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ boardId: "board-1" }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock("@/services/boardApi", () => ({
  boardApi: {
    getBoard: vi.fn(),
    getBoards: vi.fn().mockResolvedValue([]),
    getMembers: vi.fn(),
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

vi.mock("@/services/api", () => ({
  taskApi: {
    getTasks: vi.fn(),
    getTrash: vi.fn().mockResolvedValue([]),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    reorderTasks: vi.fn(),
  },
}));

vi.mock("@/hooks/useTasks", () => ({
  useTasks: () => ({
    loading: false,
    tasks: mockTasksData,
    columns: mockBoardData.columns,
    addTask: vi.fn(),
    updateTask: vi.fn(),
    reorderTasks: vi.fn(),
    deleteTask: vi.fn(),
    getTasksByStatus: (status: string) =>
      mockTasksData.filter((t) => t.status === status),
  }),
}));

vi.mock("@/hooks/useBoardRealtime", () => ({
  useBoardRealtime: () => ({ isConnected: true }),
}));

describe("KanbanBoard Backdrop & Task Detail Drawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (boardApi.getBoard as any).mockResolvedValue(mockBoardData);
    (boardApi.getMembers as any).mockResolvedValue([]);
  });

  it("renders the backdrop and drawer when a task card is clicked, and dismisses on backdrop click", async () => {
    renderWithProviders(<KanbanBoard />);

    // Wait for board to load
    await waitFor(() => {
      expect(screen.getByText("Sprint Engineering")).toBeInTheDocument();
    });

    // Initially, no backdrop or drawer should be present
    expect(screen.queryByTestId("task-drawer-backdrop")).not.toBeInTheDocument();
    expect(screen.queryByTestId("task-detail-drawer")).not.toBeInTheDocument();

    // Click on the task card to open the detail drawer
    const taskCard = screen.getByText("Subsea Platform Installation");
    fireEvent.click(taskCard);

    // Verify backdrop and drawer are now displayed
    await waitFor(() => {
      expect(screen.getByTestId("task-drawer-backdrop")).toBeInTheDocument();
      expect(screen.getByTestId("task-detail-drawer")).toBeInTheDocument();
    });

    // Click the greyed-out backdrop to close the drawer
    const backdrop = screen.getByTestId("task-drawer-backdrop");
    fireEvent.click(backdrop);

    // Verify backdrop and drawer are dismissed
    await waitFor(() => {
      expect(screen.queryByTestId("task-drawer-backdrop")).not.toBeInTheDocument();
      expect(screen.queryByTestId("task-detail-drawer")).not.toBeInTheDocument();
    });
  }, 15000);

  it("dismisses the drawer and backdrop when clicking the X close button inside the drawer", async () => {
    renderWithProviders(<KanbanBoard />);

    await waitFor(() => {
      expect(screen.getByText("Sprint Engineering")).toBeInTheDocument();
    });

    // Open task drawer
    const taskCard = screen.getByText("Subsea Platform Installation");
    fireEvent.click(taskCard);

    await waitFor(() => {
      expect(screen.getByTestId("task-drawer-backdrop")).toBeInTheDocument();
    });

    // Click the X close button in the task header
    const closeBtn = screen.getByRole("button", { name: /^close task$/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId("task-drawer-backdrop")).not.toBeInTheDocument();
      expect(screen.queryByTestId("task-detail-drawer")).not.toBeInTheDocument();
    });
  }, 15000);

  it("renders stacked avatar members in the header toolbar with overflow count", async () => {
    const mockMembers = [
      { id: "m-1", boardId: "board-1", userId: "u-1", role: "owner", status: "accepted", user: { id: "u-1", email: "john@example.com", fullName: "John Doe" } },
      { id: "m-2", boardId: "board-1", userId: "u-2", role: "editor", status: "accepted", user: { id: "u-2", email: "jc@example.com", fullName: "Jc Smith" } },
      { id: "m-3", boardId: "board-1", userId: "u-3", role: "editor", status: "accepted", user: { id: "u-3", email: "alice@example.com", fullName: "Alice Wang" } },
      { id: "m-4", boardId: "board-1", userId: "u-4", role: "viewer", status: "accepted", user: { id: "u-4", email: "bob@example.com", fullName: "Bob Brown" } },
      { id: "m-5", boardId: "board-1", userId: "u-5", role: "viewer", status: "accepted", user: { id: "u-5", email: "charlie@example.com", fullName: "Charlie Day" } },
    ];
    (boardApi.getMembers as any).mockResolvedValue(mockMembers);

    renderWithProviders(<KanbanBoard />);

    await waitFor(() => {
      expect(screen.getByText("Sprint Engineering")).toBeInTheDocument();
    });

    // Check visible member avatar buttons
    expect(screen.getByRole("button", { name: "Filter by John Doe" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter by Jc Smith" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter by Alice Wang" })).toBeInTheDocument();

    // Check overflow badge (+2 since 5 members and MAX_VISIBLE is 4, showing 3 + 2)
    const overflowBadge = screen.getByRole("button", { name: "+2 more members" });
    expect(overflowBadge).toBeInTheDocument();
    expect(overflowBadge).toHaveTextContent("+2");
  }, 15000);

  it("reflects updated current user avatar in the header toolbar assignee filter", async () => {
    const mockMembers = [
      {
        id: "m-me",
        boardId: "board-1",
        userId: "user-123",
        role: "owner",
        status: "accepted",
        user: { id: "user-123", email: "testuser@example.com", fullName: "Test User", avatarUrl: "https://old.png" },
      },
    ];
    (boardApi.getMembers as any).mockResolvedValue(mockMembers);

    renderWithProviders(<KanbanBoard />, {
      user: {
        id: "user-123",
        email: "testuser@example.com",
        fullName: "Test User",
        avatarUrl: "https://new-live-avatar.png",
      },
    });

    await waitFor(() => {
      expect(screen.getByText("Sprint Engineering")).toBeInTheDocument();
    });

    const filterAvatar = screen.getByTestId("assignee-filter-avatar-user-123");
    expect(filterAvatar).toHaveAttribute("data-avatar-url", "https://new-live-avatar.png");
  }, 15000);
});
