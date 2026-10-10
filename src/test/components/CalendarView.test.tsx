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

  it("switches to Week view and displays rich task containers with columns and progress", () => {
    const onTaskClick = vi.fn();
    const mockColumns = [
      { id: "todo", title: "To Do", emoji: "📋" },
      { id: "qa", title: "Quality Assurance", emoji: "🧪" },
    ];

    renderWithProviders(
      <CalendarView
        tasks={mockTasks}
        columns={mockColumns}
        onTaskClick={onTaskClick}
      />
    );

    // Switch to Week view
    const weekBtn = screen.getByRole("button", { name: "Week" });
    fireEvent.click(weekBtn);

    expect(screen.getByText(/week view/i)).toBeInTheDocument();

    // Check that task is rendered with rich metadata
    const taskCards = screen.getAllByText("Sprint Planning");
    expect(taskCards.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Progress")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("shifts months when clicking Next and Previous buttons", () => {
    renderWithProviders(
      <CalendarView tasks={mockTasks} onTaskClick={vi.fn()} />
    );

    const now = new Date();
    const currentMonthLabel = now.toLocaleString("default", { month: "long", year: "numeric" });
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthLabel = nextMonth.toLocaleString("default", { month: "long", year: "numeric" });
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthLabel = prevMonth.toLocaleString("default", { month: "long", year: "numeric" });

    // Initially in current month
    expect(screen.getByRole("heading", { name: currentMonthLabel })).toBeInTheDocument();

    // Click Next
    const nextBtn = screen.getByRole("button", { name: /next/i });
    fireEvent.click(nextBtn);
    expect(screen.getByRole("heading", { name: nextMonthLabel })).toBeInTheDocument();

    // Click Prev twice to reach previous month
    const prevBtn = screen.getByRole("button", { name: /previous/i });
    fireEvent.click(prevBtn);
    expect(screen.getByRole("heading", { name: currentMonthLabel })).toBeInTheDocument();
    fireEvent.click(prevBtn);
    expect(screen.getByRole("heading", { name: prevMonthLabel })).toBeInTheDocument();

    // Click Today to return
    const todayBtn = screen.getByRole("button", { name: "Today" });
    fireEvent.click(todayBtn);
    expect(screen.getByRole("heading", { name: currentMonthLabel })).toBeInTheDocument();
  });

  it("shifts months when scrolling (wheel down/up) over the calendar grid", () => {
    renderWithProviders(
      <CalendarView tasks={mockTasks} onTaskClick={vi.fn()} />
    );

    const now = new Date();
    const currentMonthLabel = now.toLocaleString("default", { month: "long", year: "numeric" });
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthLabel = nextMonth.toLocaleString("default", { month: "long", year: "numeric" });
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthLabel = prevMonth.toLocaleString("default", { month: "long", year: "numeric" });

    const gridContainer = screen.getByTestId("calendar-grid-container");

    // Wheel down -> Next month
    fireEvent(
      gridContainer,
      new WheelEvent("wheel", { deltaY: 100, bubbles: true, cancelable: true })
    );
    expect(screen.getByRole("heading", { name: nextMonthLabel })).toBeInTheDocument();

    // Advancing system time to bypass the 400ms throttle
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 500);

    // Wheel up -> Back to current month
    fireEvent(
      gridContainer,
      new WheelEvent("wheel", { deltaY: -100, bubbles: true, cancelable: true })
    );
    expect(screen.getByRole("heading", { name: currentMonthLabel })).toBeInTheDocument();

    // Advancing system time again
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 1000);

    // Wheel up -> Previous month
    fireEvent(
      gridContainer,
      new WheelEvent("wheel", { deltaY: -100, bubbles: true, cancelable: true })
    );
    expect(screen.getByRole("heading", { name: prevMonthLabel })).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("shifts months on horizontal touch swipe", () => {
    renderWithProviders(
      <CalendarView tasks={mockTasks} onTaskClick={vi.fn()} />
    );

    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthLabel = nextMonth.toLocaleString("default", { month: "long", year: "numeric" });

    const gridContainer = screen.getByTestId("calendar-grid-container");

    // Swipe left (finger moves right to left: clientX from 200 to 100) -> Next month
    fireEvent.touchStart(gridContainer, {
      touches: [{ clientX: 200, clientY: 150 }],
    });
    fireEvent.touchEnd(gridContainer, {
      changedTouches: [{ clientX: 100, clientY: 150 }],
    });

    expect(screen.getByRole("heading", { name: nextMonthLabel })).toBeInTheDocument();
  });
});

