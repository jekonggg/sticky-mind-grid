import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { TaskModal } from "@/components/kanban/TaskModal";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { Task } from "@/types/task";
import { BoardMember } from "@/types/board";

const mockTask: Task = {
  id: "task-1",
  boardId: "board-1",
  title: "Deploy V2 Architecture",
  description: "Configure staging servers and DNS records",
  status: "todo",
  priority: "high",
  progress: 30,
  assignedTo: "user-1",
  dueDate: new Date("2026-09-01T10:00:00.000Z"),
  checklist: [{ id: "c-1", title: "Setup SSL", completed: true }],
  tags: [{ id: "tag-1", name: "DevOps", color: "#3b82f6" }],
  attachments: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockMembers: BoardMember[] = [
  {
    id: "bm-1",
    boardId: "board-1",
    userId: "user-1",
    role: "owner",
    status: "accepted",
    createdAt: new Date().toISOString(),
    user: {
      id: "user-1",
      email: "alex@example.com",
      fullName: "Alex Rivera",
    },
  },
];

describe("TaskModal Component", () => {
  it("renders task title, priority buttons with indicators, and consistent due date input", () => {
    renderWithProviders(
      <TaskModal
        open={true}
        onClose={vi.fn()}
        task={mockTask}
        members={mockMembers}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue("Deploy V2 Architecture")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();

    const dueDateInput = screen.getByLabelText(/Due Date & Time/i);
    expect(dueDateInput).toBeInTheDocument();
    expect(dueDateInput).toHaveAttribute("type", "datetime-local");
    expect(dueDateInput).toHaveClass("h-10");
  });

  it("renders sticky footer and top save button in Edit Mode", () => {
    renderWithProviders(
      <TaskModal
        open={true}
        onClose={vi.fn()}
        task={mockTask}
        members={mockMembers}
        onSubmit={vi.fn()}
      />
    );

    // Save button in top header
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();

    // Update Task button in footer
    expect(screen.getByRole("button", { name: /update task/i })).toBeInTheDocument();
  });

  it("updates priority when clicking priority option buttons", () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <TaskModal
        open={true}
        onClose={vi.fn()}
        task={mockTask}
        members={mockMembers}
        onSubmit={onSubmit}
      />
    );

    const lowPriorityBtn = screen.getByRole("button", { name: /low/i });
    fireEvent.click(lowPriorityBtn);

    const submitBtn = screen.getByRole("button", { name: /update task/i });
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: "low",
      })
    );
  });

  it("allows clearing due date with clear button", () => {
    renderWithProviders(
      <TaskModal
        open={true}
        onClose={vi.fn()}
        task={mockTask}
        members={mockMembers}
        onSubmit={vi.fn()}
      />
    );

    const clearButton = screen.getByTitle("Clear due date");
    expect(clearButton).toBeInTheDocument();
    fireEvent.click(clearButton);

    const dueDateInput = screen.getByLabelText(/Due Date & Time/i) as HTMLInputElement;
    expect(dueDateInput.value).toBe("");
  });

  it("preserves original task status on submit without forced overrides", () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <TaskModal
        open={true}
        onClose={vi.fn()}
        task={{ ...mockTask, status: "todo" }}
        members={mockMembers}
        onSubmit={onSubmit}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /update task/i });
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "todo",
      })
    );
  });
});
