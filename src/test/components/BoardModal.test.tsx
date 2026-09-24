import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { BoardModal } from "@/components/boards/BoardModal";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { Board } from "@/types/board";

const mockBoard: Board = {
  id: "board-1",
  name: "Engineering Board",
  description: "Core roadmap",
  ownerId: mockUser.id,
  emoji: "💻",
  color: "hsl(220, 80%, 56%)",
  columns: [
    { id: "todo", title: "To Do", emoji: "📝" },
    { id: "in_progress", title: "In Progress", emoji: "⏳" },
    { id: "done", title: "Done", emoji: "✅" },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("BoardModal Component", () => {
  beforeEach(() => {
    localStorage.removeItem("sticky_mind_grid_dev_settings");
  });

  it("renders Edit Board dialog when open with owner permissions", () => {
    renderWithProviders(
      <BoardModal
        open={true}
        onClose={vi.fn()}
        board={mockBoard}
        onSubmit={vi.fn()}
      />,
      { user: mockUser }
    );

    expect(screen.getByRole("heading", { name: "Edit Board" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Engineering Board")).toBeInTheDocument();
    expect(screen.queryByText("Permission Denied")).not.toBeInTheDocument();
  });

  it("shows Permission Denied when simulated role is viewer on an existing board", () => {
    localStorage.setItem(
      "sticky_mind_grid_dev_settings",
      JSON.stringify({ simulatedRole: "viewer" })
    );

    renderWithProviders(
      <BoardModal
        open={true}
        onClose={vi.fn()}
        board={mockBoard}
        onSubmit={vi.fn()}
      />,
      { user: mockUser }
    );

    expect(screen.getByRole("heading", { name: "Permission Denied" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Only board Owners and Admins have permission to edit board settings and workflow states."
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Edit Board" })).not.toBeInTheDocument();
  });

  it("allows creating a new board even if simulated role is viewer", () => {
    localStorage.setItem(
      "sticky_mind_grid_dev_settings",
      JSON.stringify({ simulatedRole: "viewer" })
    );

    renderWithProviders(
      <BoardModal
        open={true}
        onClose={vi.fn()}
        board={null}
        onSubmit={vi.fn()}
      />,
      { user: mockUser }
    );

    expect(screen.getByRole("heading", { name: "Create Board" })).toBeInTheDocument();
    expect(screen.queryByText("Permission Denied")).not.toBeInTheDocument();
  });
});
