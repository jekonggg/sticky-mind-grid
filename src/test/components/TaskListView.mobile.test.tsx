import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { TaskListView } from "@/components/kanban/TaskListView";
import { renderWithProviders } from "@/test/test-utils";
import { Task } from "@/types/task";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => true,
}));

describe("TaskListView Mobile Component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mockTasks: Task[] = [
    {
      id: "task-mobile-1",
      title: "Mobile Task Card",
      description: "Description for mobile card",
      emoji: "📱",
      boardId: "board-1",
      status: "in_progress",
      priority: "high",
      progress: 50,
      tags: [{ id: "tag-1", name: "Mobile", color: "#3b82f6" }],
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockColumns = [
    { id: "in_progress", title: "In Progress", emoji: "⏳", color: "#f59e0b" },
  ];

  it("renders mobile grid cards instead of table when on mobile", () => {
    const onTaskClick = vi.fn();
    renderWithProviders(
      <TaskListView
        tasks={mockTasks}
        columns={mockColumns}
        onTaskClick={onTaskClick}
      />
    );

    // Mobile view container should be present
    expect(screen.getByTestId("task-list-mobile-view")).toBeInTheDocument();
    expect(screen.getByTestId("task-list-mobile-grid")).toBeInTheDocument();

    // No desktop table should be present
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    // Verify task details are rendered inside the card
    expect(screen.getByText("Mobile Task Card")).toBeInTheDocument();
    expect(screen.getByText("Description for mobile card")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("📱")).toBeInTheDocument();
    expect(screen.getByText("Mobile")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();

    // Clicking card triggers onTaskClick
    fireEvent.click(screen.getByText("Mobile Task Card"));
    expect(onTaskClick).toHaveBeenCalledWith(mockTasks[0]);
  });
});
