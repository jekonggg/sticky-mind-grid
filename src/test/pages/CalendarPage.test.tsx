import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import CalendarPage from "@/pages/CalendarPage";
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
    createTask: vi.fn(),
  },
}));

describe("CalendarPage", () => {
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
      title: "Sprint Review Deadline",
      emoji: "📅",
      status: "todo",
      priority: "high",
      progress: 0,
      assignedTo: mockUser.id,
      dueDate: new Date(),
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

  it("renders global calendar title, month header, and weekdays", async () => {
    renderWithProviders(<CalendarPage />);

    // Initially displays skeleton
    expect(screen.getByRole("status", { name: "Loading calendar" })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Global Calendar")).toBeInTheDocument();
      expect(screen.getByText("Sun")).toBeInTheDocument();
      expect(screen.getByText("Mon")).toBeInTheDocument();
      expect(screen.getByText("Schedule Task")).toBeInTheDocument();
      expect(screen.getAllByText("Sprint Review Deadline").length).toBeGreaterThanOrEqual(1);
    });
  });
});
