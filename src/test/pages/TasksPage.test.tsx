import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import TasksPage from "@/pages/TasksPage";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { boardApi } from "@/services/boardApi";
import { taskApi } from "@/services/api";

vi.mock("@/services/boardApi", () => ({
  boardApi: {
    getBoards: vi.fn(),
  },
}));

vi.mock("@/services/api", () => ({
  taskApi: {
    getTasks: vi.fn(),
    updateTask: vi.fn(),
    createTask: vi.fn(),
  },
}));

describe("TasksPage", () => {
  const mockBoards = [
    {
      id: "board-1",
      name: "Engineering Sprint",
      emoji: "🚀",
      color: "#3b82f6",
      ownerId: mockUser.id,
      columns: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockTasks = [
    {
      id: "task-1",
      boardId: "board-1",
      boardName: "Engineering Sprint",
      title: "Write Vitest Tests",
      emoji: "🧪",
      status: "todo",
      priority: "high",
      progress: 0,
      assignedTo: mockUser.id,
      checklist: [],
      tags: [],
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "task-2",
      boardId: "board-1",
      boardName: "Engineering Sprint",
      title: "Refactor Navbar",
      emoji: "🎨",
      status: "done",
      priority: "medium",
      progress: 100,
      assignedTo: "other-user",
      checklist: [],
      tags: [],
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (boardApi.getBoards as any).mockResolvedValue(mockBoards);
    (taskApi.getTasks as any).mockResolvedValue(mockTasks);
  });

  it("renders tasks header, filter tabs, and task list", async () => {
    renderWithProviders(<TasksPage />);

    expect(screen.getByText("All Workspace Tasks")).toBeInTheDocument();
    expect(screen.getByText("All Tasks")).toBeInTheDocument();
    expect(screen.getByText("Assigned to Me")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Write Vitest Tests")).toBeInTheDocument();
      expect(screen.getByText("Refactor Navbar")).toBeInTheDocument();
    });
  });

  it("filters tasks when switching tabs", async () => {
    renderWithProviders(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText("Write Vitest Tests")).toBeInTheDocument();
    });

    const assignedTab = screen.getByText("Assigned to Me");
    fireEvent.click(assignedTab);

    await waitFor(() => {
      expect(screen.getByText("Write Vitest Tests")).toBeInTheDocument();
      expect(screen.queryByText("Refactor Navbar")).not.toBeInTheDocument();
    });
  });

  it("filters overdue tasks when clicking overdue tab", async () => {
    const overdueDate = new Date(Date.now() - 86400000).toISOString();
    const tasksWithOverdue = [
      ...mockTasks,
      {
        id: "task-3",
        boardId: "board-1",
        boardName: "Engineering Sprint",
        title: "Overdue Critical Bugfix",
        emoji: "🔥",
        status: "todo",
        priority: "high",
        progress: 0,
        dueDate: overdueDate,
        assignedTo: mockUser.id,
        checklist: [],
        tags: [],
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    (taskApi.getTasks as any).mockResolvedValue(tasksWithOverdue);

    renderWithProviders(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText("Overdue Critical Bugfix")).toBeInTheDocument();
    });

    const overdueTab = screen.getByText("Overdue");
    fireEvent.click(overdueTab);

    await waitFor(() => {
      expect(screen.getByText("Overdue Critical Bugfix")).toBeInTheDocument();
      expect(screen.queryByText("Refactor Navbar")).not.toBeInTheDocument();
    });
  });
});
