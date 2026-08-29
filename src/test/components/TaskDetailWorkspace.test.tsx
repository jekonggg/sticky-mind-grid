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
    expect(screen.getByText(/⚡/)).toBeInTheDocument();
    expect(screen.getByText("Sprint Board")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Priority")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Create TaskDetailWorkspace")).toBeInTheDocument();
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

    const closeBtn = screen.getByTitle(/close task/i);
    fireEvent.click(closeBtn);
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

  it("calls onDeleteTask when delete button is clicked", () => {
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

    const deleteBtn = screen.getByTitle(/delete task/i);
    fireEvent.click(deleteBtn);
    expect(onDeleteTask).toHaveBeenCalledWith("task-1");
  });
});
