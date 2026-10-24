import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent, within } from "@testing-library/react";
import { CalendarView } from "@/components/kanban/CalendarView";
import { renderWithProviders } from "@/test/test-utils";
import { Task } from "@/types/task";

const expectMonthHeading = (name: string) => {
  expect(screen.getAllByRole("heading", { name }).length).toBeGreaterThan(0);
};

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

  it("renders the global calendar header without a card container", () => {
    renderWithProviders(
      <CalendarView tasks={mockTasks} onTaskClick={vi.fn()} scope="global" />
    );

    expect(screen.getByTestId("calendar-view")).not.toHaveClass("animate-in");
    expect(screen.getByTestId("calendar-toolbar")).not.toHaveClass("border");
  });

  it("renders view mode switcher and defaults to Month view", () => {
    renderWithProviders(
      <CalendarView tasks={mockTasks} onTaskClick={vi.fn()} />
    );

    expect(screen.getByText("Month")).toBeInTheDocument();
    expect(screen.getByText("Week")).toBeInTheDocument();
    expect(screen.getByText("Day")).toBeInTheDocument();
    expect(screen.getByText(/month view/i)).toBeInTheDocument();

    const weekdays = screen.getByTestId("calendar-weekdays");
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    dayNames.forEach((day) => {
      expect(within(weekdays).getByText(day)).toBeInTheDocument();
    });
  });

  it("switches to Day view and displays dynamic compact hourly rows", () => {
    const onTaskClick = vi.fn();
    renderWithProviders(
      <CalendarView tasks={mockTasks} onTaskClick={onTaskClick} />
    );

    // Switch to Day view
    const dayBtn = within(screen.getByTestId("calendar-view-switcher")).getByRole(
      "button",
      { name: "Day" }
    );
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
    const weekBtn = within(screen.getByTestId("calendar-view-switcher")).getByRole(
      "button",
      { name: "Week" }
    );
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
    expectMonthHeading(currentMonthLabel);

    // Click Next
    const nextBtn = screen.getByRole("button", { name: /next/i });
    fireEvent.click(nextBtn);
    expectMonthHeading(nextMonthLabel);

    // Click Prev twice to reach previous month
    const prevBtn = screen.getByRole("button", { name: /previous/i });
    fireEvent.click(prevBtn);
    expectMonthHeading(currentMonthLabel);
    fireEvent.click(prevBtn);
    expectMonthHeading(prevMonthLabel);

    // Click Today to return
    const todayBtn = screen.getByRole("button", { name: "Today" });
    fireEvent.click(todayBtn);
    expectMonthHeading(currentMonthLabel);
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
    expectMonthHeading(nextMonthLabel);

    // Advancing system time to bypass the 400ms throttle
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 500);

    // Wheel up -> Back to current month
    fireEvent(
      gridContainer,
      new WheelEvent("wheel", { deltaY: -100, bubbles: true, cancelable: true })
    );
    expectMonthHeading(currentMonthLabel);

    // Advancing system time again
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 1000);

    // Wheel up -> Previous month
    fireEvent(
      gridContainer,
      new WheelEvent("wheel", { deltaY: -100, bubbles: true, cancelable: true })
    );
    expectMonthHeading(prevMonthLabel);

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

    expectMonthHeading(nextMonthLabel);
  });

  it("keeps overdue and completed summary cards visible when they are empty", () => {
    renderWithProviders(
      <CalendarView tasks={mockTasks} onTaskClick={vi.fn()} />
    );

    expect(screen.getByTestId("calendar-overdue-card")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-completed-card")).toBeInTheDocument();
    expect(screen.getByText("Overdue Tasks (0)")).toBeInTheDocument();
    expect(screen.getByText("No overdue tasks")).toBeInTheDocument();
    expect(screen.getByText("Completed (0)")).toBeInTheDocument();
    expect(screen.getByText("None finished yet")).toBeInTheDocument();
  });

  it("renders global scope with custom title, schedule task button, and overdue tasks", () => {
    const onAddTask = vi.fn();
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);

    const tasksWithOverdue: Task[] = [
      ...mockTasks,
      {
        id: "task-overdue",
        title: "Overdue Bug Fix",
        boardId: "board-1",
        boardName: "Core Platform",
        status: "todo",
        priority: "urgent",
        progress: 10,
        dueDate: pastDate,
        attachments: [],
        checklist: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    renderWithProviders(
      <CalendarView
        tasks={tasksWithOverdue}
        onTaskClick={vi.fn()}
        onAddTask={onAddTask}
        scope="global"
        title="Global Calendar"
        subtitle="Track deadlines across all boards"
      />
    );

    // Verifies title and subtitle
    expect(screen.getByText("Global Calendar")).toBeInTheDocument();
    expect(screen.getByText("Track deadlines across all boards")).toBeInTheDocument();

    // Verifies Schedule Task button
    const scheduleBtn = screen.getByRole("button", { name: /schedule task/i });
    expect(scheduleBtn).toBeInTheDocument();
    fireEvent.click(scheduleBtn);
    expect(onAddTask).toHaveBeenCalled();

    // Verifies Overdue Tasks section
    expect(screen.getByText(/overdue tasks/i)).toBeInTheDocument();
    expect(screen.getAllByText("Overdue Bug Fix").length).toBeGreaterThanOrEqual(2);
  });
});


