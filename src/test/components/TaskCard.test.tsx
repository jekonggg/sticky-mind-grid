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
});
