import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";
import { renderWithProviders } from "@/test/test-utils";
import { Task } from "@/types/task";

const makeTask = (id: string, title: string): Task => ({
  id,
  boardId: "board-1",
  title,
  status: "in_progress",
  priority: "medium",
  progress: 0,
  attachments: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("KanbanColumn Component — Soft WIP Limits", () => {
  it("renders plain task count when no wipLimit is configured", () => {
    renderWithProviders(
      <DndContext>
        <KanbanColumn
          id="in_progress"
          title="In Progress"
          tasks={[makeTask("t1", "Task 1")]}
          onTaskClick={vi.fn()}
        />
      </DndContext>
    );

    const badge = screen.getByTestId("column-wip-badge-in_progress");
    expect(badge).toHaveTextContent("1");
    expect(screen.getByTestId("kanban-column-in_progress")).toHaveAttribute(
      "data-wip-status",
      "normal"
    );
  });

  it("renders count/wipLimit and highlights column as reached when at WIP limit", () => {
    renderWithProviders(
      <DndContext>
        <KanbanColumn
          id="in_progress"
          title="In Progress"
          wipLimit={2}
          tasks={[makeTask("t1", "Task 1"), makeTask("t2", "Task 2")]}
          onTaskClick={vi.fn()}
        />
      </DndContext>
    );

    const badge = screen.getByTestId("column-wip-badge-in_progress");
    expect(badge).toHaveTextContent("2/2");
    expect(badge).toHaveAttribute("title", "WIP limit reached (2/2)");
    expect(screen.getByTestId("kanban-column-in_progress")).toHaveAttribute(
      "data-wip-status",
      "reached"
    );
  });

  it("renders count/wipLimit and highlights column as exceeded when over WIP limit without blocking cards", () => {
    renderWithProviders(
      <DndContext>
        <KanbanColumn
          id="in_progress"
          title="In Progress"
          wipLimit={2}
          tasks={[
            makeTask("t1", "Task 1"),
            makeTask("t2", "Task 2"),
            makeTask("t3", "Task 3"),
          ]}
          onTaskClick={vi.fn()}
        />
      </DndContext>
    );

    const badge = screen.getByTestId("column-wip-badge-in_progress");
    expect(badge).toHaveTextContent("3/2");
    expect(badge).toHaveAttribute("title", "WIP limit exceeded (3/2)");
    expect(screen.getByTestId("kanban-column-in_progress")).toHaveAttribute(
      "data-wip-status",
      "exceeded"
    );
    expect(screen.getByText("Task 3")).toBeInTheDocument();
  });

  it("applies theme-adaptive neutral column surface style by default", () => {
    localStorage.removeItem("sticky_mind_grid_dev_settings");
    renderWithProviders(
      <DndContext>
        <KanbanColumn
          id="todo"
          title="To Do"
          tasks={[]}
          onTaskClick={vi.fn()}
        />
      </DndContext>
    );

    const column = screen.getByTestId("kanban-column-todo");
    expect(column.className).toContain("bg-muted/40");
    expect(column.className).not.toContain("bg-slate-100/75");
  });

  it("applies glass column style when configured in devSettings", () => {
    localStorage.setItem("sticky_mind_grid_dev_settings", JSON.stringify({ columnColorStyle: "glass" }));
    renderWithProviders(
      <DndContext>
        <KanbanColumn
          id="todo"
          title="To Do"
          tasks={[]}
          onTaskClick={vi.fn()}
        />
      </DndContext>
    );

    const column = screen.getByTestId("kanban-column-todo");
    expect(column.className).toContain("backdrop-blur-md");
    localStorage.removeItem("sticky_mind_grid_dev_settings");
  });

  it("respects custom column color on status indicator circle", () => {
    const { container } = renderWithProviders(
      <DndContext>
        <KanbanColumn
          id="custom_col"
          title="Custom Col"
          color="#8b5cf6"
          tasks={[]}
          onTaskClick={vi.fn()}
        />
      </DndContext>
    );

    const indicator = container.querySelector('span[aria-hidden="true"]');
    expect(indicator).toHaveStyle({ backgroundColor: "rgb(139, 92, 246)" });
  });
});
