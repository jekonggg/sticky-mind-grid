import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, render, act } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { TaskCard } from "@/components/kanban/TaskCard";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";
import { TaskListView } from "@/components/kanban/TaskListView";
import { Task } from "@/types/task";
import { SettingsProvider } from "@/contexts/SettingsContext";

// Mock userApi
vi.mock("@/services/userApi", () => ({
  userApi: {
    getPreferences: vi.fn().mockResolvedValue({}),
    updatePreferences: vi.fn().mockResolvedValue({}),
    exportUserData: vi.fn().mockResolvedValue(undefined),
    getHealth: vi.fn().mockResolvedValue({
      status: "healthy",
      database: "connected",
      version: "1.2.0",
      environment: "test",
      timestamp: new Date().toISOString(),
    }),
  },
}));

const mockTask: Task = {
  id: "density-task-1",
  boardId: "board-1",
  title: "UI Density Optimization Task",
  description: "Detailed description testing comfortable vs compact rendering.",
  status: "in_progress",
  priority: "high",
  progress: 60,
  tags: [{ id: "tag-1", name: "Frontend", color: "#3b82f6" }],
  checklist: [
    { id: "cl-1", text: "Item 1", completed: true },
    { id: "cl-2", text: "Item 2", completed: false },
  ],
  attachments: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("UI Density Implementation", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-density");
  });

  it("sets data-density and classes on root documentElement when toggled in Appearance settings", async () => {
    renderWithProviders(<SettingsModal open={true} onClose={vi.fn()} />);

    // Go to Appearance tab
    const appearanceTabBtn = screen.getByRole("button", { name: /Appearance/i });
    act(() => {
      fireEvent.click(appearanceTabBtn);
    });

    expect(screen.getByText("UI Density")).toBeInTheDocument();

    // Switch to Compact
    const compactBtn = screen.getByRole("button", { name: /Compact/i });
    act(() => {
      fireEvent.click(compactBtn);
    });

    expect(document.documentElement.getAttribute("data-density")).toBe("compact");
    expect(document.documentElement.classList.contains("density-compact")).toBe(true);

    // Switch back to Comfortable
    const comfortableBtn = screen.getByRole("button", { name: /Comfortable/i });
    act(() => {
      fireEvent.click(comfortableBtn);
    });

    expect(document.documentElement.getAttribute("data-density")).toBe("comfortable");
    expect(document.documentElement.classList.contains("density-comfortable")).toBe(true);
  }, 15000);

  it("renders TaskCard with density class and renders metadata properly", () => {
    const { container } = renderWithProviders(
      <TaskCard task={mockTask} onClick={vi.fn()} />
    );

    const card = container.querySelector(".density-task-card") as HTMLElement;
    expect(card).toBeInTheDocument();
    expect(card.classList.contains("density-task-card")).toBe(true);
    expect(screen.getByText("UI Density Optimization Task")).toBeInTheDocument();
    expect(screen.getByText(/high/i)).toBeInTheDocument();
    expect(screen.getByText("Frontend")).toBeInTheDocument();
  }, 15000);

  it("renders KanbanColumn and TaskListView with density responsiveness", () => {
    const { container } = renderWithProviders(
      <>
        <KanbanColumn
          id="in_progress"
          title="In Progress"
          tasks={[mockTask]}
          onTaskClick={vi.fn()}
        />
        <TaskListView
          tasks={[mockTask]}
          columns={[{ id: "in_progress", title: "In Progress", color: "#3b82f6" }]}
          onTaskClick={vi.fn()}
        />
      </>
    );

    expect(container.querySelector(".density-kanban-column")).toBeInTheDocument();
    expect(screen.getAllByText("In Progress").length).toBeGreaterThanOrEqual(1);
  }, 15000);
});
