import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { BoardOverview } from "@/components/kanban/BoardOverview";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { Board } from "@/types/board";
import { Task } from "@/types/task";

describe("BoardOverview Component", () => {
  const mockBoard: Board = {
    id: "board-1",
    name: "Engineering Sprint",
    emoji: "🚀",
    color: "#3b82f6",
    ownerId: mockUser.id,
    columns: [
      { id: "todo", title: "To Do", emoji: "📝" },
      { id: "in_progress", title: "In Progress", emoji: "⚡" },
      { id: "done", title: "Done", emoji: "🎉" },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTasks: Task[] = [
    {
      id: "task-1",
      title: "Task 1",
      boardId: "board-1",
      status: "todo",
      priority: "medium",
      progress: 0,
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "task-2",
      title: "Task 2",
      boardId: "board-1",
      status: "in_progress",
      priority: "high",
      progress: 50,
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "task-3",
      title: "Task 3",
      boardId: "board-1",
      status: "done",
      priority: "low",
      progress: 100,
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  it("renders matching state emojis for each board column", () => {
    renderWithProviders(<BoardOverview board={mockBoard} tasks={mockTasks} />);

    expect(screen.getByText("Total Tasks")).toBeInTheDocument();
    expect(screen.getByText("To Do")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();

    // Verify custom column state emojis are rendered
    expect(screen.getByText("📝")).toBeInTheDocument();
    expect(screen.getByText("⚡")).toBeInTheDocument();
    expect(screen.getByText("🎉")).toBeInTheDocument();

    // Verify overall progress calculation: (0 + 50 + 100) / 3 = 50%
    expect(screen.getByText("50%")).toBeInTheDocument();
  });
});
