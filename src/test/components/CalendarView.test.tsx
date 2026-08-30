import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { CalendarView } from "@/components/kanban/CalendarView";
import { renderWithProviders } from "@/test/test-utils";
import { Task } from "@/types/task";

describe("CalendarView Component", () => {
  const todayAt10AM = new Date();
  todayAt10AM.setHours(10, 30, 0, 0);

  const mockTasks: Task[] = [
    {
      id: "task-1",
      title: "Sprint Planning",
      boardId: "board-1",
      status: "todo",
      priority: "high",
      progress: 40,
      dueDate: todayAt10AM,
      attachments: [],
      checklist: [],
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  it("renders view mode switcher and defaults to Month view", () => {
    renderWithProviders(
      <CalendarView tasks={mockTasks} onTaskClick={vi.fn()} />
    );

    expect(screen.getByText("Month")).toBeInTheDocument();
    expect(screen.getByText("Week")).toBeInTheDocument();
    expect(screen.getByText("Day")).toBeInTheDocument();
    expect(screen.getByText(/month view/i)).toBeInTheDocument();
  });

  it("switches to Day view and displays dynamic compact hourly rows", () => {
    const onTaskClick = vi.fn();
    renderWithProviders(
      <CalendarView tasks={mockTasks} onTaskClick={onTaskClick} />
    );

    // Switch to Day view
    const dayBtn = screen.getByRole("button", { name: "Day" });
    fireEvent.click(dayBtn);

    expect(screen.getByText(/day view/i)).toBeInTheDocument();

    // Check that the task scheduled at 10 AM is rendered (in grid and sidebar)
    const taskCards = screen.getAllByText("Sprint Planning");
    expect(taskCards.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/HIGH/i).length).toBeGreaterThanOrEqual(1);

    // Click the task card
    fireEvent.click(taskCards[0]);
    expect(onTaskClick).toHaveBeenCalledWith(mockTasks[0]);
  });
});
