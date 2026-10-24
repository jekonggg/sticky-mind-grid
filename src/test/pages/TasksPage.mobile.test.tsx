import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import TasksPage from "@/pages/TasksPage";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { boardApi } from "@/services/boardApi";
import { taskApi } from "@/services/api";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => true,
}));

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

describe("TasksPage Mobile View", () => {
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
      description: "Ensure comprehensive test suite coverage",
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
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (boardApi.getBoards as any).mockResolvedValue(mockBoards);
    (taskApi.getTasks as any).mockResolvedValue(mockTasks);
  });

  it("forces grid view and disables list view on mobile", async () => {
    renderWithProviders(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText("Write Vitest Tests")).toBeInTheDocument();
    });

    const listTab = screen.getByRole("tab", { name: /list/i });
    const gridTab = screen.getByRole("tab", { name: /grid/i });

    // Grid view should be active on mobile
    expect(gridTab).toHaveAttribute("aria-selected", "true");

    // List view should be disabled on mobile
    expect(listTab).toBeDisabled();
    expect(listTab).toHaveAttribute("aria-disabled", "true");

    // Clicking disabled list view does not change active tab
    fireEvent.click(listTab);
    expect(gridTab).toHaveAttribute("aria-selected", "true");
    expect(listTab).toHaveAttribute("aria-selected", "false");
  });
});
