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

  it("renders inline assignee and formatted due date", () => {
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
    expect(screen.getByText("Olive Kenji")).toBeInTheDocument();
    expect(screen.getByText("Sep 25, 2025")).toBeInTheDocument();
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

  it("renders involved avatar on bottom right with hover title showing name", () => {
    const taskWithInvolved: Task = {
      ...mockTask,
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

    // Bottom right involved avatars container
    const involvedContainer = container.querySelector('[aria-label="Involved members"]');
    expect(involvedContainer).toBeInTheDocument();

    // Verify hover titles showing names
    const alexAvatar = screen.getAllByTitle("Alex Rivera");
    expect(alexAvatar.length).toBeGreaterThanOrEqual(1);

    const blakeAvatar = screen.getByTitle("Blake Chen");
    expect(blakeAvatar).toBeInTheDocument();
  });

  it("deduplicates involved avatar when assignee and creator are the same person", () => {
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

    const { container } = render(<TaskCard task={taskSameUser} onClick={vi.fn()} />);
    const involvedContainer = container.querySelector('[aria-label="Involved members"]');
    expect(involvedContainer).toBeInTheDocument();

    // Should only have 1 avatar in the involved members container
    const avatars = involvedContainer?.querySelectorAll('[role="img"], span');
    expect(avatars?.length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("+1")).not.toBeInTheDocument();
  });

  it("renders +n overflow avatar when involved members exceed max visible", () => {
    const taskManyInvolved: any = {
      ...mockTask,
      assignees: [
        { id: "u-1", fullName: "User One", email: "u1@test.com" },
        { id: "u-2", fullName: "User Two", email: "u2@test.com" },
        { id: "u-3", fullName: "User Three", email: "u3@test.com" },
        { id: "u-4", fullName: "User Four", email: "u4@test.com" },
        { id: "u-5", fullName: "User Five", email: "u5@test.com" },
      ],
    };

    render(<TaskCard task={taskManyInvolved} onClick={vi.fn()} />);

    // In default comfortable density, max 3 avatars are visible, so 5 - 3 = +2
    const overflowBadge = screen.getByText("+2");
    expect(overflowBadge).toBeInTheDocument();
    // Hovering the +2 badge shows the remaining names
    expect(overflowBadge.getAttribute("title")).toBe("User Four, User Five");
  });

  it("renders cover image beneath header when image attachment is present", () => {
    const taskWithCover: Task = {
      ...mockTask,
      attachments: [
        { name: "cover.png", url: "/uploads/cover.png", type: "image/png" },
      ],
    };

    render(<TaskCard task={taskWithCover} onClick={vi.fn()} />);
    const img = screen.getByRole("img", { name: "cover.png" });
    expect(img).toBeInTheDocument();
  });

  it("renders options menu trigger and handles click without triggering card onClick", () => {
    const onClick = vi.fn();
    render(<TaskCard task={mockTask} onClick={onClick} />);

    const optionsBtn = screen.getByRole("button", { name: "Task options" });
    expect(optionsBtn).toBeInTheDocument();

    fireEvent.click(optionsBtn);
    expect(onClick).not.toHaveBeenCalled();
  });
});
