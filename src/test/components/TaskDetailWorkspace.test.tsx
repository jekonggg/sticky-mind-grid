import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { TaskDetailWorkspace } from "@/components/task/TaskDetailWorkspace";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { Task } from "@/types/task";
import { Board } from "@/types/board";

const mockBoard: Board = {
  id: "board-1",
  name: "Sprint Board",
  ownerId: mockUser.id,
  color: "hsl(220, 80%, 56%)",
  columns: [
    { id: "todo", title: "To Do", color: "#3b82f6" },
    { id: "in-progress", title: "In Progress", color: "#eab308" },
    { id: "done", title: "Done", color: "#22c55e" },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTask: Task = {
  id: "task-1",
  boardId: "board-1",
  title: "Build Right-Side Task Workspace",
  emoji: "⚡",
  description: "Notion-style side panel detail view.",
  status: "todo",
  priority: "high",
  progress: 50,
  tags: [{ id: "tag-1", name: "Feature", color: "blue" }],
  checklist: [{ id: "check-1", text: "Create TaskDetailWorkspace", completed: true }],
  attachments: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("TaskDetailWorkspace Component", () => {
  let onUpdateTask: any;
  let onDeleteTask: any;
  let onClose: any;

  beforeEach(() => {
    onUpdateTask = vi.fn();
    onDeleteTask = vi.fn();
    onClose = vi.fn();
  });

  it("renders task title, emoji, and properties grid", () => {
    renderWithProviders(
      <TaskDetailWorkspace
        task={mockTask}
        board={mockBoard}
        members={[]}
        onClose={onClose}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
      />
    );

    expect(screen.getByDisplayValue("Build Right-Side Task Workspace")).toBeInTheDocument();
    expect(screen.getAllByText(/⚡/)[0]).toBeInTheDocument();
    expect(screen.getByText("Sprint Board")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Priority")).toBeInTheDocument();
    expect(screen.getByText("Assignee")).toBeInTheDocument();
    expect(screen.getByText("Due Date")).toBeInTheDocument();
    expect(screen.getByText("Progress")).toBeInTheDocument();
    expect(screen.getByText("Updated")).toBeInTheDocument();
    expect(screen.getByText("Tags")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Create TaskDetailWorkspace")).toBeInTheDocument();
  });

  it("renders auto-computed column progress responsive to stage and prevents manual slider tampering", () => {
    renderWithProviders(
      <TaskDetailWorkspace
        task={{ ...mockTask, checklist: [], status: "in-progress" }}
        board={mockBoard}
        members={[]}
        onClose={onClose}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
      />
    );

    // Verify manual slider is not rendered
    expect(screen.queryByRole("slider")).toBeNull();
    // Verify auto-computed progress is displayed
    expect(screen.getByText("Progress")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText(/Stage: In Progress/i)).toBeInTheDocument();
  });

  it("calls onClose when clicking the Close/Board button", () => {
    renderWithProviders(
      <TaskDetailWorkspace
        task={mockTask}
        board={mockBoard}
        members={[]}
        onClose={onClose}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
      />
    );

    const backBtn = screen.getByTitle(/back to board/i);
    fireEvent.click(backBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when clicking the top-right X close button", () => {
    renderWithProviders(
      <TaskDetailWorkspace
        task={mockTask}
        board={mockBoard}
        members={[]}
        onClose={onClose}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
      />
    );

    const xCloseBtn = screen.getByRole("button", { name: /^close task$/i });
    fireEvent.click(xCloseBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("updates title with debouncing", async () => {
    renderWithProviders(
      <TaskDetailWorkspace
        task={mockTask}
        board={mockBoard}
        members={[]}
        onClose={onClose}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
      />
    );

    const titleInput = screen.getByDisplayValue("Build Right-Side Task Workspace");
    fireEvent.change(titleInput, { target: { value: "Updated Task Title" } });

    await waitFor(
      () => {
        expect(onUpdateTask).toHaveBeenCalledWith({ title: "Updated Task Title" });
      },
      { timeout: 1000 }
    );
  });

  it("allows adding a subtask to checklist", () => {
    renderWithProviders(
      <TaskDetailWorkspace
        task={mockTask}
        board={mockBoard}
        members={[]}
        onClose={onClose}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
      />
    );

    const subtaskInput = screen.getByPlaceholderText(/add a subtask/i);
    fireEvent.change(subtaskInput, { target: { value: "Second Subtask" } });
    fireEvent.keyDown(subtaskInput, { key: "Enter", code: "Enter" });

    expect(onUpdateTask).toHaveBeenCalledWith(
      expect.objectContaining({
        checklist: expect.arrayContaining([
          expect.objectContaining({ title: "Second Subtask", completed: false }),
        ]),
      })
    );
  });

  it("displays Saved status indicator after updating task property", async () => {
    renderWithProviders(
      <TaskDetailWorkspace
        task={{ ...mockTask, checklist: [] }}
        board={mockBoard}
        members={[]}
        onClose={onClose}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
      />
    );

    const titleInput = screen.getByDisplayValue("Build Right-Side Task Workspace");
    fireEvent.change(titleInput, { target: { value: "New Title That Triggers Save" } });
    fireEvent.blur(titleInput);

    await waitFor(() => {
      expect(screen.getByText("Saved")).toBeInTheDocument();
    });
  });

  it("renders auto-computed progress indicator and does not expose an arbitrary manual slider", () => {
    renderWithProviders(
      <TaskDetailWorkspace
        task={{ ...mockTask, checklist: [] }}
        board={mockBoard}
        members={[]}
        onClose={onClose}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
      />
    );

    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.getByText("Progress")).toBeInTheDocument();
  });

  it("renders safely without throwing RangeError when task.dueDate is invalid or malformed", () => {
    const taskWithBadDate: any = {
      ...mockTask,
      dueDate: "not-a-valid-date",
      updatedAt: "invalid-timestamp",
    };

    expect(() => {
      renderWithProviders(
        <TaskDetailWorkspace
          task={taskWithBadDate}
          board={mockBoard}
          members={[]}
          onClose={onClose}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
        />
      );
    }).not.toThrow();
  });

  it("limits priority options to Low, Medium, and High without Urgent, and aligns priority colors", async () => {
    renderWithProviders(
      <TaskDetailWorkspace
        task={mockTask}
        board={mockBoard}
        members={[]}
        onClose={onClose}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
      />
    );

    // Click the priority dropdown
    const priorityTrigger = screen.getByRole("combobox", { name: /priority/i });
    expect(priorityTrigger).toBeInTheDocument();
    fireEvent.click(priorityTrigger);

    // Urgent should NOT exist in the options
    expect(screen.queryByRole("option", { name: /urgent/i })).toBeNull();

    // Low, Medium, High options should be present
    const lowOption = screen.getByRole("option", { name: /low/i });
    const medOption = screen.getByRole("option", { name: /medium/i });
    const highOption = screen.getByRole("option", { name: /high/i });

    expect(lowOption).toBeInTheDocument();
    expect(medOption).toBeInTheDocument();
    expect(highOption).toBeInTheDocument();

    // Verify color indicators inside options: low = blue, medium = amber, high = red
    expect(lowOption.querySelector(".bg-blue-500")).toBeInTheDocument();
    expect(medOption.querySelector(".bg-amber-500")).toBeInTheDocument();
    expect(highOption.querySelector(".bg-red-500")).toBeInTheDocument();

    // Select Low priority
    fireEvent.click(lowOption);
    expect(onUpdateTask).toHaveBeenCalledWith(
      expect.objectContaining({ priority: "low" })
    );
  });

  it("renders readOnly priority badge with aligned colors and normalizes legacy urgent to high", () => {
    renderWithProviders(
      <TaskDetailWorkspace
        task={{ ...mockTask, priority: "urgent" as any }}
        board={mockBoard}
        members={[]}
        readOnly={true}
        onClose={onClose}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
      />
    );

    // In readOnly mode, legacy urgent is rendered as High with red styling
    const badge = screen.getByText("high");
    expect(badge).toBeInTheDocument();
    expect(badge.closest("div")?.querySelector(".bg-red-500")).toBeInTheDocument();
  });
  it("renders status dropdown without checkmark indicator on the selected item", () => {
    renderWithProviders(
      <TaskDetailWorkspace
        task={mockTask}
        board={mockBoard}
        members={[]}
        onClose={onClose}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
      />
    );

    // Open status dropdown
    const statusTrigger = screen.getByRole("combobox", { name: /status/i });
    expect(statusTrigger).toBeInTheDocument();
    fireEvent.click(statusTrigger);

    // Selected status is "To Do"
    const todoOption = screen.getByRole("option", { name: /to do/i });
    expect(todoOption).toBeInTheDocument();

    // Verify no check icon is rendered inside the selected option
    expect(todoOption.querySelector("svg.lucide-check")).toBeNull();
  });
});


