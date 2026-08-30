import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { TaskListView } from "@/components/kanban/TaskListView";
import { renderWithProviders } from "@/test/test-utils";
import { Task } from "@/types/task";

describe("TaskListView Component", () => {
  const mockTasks: Task[] = [
    {
      id: "task-1",
      title: "Task with Custom Emoji",
      emoji: "🚀",
      boardId: "board-1",
      status: "todo",
      priority: "high",
      progress: 25,
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "task-2",
      title: "Task without Custom Emoji",
      emoji: undefined,
      boardId: "board-1",
      status: "in_progress",
      priority: "medium",
      progress: 75,
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  it("renders both emoji and placeholder icon containers and handles clicks", () => {
    const onTaskClick = vi.fn();
    renderWithProviders(
      <TaskListView tasks={mockTasks} onTaskClick={onTaskClick} />
    );

    // Verify task titles
    expect(screen.getByText("Task with Custom Emoji")).toBeInTheDocument();
    expect(screen.getByText("Task without Custom Emoji")).toBeInTheDocument();

    // Verify custom emoji rendered
    expect(screen.getByText("🚀")).toBeInTheDocument();

    // Click row
    fireEvent.click(screen.getByText("Task with Custom Emoji"));
    expect(onTaskClick).toHaveBeenCalledWith(mockTasks[0]);
  });
});
