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

  it("shows Delete option when user is the board owner", async () => {
    const onDelete = vi.fn();
    renderWithProviders(
      <BoardCard
        board={mockBoard}
        taskCount={2}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />,
      { user: mockUser }
    );

    // Open dropdown via keyboard for Radix UI in jsdom
    const menuButton = screen.getByRole("button");
    fireEvent.keyDown(menuButton, { key: "ArrowDown" });

    const deleteItem = await screen.findByText("Delete");
    expect(deleteItem).toBeInTheDocument();
  });

  it("shows Leave Board option when user is not the owner", async () => {
    const otherUserBoard: Board = {
      ...mockBoard,
      ownerId: "different-owner-id",
    };

    const onLeave = vi.fn();
    renderWithProviders(
      <BoardCard
        board={otherUserBoard}
        taskCount={2}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onLeave={onLeave}
      />,
      { user: mockUser }
    );

    const menuButton = screen.getByRole("button");
    fireEvent.keyDown(menuButton, { key: "ArrowDown" });

    const leaveItem = await screen.findByText("Leave Board");
    expect(leaveItem).toBeInTheDocument();

    fireEvent.click(leaveItem);
    expect(onLeave).toHaveBeenCalledWith(otherUserBoard);
  });
});
