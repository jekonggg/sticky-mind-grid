import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
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

const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ boardId: "board-1" }),
    useNavigate: () => mockNavigate,
    useSearchParams: () => [
      mockSearchParams,
      (updater: any) => {
        if (typeof updater === "function") {
          mockSearchParams = updater(mockSearchParams);
        } else {
          mockSearchParams = new URLSearchParams(updater);
        }
      },
    ],
  };
});

vi.mock("@/services/boardApi", () => ({
  boardApi: {
    getBoard: vi.fn(),
    getBoards: vi.fn().mockResolvedValue([]),
    getMembers: vi.fn(),
    updateBoard: vi.fn(),
    setBoardMute: vi.fn().mockResolvedValue({ success: true }),
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
    fetchTasks: vi.fn(),
    getTasksByStatus: (status: string) =>
      mockTasksData.filter((t) => t.status === status),
  }),
}));

vi.mock("@/hooks/useBoardRealtime", () => ({
  useBoardRealtime: () => ({ isConnected: true }),
}));

describe("KanbanBoard Views & In-Place List View", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    (boardApi.getBoard as any).mockResolvedValue(mockBoardData);
    (boardApi.getMembers as any).mockResolvedValue([]);
  });

  it("renders columns in default board view and switches in-place to list view without redirect", async () => {
    renderWithProviders(<KanbanBoard />);

    // Wait for board to load and display column headers
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "To Do" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "In Progress" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Done" })).toBeInTheDocument();
    });

    // Check bottom dock has List tab
    const dock = screen.getByTestId("board-desktop-dock");
    const listTab = within(dock).getByRole("tab", { name: "List" });
    expect(listTab).toBeInTheDocument();

    // Click List tab
    fireEvent.click(listTab);

    // List view table should now be rendered in place
    await waitFor(() => {
      expect(screen.getByText("Task Name")).toBeInTheDocument();
      expect(screen.getByText("Subsea Platform Installation")).toBeInTheDocument();
    });

    // Verify it did NOT redirect to /tasks
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining("/tasks"));

    // Verify NO "Back to Showcase Board" button is present
    expect(screen.queryByTestId("back-to-board-btn")).not.toBeInTheDocument();
    expect(screen.queryByText(/Back to .* Board/i)).not.toBeInTheDocument();

    // Verify filter toolbar is present in list view
    expect(screen.getByText(/All \(1\)/i)).toBeInTheDocument();

    // Clicking a task in the list view opens the task drawer
    const taskRow = screen.getByText("Subsea Platform Installation");
    fireEvent.click(taskRow);

    await waitFor(() => {
      expect(screen.getByTestId("task-detail-drawer")).toBeInTheDocument();
    });

    // Switch back to Board view
    const boardTab = within(dock).getByRole("tab", { name: "Board" });
    fireEvent.click(boardTab);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "To Do" })).toBeInTheDocument();
    });
  });

  it("renders in-place list view directly when view=list search param is preset", async () => {
    mockSearchParams = new URLSearchParams("view=list");
    renderWithProviders(<KanbanBoard />);

    // Wait for board to load
    await waitFor(() => {
      expect(screen.getByText("Task Name")).toBeInTheDocument();
      expect(screen.getByText("Subsea Platform Installation")).toBeInTheDocument();
    });

    // Verify columns are not shown
    expect(screen.queryByRole("heading", { name: "To Do" })).not.toBeInTheDocument();

    // Verify navigate was NOT called with /tasks
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining("/tasks"));
    expect(screen.queryByTestId("back-to-board-btn")).not.toBeInTheDocument();
  });
});
