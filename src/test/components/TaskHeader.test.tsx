import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { TaskHeader } from "@/components/task/TaskHeader";
import { renderWithProviders } from "@/test/test-utils";

describe("TaskHeader Component", () => {
  const mockColumns = [
    { id: "todo", title: "To Do" },
    { id: "in-progress", title: "In Progress" },
    { id: "done", title: "Done" },
  ];

  const mockBoards = [
    { id: "board-1", name: "Main Project" },
    { id: "board-2", name: "Secondary Project" },
  ];

  it("renders Move, Archive, and Delete buttons when not read-only", async () => {
    const onMoveToColumn = vi.fn();
    const onMoveToBoard = vi.fn();
    const onArchiveToggle = vi.fn();
    const onDelete = vi.fn();

    renderWithProviders(
      <TaskHeader
        boardId="board-1"
        boardName="Main Project"
        title="Implement Task Header"
        emoji="🚀"
        readOnly={false}
        columns={mockColumns}
        currentColumnId="todo"
        availableBoards={mockBoards}
        isArchived={false}
        onTitleChange={vi.fn()}
        onEmojiChange={vi.fn()}
        onDelete={onDelete}
        onMoveToColumn={onMoveToColumn}
        onMoveToBoard={onMoveToBoard}
        onArchiveToggle={onArchiveToggle}
      />
    );

    // Title input is editable
    expect(screen.getByDisplayValue("Implement Task Header")).toBeInTheDocument();

    // Move, Archive, and More task actions overflow trigger are present
    expect(screen.getByTitle("Move task")).toBeInTheDocument();
    expect(screen.getByTitle("Archive task")).toBeInTheDocument();
    const moreActionsBtn = screen.getByTitle("More task actions");
    expect(moreActionsBtn).toBeInTheDocument();

    // Trigger Archive directly (primary action)
    fireEvent.click(screen.getByTitle("Archive task"));
    expect(onArchiveToggle).toHaveBeenCalledTimes(1);

    // Open secondary overflow menu to trigger Move to Trash
    fireEvent.keyDown(moreActionsBtn, { key: "Enter" });
    const moveToTrashItem = await screen.findByTitle("Delete Task");
    expect(moveToTrashItem).toHaveTextContent("Move to Trash");
    fireEvent.click(moveToTrashItem);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("does not render Move, Archive, or More task actions buttons in readOnly mode (Commenter/Viewer)", () => {
    renderWithProviders(
      <TaskHeader
        boardId="board-1"
        boardName="Main Project"
        title="Read Only Task"
        emoji="🔒"
        readOnly={true}
        columns={mockColumns}
        currentColumnId="todo"
        availableBoards={mockBoards}
        isArchived={false}
        onTitleChange={vi.fn()}
        onEmojiChange={vi.fn()}
        onDelete={vi.fn()}
        onMoveToColumn={vi.fn()}
        onMoveToBoard={vi.fn()}
        onArchiveToggle={vi.fn()}
      />
    );

    // Title rendered as text heading, not an input
    expect(screen.getByRole("heading", { name: "Read Only Task" })).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Read Only Task")).not.toBeInTheDocument();

    // Action buttons must be hidden for readOnly roles
    expect(screen.queryByTitle("Move task")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Archive task")).not.toBeInTheDocument();
    expect(screen.queryByTitle("More task actions")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Delete Task")).not.toBeInTheDocument();
  });

  it("renders Follow/Following toggle button and triggers onFollowToggle even in readOnly mode", () => {
    const onFollowToggle = vi.fn();

    const { rerender } = renderWithProviders(
      <TaskHeader
        boardId="board-1"
        boardName="Main Project"
        title="Followed Task"
        emoji="🔔"
        readOnly={true}
        columns={mockColumns}
        currentColumnId="todo"
        availableBoards={mockBoards}
        isArchived={false}
        isFollowing={false}
        onFollowToggle={onFollowToggle}
        onTitleChange={vi.fn()}
        onEmojiChange={vi.fn()}
        onDelete={vi.fn()}
        onMoveToColumn={vi.fn()}
        onMoveToBoard={vi.fn()}
        onArchiveToggle={vi.fn()}
      />
    );

    const followBtn = screen.getByTitle("Follow card notifications");
    expect(followBtn).toHaveTextContent("Follow");
    fireEvent.click(followBtn);
    expect(onFollowToggle).toHaveBeenCalledTimes(1);

    rerender(
      <TaskHeader
        boardId="board-1"
        boardName="Main Project"
        title="Followed Task"
        emoji="🔔"
        readOnly={true}
        columns={mockColumns}
        currentColumnId="todo"
        availableBoards={mockBoards}
        isArchived={false}
        isFollowing={true}
        onFollowToggle={onFollowToggle}
        onTitleChange={vi.fn()}
        onEmojiChange={vi.fn()}
        onDelete={vi.fn()}
        onMoveToColumn={vi.fn()}
        onMoveToBoard={vi.fn()}
        onArchiveToggle={vi.fn()}
      />
    );

    const followingBtn = screen.getByTitle("Unfollow card notifications");
    expect(followingBtn).toHaveTextContent("Following");
  });
});

