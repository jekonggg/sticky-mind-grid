import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { BoardCard } from "@/components/boards/BoardCard";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { Board } from "@/types/board";

const mockBoard: Board = {
  id: "board-1",
  name: "Sprint Alpha",
  description: "Quarterly sprint roadmap",
  ownerId: mockUser.id,
  emoji: "🚀",
  color: "hsl(220, 80%, 56%)",
  columns: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("BoardCard Component", () => {
  it("renders board title, description, and task count", () => {
    renderWithProviders(
      <BoardCard
        board={mockBoard}
        taskCount={5}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("Sprint Alpha")).toBeInTheDocument();
    expect(screen.getByText("Quarterly sprint roadmap")).toBeInTheDocument();
    expect(screen.getByText(/5 tasks/i)).toBeInTheDocument();
    expect(screen.getByText("🚀")).toBeInTheDocument();
  });

  it("shows Edit, disabled Leave with tooltip, and Delete for a sole owner", async () => {
    const onDelete = vi.fn();
    const onEdit = vi.fn();
    const onLeave = vi.fn();

    renderWithProviders(
      <BoardCard
        board={{ ...mockBoard, role: "owner", ownerCount: 1 }}
        taskCount={2}
        onEdit={onEdit}
        onDelete={onDelete}
        onLeave={onLeave}
      />,
      { user: mockUser }
    );

    const menuButton = screen.getByRole("button");
    fireEvent.keyDown(menuButton, { key: "ArrowDown" });

    expect(await screen.findByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();

    const leaveItem = screen.getByText("Leave Board").closest("[role='menuitem']")!;
    expect(leaveItem).toHaveAttribute("aria-disabled", "true");
    expect(leaveItem).toHaveAttribute("title", "Transfer ownership first");
  });

  it("shows Edit, enabled Leave, and Delete for an owner when another owner exists", async () => {
    const onDelete = vi.fn();
    const onEdit = vi.fn();
    const onLeave = vi.fn();

    renderWithProviders(
      <BoardCard
        board={{ ...mockBoard, role: "owner", ownerCount: 2 }}
        taskCount={2}
        onEdit={onEdit}
        onDelete={onDelete}
        onLeave={onLeave}
      />,
      { user: mockUser }
    );

    const menuButton = screen.getByRole("button");
    fireEvent.keyDown(menuButton, { key: "ArrowDown" });

    expect(await screen.findByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();

    const leaveItem = screen.getByText("Leave Board");
    expect(leaveItem.closest("[role='menuitem']")).not.toHaveAttribute("aria-disabled", "true");

    fireEvent.click(leaveItem);
    expect(onLeave).toHaveBeenCalled();
  });

  it("shows Edit and Leave, but not Delete, for an Admin", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onLeave = vi.fn();

    renderWithProviders(
      <BoardCard
        board={{ ...mockBoard, ownerId: "other-user", role: "admin" }}
        taskCount={2}
        onEdit={onEdit}
        onDelete={onDelete}
        onLeave={onLeave}
      />,
      { user: mockUser }
    );

    const menuButton = screen.getByRole("button");
    fireEvent.keyDown(menuButton, { key: "ArrowDown" });

    expect(await screen.findByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Leave Board")).toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("shows Leave only for Editor and Viewer (no Edit, no Delete)", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onLeave = vi.fn();

    renderWithProviders(
      <BoardCard
        board={{ ...mockBoard, ownerId: "other-user", role: "editor" }}
        taskCount={2}
        onEdit={onEdit}
        onDelete={onDelete}
        onLeave={onLeave}
      />,
      { user: mockUser }
    );

    const menuButton = screen.getByRole("button");
    fireEvent.keyDown(menuButton, { key: "ArrowDown" });

    expect(await screen.findByText("Leave Board")).toBeInTheDocument();
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Leave Board"));
    expect(onLeave).toHaveBeenCalled();
  });

  it("hides Edit and Delete when simulated role is viewer, even if user is the real board owner", async () => {
    localStorage.setItem(
      "sticky_mind_grid_dev_settings",
      JSON.stringify({ simulatedRole: "viewer" })
    );

    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onLeave = vi.fn();

    renderWithProviders(
      <BoardCard
        board={{ ...mockBoard, ownerId: mockUser.id, role: "owner" }}
        taskCount={2}
        onEdit={onEdit}
        onDelete={onDelete}
        onLeave={onLeave}
      />,
      { user: mockUser }
    );

    const menuButton = screen.getByRole("button");
    fireEvent.keyDown(menuButton, { key: "ArrowDown" });

    expect(await screen.findByText("Leave Board")).toBeInTheDocument();
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();

    localStorage.removeItem("sticky_mind_grid_dev_settings");
  });

  it("renders a role badge on every board card (Owner, Admin, Editor, Commenter, Viewer)", () => {
    const { rerender } = renderWithProviders(
      <BoardCard
        board={{ ...mockBoard, role: "owner" }}
        taskCount={3}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
      { user: mockUser }
    );
    expect(screen.getByTestId("board-role-badge")).toHaveTextContent("Owner");

    rerender(
      <BoardCard
        board={{ ...mockBoard, ownerId: "other-user", role: "editor" }}
        taskCount={3}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByTestId("board-role-badge")).toHaveTextContent("Editor");

    rerender(
      <BoardCard
        board={{ ...mockBoard, ownerId: "other-user", role: "viewer" }}
        taskCount={3}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByTestId("board-role-badge")).toHaveTextContent("Viewer");
  });

  it("calls onTogglePin when the pin button is clicked", () => {
    const onTogglePin = vi.fn();

    renderWithProviders(
      <BoardCard
        board={mockBoard}
        taskCount={3}
        isPinned={false}
        onTogglePin={onTogglePin}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
      { user: mockUser }
    );

    const pinButton = screen.getByRole("button", { name: "Pin board" });
    fireEvent.click(pinButton);
    expect(onTogglePin).toHaveBeenCalledWith(mockBoard);
  });
});
