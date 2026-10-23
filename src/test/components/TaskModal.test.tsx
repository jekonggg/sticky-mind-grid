import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { TaskModal } from "@/components/kanban/TaskModal";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { Task } from "@/types/task";
import { BoardMember } from "@/types/board";
import { DEV_SETTINGS_STORAGE_KEY } from "@/contexts/DevModeContext";

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

  it("renders Archive button in edit mode and allows toggling to archive", () => {
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

    const archiveBtn = screen.getByRole("button", { name: /archive/i });
    expect(archiveBtn).toBeInTheDocument();
    fireEvent.click(archiveBtn);

    const submitBtn = screen.getByRole("button", { name: /update task/i });
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "archive",
      })
    );
  });

  it("does not render Delete or Archive button in readOnly mode", () => {
    renderWithProviders(
      <TaskModal
        open={true}
        onClose={vi.fn()}
        task={mockTask}
        members={mockMembers}
        readOnly={true}
        onDelete={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: /move to trash/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /archive/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /update task/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /close/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("excludes viewers, commenters, and pending invitees from assignable members", () => {
    const mixedMembers: BoardMember[] = [
      ...mockMembers,
      {
        id: "bm-editor-accepted",
        boardId: "board-1",
        userId: "user-2",
        role: "editor",
        status: "accepted",
        createdAt: new Date().toISOString(),
        user: { id: "user-2", email: "editor@example.com", fullName: "Accepted Editor" },
      },
      {
        id: "bm-editor-pending",
        boardId: "board-1",
        userId: "user-3",
        role: "editor",
        status: "pending",
        createdAt: new Date().toISOString(),
        user: { id: "user-3", email: "pending@example.com", fullName: "Pending Editor" },
      },
      {
        id: "bm-viewer",
        boardId: "board-1",
        userId: "user-4",
        role: "viewer",
        status: "accepted",
        createdAt: new Date().toISOString(),
        user: { id: "user-4", email: "viewer@example.com", fullName: "Viewer User" },
      },
    ];

    renderWithProviders(
      <TaskModal
        open={true}
        onClose={vi.fn()}
        task={mockTask}
        members={mixedMembers}
        onSubmit={vi.fn()}
      />
    );

    // Open Assignee select
    const comboboxes = screen.getAllByRole("combobox");
    const assigneeTrigger = comboboxes[comboboxes.length - 1];
    fireEvent.click(assigneeTrigger);

    expect(screen.getAllByText(/Alex Rivera/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Accepted Editor/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/Pending Editor/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Viewer User/i)).not.toBeInTheDocument();
  });

  it("populates existing board labels for easy 1-click selection when creating a new task card", () => {
    localStorage.setItem(
      "sticky_mind_grid_board_labels_board-1",
      JSON.stringify([
        { id: "tag-bug", name: "Bug", color: "#ef4444" },
        { id: "tag-frontend", name: "Frontend", color: "#3b82f6" },
      ])
    );

    const handleSubmit = vi.fn();

    renderWithProviders(
      <TaskModal
        open={true}
        onClose={vi.fn()}
        task={null}
        boardId="board-1"
        onSubmit={handleSubmit}
      />
    );

    // Both available board labels should be populated and displayed
    expect(screen.getByText(/Available board labels/i)).toBeInTheDocument();
    const bugBtn = screen.getByRole("button", { name: "Add Bug label" });
    const frontendBtn = screen.getByRole("button", { name: "Add Frontend label" });
    expect(bugBtn).toBeInTheDocument();
    expect(frontendBtn).toBeInTheDocument();

    // Click "Bug" label - should be added immediately with 1 click
    fireEvent.click(bugBtn);

    // "Bug" should now be in the active labels list
    expect(screen.getByRole("button", { name: "Remove Bug label" })).toBeInTheDocument();

    // Fill title and submit
    const titleInput = screen.getByPlaceholderText(/What needs to be done\?/i);
    fireEvent.change(titleInput, { target: { value: "New Bug Task" } });
    fireEvent.submit(titleInput.closest("form")!);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    const submittedData = handleSubmit.mock.calls[0][0];
    expect(submittedData.tags).toHaveLength(1);
    expect(submittedData.tags[0].name).toBe("Bug");
  });

  it("reuses existing board label and avoids duplication when typing matching label name", () => {
    localStorage.setItem(
      "sticky_mind_grid_board_labels_board-1",
      JSON.stringify([
        { id: "tag-feature", name: "Feature", color: "#22c55e" },
      ])
    );

    const handleSubmit = vi.fn();

    renderWithProviders(
      <TaskModal
        open={true}
        onClose={vi.fn()}
        task={null}
        boardId="board-1"
        onSubmit={handleSubmit}
      />
    );

    // Click "New Label" button
    fireEvent.click(screen.getByRole("button", { name: /New Label/i }));

    const tagInput = screen.getByPlaceholderText(/Label name\.\.\./i);
    // Type matching name with different case
    fireEvent.change(tagInput, { target: { value: "feature" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm add label" }));

    // Should reuse the canonical "Feature" label with color #22c55e
    expect(screen.getByRole("button", { name: "Remove Feature label" })).toBeInTheDocument();

    // If user tries to add "Feature" again
    fireEvent.click(screen.getByRole("button", { name: /New Label/i }));
    const tagInput2 = screen.getByPlaceholderText(/Label name\.\.\./i);
    fireEvent.change(tagInput2, { target: { value: "Feature" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm add label" }));

    // Title and submit
    const titleInput = screen.getByPlaceholderText(/What needs to be done\?/i);
    fireEvent.change(titleInput, { target: { value: "Single Feature Task" } });
    fireEvent.submit(titleInput.closest("form")!);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    const submittedData = handleSubmit.mock.calls[0][0];
    // No duplicates
    expect(submittedData.tags).toHaveLength(1);
    expect(submittedData.tags[0].name).toBe("Feature");
    expect(submittedData.tags[0].color).toBe("#22c55e");
  });

  it("disables board selection and displays locked Current Board indicator when allowBoardChange is false", () => {
    const mockBoards = [
      {
        id: "board-1",
        name: "Engineering Sprint",
        emoji: "🚀",
        color: "#3b82f6",
        ownerId: "user-1",
        columns: [{ id: "col-todo", title: "To Do" }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "board-2",
        name: "Marketing Launch",
        emoji: "📢",
        color: "#10b981",
        ownerId: "user-1",
        columns: [{ id: "col-ideas", title: "Ideas" }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    renderWithProviders(
      <TaskModal
        open={true}
        onClose={vi.fn()}
        task={null}
        boardId="board-1"
        availableBoards={mockBoards as any}
        allowBoardChange={false}
      />
    );

    const boardSelectTrigger = screen.getByTestId("task-modal-board-select");
    expect(boardSelectTrigger).toBeDisabled();
    expect(boardSelectTrigger).toHaveTextContent("Engineering Sprint");
    expect(boardSelectTrigger).not.toHaveTextContent("🚀");
    expect(screen.getByText(/Current Board/i)).toBeInTheDocument();
  });

  it("enables board selection when allowBoardChange is true (outside board premises) and submits with selected boardId", () => {
    const mockBoards = [
      {
        id: "board-1",
        name: "Engineering Sprint",
        emoji: "🚀",
        color: "#3b82f6",
        ownerId: "user-1",
        columns: [{ id: "col-todo", title: "To Do" }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "board-2",
        name: "Marketing Launch",
        emoji: "📢",
        color: "#10b981",
        ownerId: "user-1",
        columns: [{ id: "col-ideas", title: "Ideas" }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const onSubmit = vi.fn();

    renderWithProviders(
      <TaskModal
        open={true}
        onClose={vi.fn()}
        task={null}
        boardId="board-1"
        availableBoards={mockBoards as any}
        allowBoardChange={true}
        onSubmit={onSubmit}
      />
    );

    const boardSelectTrigger = screen.getByTestId("task-modal-board-select");
    expect(boardSelectTrigger).not.toBeDisabled();
    expect(screen.queryByText(/Current Board/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Select Board/i)).toBeInTheDocument();

    // Fill title and submit
    const titleInput = screen.getByPlaceholderText(/What needs to be done\?/i);
    fireEvent.change(titleInput, { target: { value: "Cross-board task" } });
    fireEvent.submit(titleInput.closest("form")!);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Cross-board task",
        boardId: "board-1",
      })
    );
  });

  it("renders labels with default ALL CAPS and category icons", () => {
    localStorage.removeItem(DEV_SETTINGS_STORAGE_KEY);
    renderWithProviders(
      <TaskModal
        open={true}
        onClose={vi.fn()}
        task={mockTask}
        members={mockMembers}
        onSubmit={vi.fn()}
      />
    );

    const labelsLabel = screen.getByText(/Labels \/ Tags/i).closest("label");
    expect(labelsLabel).toBeInTheDocument();
    expect(labelsLabel).toHaveClass("uppercase", "tracking-wider");
    expect(labelsLabel?.querySelector("svg")).not.toBeNull();

    const priorityLabel = screen.getByText("Priority").closest("label");
    expect(priorityLabel).toHaveClass("uppercase", "tracking-wider");
    expect(priorityLabel?.querySelector("svg")).not.toBeNull();
  });

  it("removes category icons from labels when taskModalHideLabelIcons dev setting is enabled", () => {
    localStorage.setItem(
      DEV_SETTINGS_STORAGE_KEY,
      JSON.stringify({ taskModalHideLabelIcons: true })
    );

    renderWithProviders(
      <TaskModal
        open={true}
        onClose={vi.fn()}
        task={mockTask}
        members={mockMembers}
        onSubmit={vi.fn()}
      />
    );

    const labelsLabel = screen.getByText(/Labels \/ Tags/i).closest("label");
    expect(labelsLabel).toBeInTheDocument();
    expect(labelsLabel?.querySelector("svg")).toBeNull();

    const priorityLabel = screen.getByText("Priority").closest("label");
    expect(priorityLabel?.querySelector("svg")).toBeNull();

    const dueDateLabel = screen.getByText("Due Date & Time").closest("label");
    expect(dueDateLabel?.querySelector("svg")).toBeNull();

    localStorage.removeItem(DEV_SETTINGS_STORAGE_KEY);
  });

  it("formats labels with Capital First Letter Each Word when taskModalLabelCase is capitalize", () => {
    localStorage.setItem(
      DEV_SETTINGS_STORAGE_KEY,
      JSON.stringify({ taskModalLabelCase: "capitalize" })
    );

    renderWithProviders(
      <TaskModal
        open={true}
        onClose={vi.fn()}
        task={mockTask}
        members={mockMembers}
        onSubmit={vi.fn()}
      />
    );

    const labelsLabel = screen.getByText(/Labels \/ Tags/i).closest("label");
    expect(labelsLabel).toBeInTheDocument();
    expect(labelsLabel).toHaveClass("capitalize", "tracking-normal");
    expect(labelsLabel).not.toHaveClass("uppercase");

    const titleLabel = screen.getByText(/Task Title/i).closest("label");
    expect(titleLabel).toHaveClass("capitalize", "tracking-normal");
    expect(titleLabel).not.toHaveClass("uppercase");

    localStorage.removeItem(DEV_SETTINGS_STORAGE_KEY);
  });
});
