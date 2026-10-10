import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { boardApi } from "@/services/boardApi";

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

const mockAddTask = vi.fn();

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
    addTask: mockAddTask,
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

describe("KanbanBoard Add Task Dialog & Column Header Alignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (boardApi.getBoard as any).mockResolvedValue(mockBoardData);
    (boardApi.getMembers as any).mockResolvedValue([]);
    mockAddTask.mockResolvedValue({ id: "new-task-1", title: "Brand New Feature" });
  });

  it("opens TaskModal dialog on Add Task click without auto-creating an untitled task", async () => {
    renderWithProviders(<KanbanBoard />);

    await waitFor(() => {
      expect(screen.getByText("Sprint Engineering")).toBeInTheDocument();
    });

    // Locate the Add Task button
    const addTaskBtn = screen.getByRole("button", { name: /create new task/i });
    expect(addTaskBtn).toBeInTheDocument();

    // Click Add Task
    fireEvent.click(addTaskBtn);

    // Verify dialog opened with "New Task" title
    await waitFor(() => {
      expect(screen.getByText("New Task")).toBeInTheDocument();
    });

    // Crucial check: addTask has NOT been called automatically
    expect(mockAddTask).not.toHaveBeenCalled();

    // Click Cancel
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelBtn);

    // Dialog closes and addTask remains uncalled
    await waitFor(() => {
      expect(screen.queryByText("New Task")).not.toBeInTheDocument();
    });
    expect(mockAddTask).not.toHaveBeenCalled();
  });

  it("creates task only after user enters input and submits the dialog", async () => {
    renderWithProviders(<KanbanBoard />);

    await waitFor(() => {
      expect(screen.getByText("Sprint Engineering")).toBeInTheDocument();
    });

    const addTaskBtn = screen.getByRole("button", { name: /create new task/i });
    fireEvent.click(addTaskBtn);

    await waitFor(() => {
      expect(screen.getByText("New Task")).toBeInTheDocument();
    });

    // Enter task title
    const titleInput = screen.getByPlaceholderText(/what needs to be done\?/i);
    fireEvent.change(titleInput, { target: { value: "Brand New Feature" } });

    // Click Create Task
    const submitBtn = screen.getByRole("button", { name: /create task/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockAddTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Brand New Feature",
          status: "todo",
        })
      );
    });
  });

  it("aligns the first column's left space with the kanban header layout classes", async () => {
    const { container } = renderWithProviders(<KanbanBoard />);

    await waitFor(() => {
      expect(screen.getByText("Sprint Engineering")).toBeInTheDocument();
    });

    const mainEl = container.querySelector("main.density-kanban-board");
    expect(mainEl).toBeInTheDocument();

    // Main has pl-6 md:pl-8 matching the header's px-6 md:px-8
    expect(mainEl).toHaveClass("pl-6");
    expect(mainEl).toHaveClass("md:pl-8");
  });
});
