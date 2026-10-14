import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent, render } from "@testing-library/react";
import { TaskCard } from "@/components/kanban/TaskCard";
import { Task } from "@/types/task";

const mockTask: Task = {
  id: "task-1",
  boardId: "board-1",
  title: "Test Task Selection",
  status: "todo",
  priority: "high",
  progress: 25,
  attachments: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("TaskCard Component", () => {
  it("renders task title and fires onClick callback when clicked", () => {
    const onClick = vi.fn();
    render(<TaskCard task={mockTask} onClick={onClick} />);

    expect(screen.getByText("Test Task Selection")).toBeInTheDocument();

    const card = screen.getByText("Test Task Selection").closest("div");
    if (card) {
      fireEvent.click(card);
    }
    expect(onClick).toHaveBeenCalledWith(mockTask);
  });

  it("applies active selected styling when isSelected is true", () => {
    const { container, rerender } = render(
      <TaskCard task={mockTask} isSelected={true} onClick={vi.fn()} />
    );

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("border-primary");
    expect(card.className).toContain("ring-primary");

    rerender(<TaskCard task={mockTask} isSelected={false} onClick={vi.fn()} />);
    expect(card.className).toContain("border-border");
  });

  it("attaches drag-and-drop sortable attributes and grab cursor to the entire task container", () => {
    const { container } = render(<TaskCard task={mockTask} onClick={vi.fn()} />);
    const card = container.firstChild as HTMLElement;

    expect(card.className).toContain("cursor-grab");
    expect(card.className).toContain("active:cursor-grabbing");
    expect(card.getAttribute("role")).toBe("button");
    expect(card.getAttribute("tabindex")).toBe("0");
    expect(card.getAttribute("aria-roledescription")).toBe("sortable");
  });

  it("disables drag attributes and uses pointer cursor when isDragDisabled is true", () => {
    const { container } = render(
      <TaskCard task={mockTask} isDragDisabled={true} onClick={vi.fn()} />
    );
    const card = container.firstChild as HTMLElement;

    expect(card.className).toContain("cursor-pointer");
    expect(card.className).not.toContain("cursor-grab");
    expect(card.getAttribute("aria-roledescription")).toBeNull();
  });

  it("renders folder tab priority badge with uppercase text and matching S-curve priority fade-down gradient", () => {
    const { container } = render(<TaskCard task={{ ...mockTask, priority: "low" }} onClick={vi.fn()} />);
    expect(screen.getByText("LOW PRIORITY")).toBeInTheDocument();
    expect(container.querySelector(".from-emerald-500\\/15")).toBeInTheDocument();
    expect(container.querySelector("linearGradient")).toBeInTheDocument();
  });

  it("hides star and flag icons on priority tag when disableEmojiCustomization is enabled", () => {
    localStorage.setItem(
      "sticky_mind_grid_dev_settings",
      JSON.stringify({ disableEmojiCustomization: true })
    );

    render(
      <TaskCard task={{ ...mockTask, priority: "medium" }} onClick={vi.fn()} />
    );

    const priorityBadge = screen.getByText("MED PRIORITY").closest("div");
    expect(priorityBadge?.querySelectorAll("svg").length).toBe(0);

    localStorage.removeItem("sticky_mind_grid_dev_settings");
  });

  it("renders star and flag icons on priority tag when disableEmojiCustomization is false", () => {
    localStorage.removeItem("sticky_mind_grid_dev_settings");

    render(
      <TaskCard task={{ ...mockTask, priority: "medium" }} onClick={vi.fn()} />
    );

    const priorityBadge = screen.getByText("MED PRIORITY").closest("div");
    expect(priorityBadge?.querySelectorAll("svg").length).toBe(2);
  });

  it("renders formatted due date and single assignee avatar at bottom right", () => {
    const taskWithMeta: Task = {
      ...mockTask,
      assignee: {
        id: "user-1",
        email: "olive@example.com",
        fullName: "Olive Kenji",
      },
      dueDate: new Date("2025-09-25T12:00:00Z"),
    };

    render(<TaskCard task={taskWithMeta} onClick={vi.fn()} />);
    expect(screen.getByText("Sep 25, 2025")).toBeInTheDocument();
    expect(screen.getByTestId("task-single-avatar")).toBeInTheDocument();
    expect(screen.getByLabelText("Assigned to Olive Kenji")).toBeInTheDocument();
  });

  it("gracefully handles invalid due dates without crashing or throwing RangeError", () => {
    const taskWithInvalidDue: any = {
      ...mockTask,
      dueDate: "invalid-date-string",
    };

    expect(() => {
      render(<TaskCard task={taskWithInvalidDue} onClick={vi.fn()} />);
    }).not.toThrow();

    const taskWithNaNObject: any = {
      ...mockTask,
      dueDate: new Date(NaN),
    };

    expect(() => {
      render(<TaskCard task={taskWithNaNObject} onClick={vi.fn()} />);
    }).not.toThrow();
  });

  it("renders attachment count and relocated tags correctly", () => {
    const taskWithFiles: Task = {
      ...mockTask,
      attachments: [
        { name: "report1.pdf", url: "/report1.pdf", type: "application/pdf" },
        { name: "report2.pdf", url: "/report2.pdf", type: "application/pdf" },
      ],
      tags: [
        { id: "t1", name: "Research", color: "#10b981" },
        { id: "t2", name: "Tech", color: "#6366f1" },
      ],
    };

    render(<TaskCard task={taskWithFiles} onClick={vi.fn()} />);
    expect(screen.getByText("2 files")).toBeInTheDocument();
    expect(screen.getByText("Research")).toBeInTheDocument();
    expect(screen.getByText("Tech")).toBeInTheDocument();
  });

  it("renders at most 1 avatar at bottom-right showing assignee with creator attribution in tooltip", () => {
    const taskWithInvolved: Task = {
      ...mockTask,
      createdAt: new Date("2026-03-10T10:00:00Z"),
      assignee: {
        id: "user-1",
        email: "alex@example.com",
        fullName: "Alex Rivera",
      },
      creator: {
        id: "user-2",
        email: "blake@example.com",
        fullName: "Blake Chen",
      },
    };

    const { container } = render(<TaskCard task={taskWithInvolved} onClick={vi.fn()} />);

    // No top-right creator avatar (only dropdown menu remains)
    expect(container.querySelector('[data-testid="task-creator-avatar"]')).toBeNull();

    // Exactly 1 single avatar rendered on the card at bottom-right
    const singleAvatars = screen.getAllByTestId("task-single-avatar");
    expect(singleAvatars.length).toBe(1);

    // Shows Assignee avatar with combined tooltip
    expect(screen.getByLabelText("Assigned to Alex Rivera • Created by Blake Chen")).toBeInTheDocument();
  });

  it("renders single avatar with combined tooltip when assignee and creator are the same person", () => {
    const taskSameUser: Task = {
      ...mockTask,
      assignee: {
        id: "user-1",
        email: "alex@example.com",
        fullName: "Alex Rivera",
      },
      creator: {
        id: "user-1",
        email: "alex@example.com",
        fullName: "Alex Rivera",
      },
    };

    render(<TaskCard task={taskSameUser} onClick={vi.fn()} />);
    const singleAvatars = screen.getAllByTestId("task-single-avatar");
    expect(singleAvatars.length).toBe(1);
    expect(screen.getByLabelText("Alex Rivera (Assignee & Creator)")).toBeInTheDocument();
  });

  it("renders single avatar showing Creator when task is unassigned", () => {
    const taskUnassigned: Task = {
      ...mockTask,
      createdAt: new Date("2026-03-10T10:00:00Z"),
      assignee: null,
      creator: {
        id: "user-2",
        email: "blake@example.com",
        fullName: "Blake Chen",
      },
    };

    render(<TaskCard task={taskUnassigned} onClick={vi.fn()} />);
    const singleAvatars = screen.getAllByTestId("task-single-avatar");
    expect(singleAvatars.length).toBe(1);
    expect(screen.getByLabelText("Created by Blake Chen on Mar 10, 2026 (Unassigned)")).toBeInTheDocument();
  });

  it("renders at most 1 avatar on the card even if multiple assignees exist", () => {
    const taskManyInvolved: any = {
      ...mockTask,
      assignees: [
        { id: "u-1", fullName: "User One", email: "u1@test.com" },
        { id: "u-2", fullName: "User Two", email: "u2@test.com" },
      ],
    };

    render(<TaskCard task={taskManyInvolved} onClick={vi.fn()} />);
    const singleAvatars = screen.getAllByTestId("task-single-avatar");
    expect(singleAvatars.length).toBe(1);
    expect(screen.getByLabelText("Assigned to User One")).toBeInTheDocument();
  });

  it("treats image attachments as files without printing a cover banner over the task title", () => {
    const taskWithImage: Task = {
      ...mockTask,
      attachments: [
        { name: "diagram.png", url: "/uploads/diagram.png", type: "image/png" },
      ],
    };

    render(<TaskCard task={taskWithImage} onClick={vi.fn()} />);
    // Does not render cover image banner above title
    expect(screen.queryByRole("img", { name: "diagram.png" })).not.toBeInTheDocument();
    // Indicates attachment count cleanly in card footer
    expect(screen.getByText("1 file")).toBeInTheDocument();
  });

  it("renders options menu trigger and handles click without triggering card onClick", () => {
    const onClick = vi.fn();
    render(<TaskCard task={mockTask} onClick={onClick} />);

    const optionsBtn = screen.getByRole("button", { name: "Task options" });
    expect(optionsBtn).toBeInTheDocument();

    fireEvent.click(optionsBtn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders Archive card and Move to Trash in options menu when callbacks are provided", async () => {
    const onArchive = vi.fn();
    const onDelete = vi.fn();
    render(
      <TaskCard
        task={mockTask}
        onClick={vi.fn()}
        onArchive={onArchive}
        onDelete={onDelete}
      />
    );

    const optionsBtn = screen.getByRole("button", { name: "Task options" });
    fireEvent.keyDown(optionsBtn, { key: "Enter" });

    const archiveItem = await screen.findByText("Archive card");
    expect(archiveItem).toBeInTheDocument();
    expect(screen.getByText("Move to Trash")).toBeInTheDocument();
    fireEvent.click(archiveItem);
    expect(onArchive).toHaveBeenCalledWith(mockTask);
  });

  it("hides progress bar when hideProgressBar is true (first or last column)", () => {
    const taskWithProgress: Task = {
      ...mockTask,
      progress: 50,
    };

    const { rerender } = render(<TaskCard task={taskWithProgress} onClick={vi.fn()} hideProgressBar={false} />);
    expect(screen.getByText("50%")).toBeInTheDocument();

    rerender(<TaskCard task={taskWithProgress} onClick={vi.fn()} hideProgressBar={true} />);
    expect(screen.queryByText("50%")).not.toBeInTheDocument();
  });

  it("renders checklist badge with completed subtasks count", () => {
    const taskWithChecklist: Task = {
      ...mockTask,
      checklist: [
        {
          id: "c-1",
          title: "Setup database",
          completed: true,
          completedBy: {
            id: "u-1",
            fullName: "Sarah Connor",
            email: "sarah@example.com",
          },
        },
        {
          id: "c-2",
          title: "Run migrations",
          completed: false,
        },
      ],
    };

    render(<TaskCard task={taskWithChecklist} onClick={vi.fn()} />);
    const checklistBadge = screen.getByTestId("task-checklist-badge");
    expect(checklistBadge).toBeInTheDocument();
    expect(checklistBadge.textContent).toContain("1/2");
  });
});
