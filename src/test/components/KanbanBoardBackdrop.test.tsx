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
  });

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
  });
});
