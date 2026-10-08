import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import DashboardPage from "@/pages/DashboardPage";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { boardApi } from "@/services/boardApi";
import { taskApi } from "@/services/api";

vi.mock("@/services/boardApi", () => ({
  boardApi: {
    getBoards: vi.fn(),
    createBoard: vi.fn(),
  },
}));

vi.mock("@/services/api", () => ({
  taskApi: {
    getTasks: vi.fn(),
    updateTask: vi.fn(),
    createTask: vi.fn(),
  },
}));

describe("DashboardPage", () => {
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
      title: "Implement Global Search",
      emoji: "🔍",
      status: "in_progress",
      priority: "high",
      progress: 50,
      assignedTo: mockUser.id,
      dueDate: new Date(Date.now() + 86400000), // tomorrow
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

  it("renders welcome greeting and KPI metric cards", async () => {
    renderWithProviders(<DashboardPage />);

    // Initially displays skeleton
    expect(screen.getByRole("status", { name: "Loading dashboard" })).toBeInTheDocument();

    // Resolves to dashboard content
    await waitFor(() => {
      expect(screen.getByText(/workspace dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      expect(screen.getByText("Total Boards")).toBeInTheDocument();
      expect(screen.getByText("Active Tasks")).toBeInTheDocument();
      expect(screen.getByText("Completed")).toBeInTheDocument();
    });
  });

  it("renders assigned priority tasks and upcoming deadlines", async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Implement Global Search").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Upcoming Deadlines")).toBeInTheDocument();
    });
  });
});
