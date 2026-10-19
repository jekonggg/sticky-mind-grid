import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { BoardModal } from "@/components/boards/BoardModal";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { Board } from "@/types/board";
import { fileApi } from "@/services/fileApi";

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
    vi.restoreAllMocks();
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

  it("uses progressive disclosure in Create Board mode: hides description, templates, columns, banner, and color behind Customize", () => {
    renderWithProviders(
      <BoardModal open={true} onClose={vi.fn()} board={null} onSubmit={vi.fn()} />,
      { user: mockUser }
    );

    // Visible by default: Name input and Customize button
    expect(screen.getByPlaceholderText("Project or Board name…")).toBeInTheDocument();
    const customizeBtn = screen.getByRole("button", { name: /customize/i });
    expect(customizeBtn).toBeInTheDocument();

    // Hidden by default
    expect(screen.queryByPlaceholderText("What is this board for?")).not.toBeInTheDocument();
    expect(screen.queryByText("Starter Templates")).not.toBeInTheDocument();
    expect(screen.queryByText("Theme Accent Color")).not.toBeInTheDocument();

    // Click Customize to reveal advanced options
    fireEvent.click(customizeBtn);

    expect(screen.getByPlaceholderText("What is this board for?")).toBeInTheDocument();
    expect(screen.getByText("Starter Templates")).toBeInTheDocument();
    expect(screen.getByText("Theme Accent Color")).toBeInTheDocument();
  });

  it("supports starter templates (Kanban, Sprint, Personal to-do, Ideas / Doing) and minimum 1 column", () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <BoardModal open={true} onClose={vi.fn()} board={null} onSubmit={onSubmit} />,
      { user: mockUser }
    );

    fireEvent.click(screen.getByRole("button", { name: /customize/i }));

    // Select "Ideas / Doing" template (2 columns)
    fireEvent.click(screen.getByRole("button", { name: /ideas \/ doing/i }));
    expect(screen.getByDisplayValue("Ideas")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Doing")).toBeInTheDocument();

    // Remove "Doing" column so only 1 column ("Ideas") remains
    const removeDoingBtn = screen.getByRole("button", { name: "Remove Doing" });
    expect(removeDoingBtn).not.toBeDisabled();
    fireEvent.click(removeDoingBtn);

    expect(screen.queryByDisplayValue("Doing")).not.toBeInTheDocument();
    // Now at 1 column, the remaining remove button should be disabled
    const removeIdeasBtn = screen.getByRole("button", { name: "Remove Ideas" });
    expect(removeIdeasBtn).toBeDisabled();

    // Submit the 1-column board
    fireEvent.change(screen.getByPlaceholderText("Project or Board name…"), {
      target: { value: "Simple Ideas" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Board" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.name).toBe("Simple Ideas");
    const nonArchiveCols = submitted.columns.filter((c: { id: string }) => c.id !== "archive");
    expect(nonArchiveCols).toHaveLength(1);
    expect(nonArchiveCols[0].title).toBe("Ideas");
  });

  it("blocks third-party tracking banner URLs and allows preset themes", () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <BoardModal open={true} onClose={vi.fn()} board={null} onSubmit={onSubmit} />,
      { user: mockUser }
    );

    fireEvent.change(screen.getByPlaceholderText("Project or Board name…"), {
      target: { value: "Privacy Board" },
    });
    fireEvent.click(screen.getByRole("button", { name: /customize/i }));
    fireEvent.click(screen.getByRole("button", { name: /use preset url/i }));

    const urlInput = screen.getByPlaceholderText(/paste an unsplash url/i);
    fireEvent.change(urlInput, {
      target: { value: "https://tracker.evil.example.com/spy.png" },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/third-party image urls are blocked/i);
    expect(screen.getByRole("button", { name: "Create Board" })).toBeDisabled();

    // Selecting a preset clears the error and allows submission
    fireEvent.click(screen.getByTitle("Aurora"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Board" })).not.toBeDisabled();
  }, 15000);

  it("enforces file type and 5MB size limits on banner upload and stores uploaded file path", async () => {
    const uploadSpy = vi.spyOn(fileApi, "uploadFile").mockResolvedValue({
      id: "file-123",
      name: "banner.png",
      storedName: "file-123.png",
      url: "http://127.0.0.1:5000/api/files/file-123.png",
      type: "image/png",
      size: "12 KB",
      sizeBytes: 12288,
    });
    const onSubmit = vi.fn();

    renderWithProviders(
      <BoardModal open={true} onClose={vi.fn()} board={null} onSubmit={onSubmit} />,
      { user: mockUser }
    );

    fireEvent.change(screen.getByPlaceholderText("Project or Board name…"), {
      target: { value: "Banner Board" },
    });
    fireEvent.click(screen.getByRole("button", { name: /customize/i }));

    const fileInput = screen.getByTestId("banner-file-input");

    // 1. Reject invalid file type (.svg)
    const invalidTypeFile = new File(["<svg></svg>"], "vector.svg", { type: "image/svg+xml" });
    fireEvent.change(fileInput, { target: { files: [invalidTypeFile] } });
    expect(screen.getByRole("alert")).toHaveTextContent(/only jpg, png, webp, and gif/i);
    expect(uploadSpy).not.toHaveBeenCalled();

    // 2. Reject oversized file (> 5MB)
    const oversizedFile = new File(["x"], "huge.png", { type: "image/png" });
    Object.defineProperty(oversizedFile, "size", { value: 6 * 1024 * 1024 });
    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });
    expect(screen.getByRole("alert")).toHaveTextContent(/exceeds the 5mb size limit/i);
    expect(uploadSpy).not.toHaveBeenCalled();

    // 3. Accept valid PNG under 5MB and store /api/files/<storedName>
    const validFile = new File(["valid-png"], "banner.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(uploadSpy).toHaveBeenCalledWith(validFile, "banner");
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Board" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Banner Board",
        heroImageUrl: "/api/files/file-123.png",
      })
    );
  });

  it("allows configuring optional per-column WIP limits and submits them with board columns", () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <BoardModal open={true} onClose={vi.fn()} board={mockBoard} onSubmit={onSubmit} />,
      { user: mockUser }
    );

    const wipInput = screen.getByLabelText("WIP limit for In Progress") as HTMLInputElement;
    expect(wipInput).toBeInTheDocument();
    fireEvent.change(wipInput, { target: { value: "3" } });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0][0];
    const inProgressCol = submitted.columns.find((c: { id: string }) => c.id === "in_progress");
    const todoCol = submitted.columns.find((c: { id: string }) => c.id === "todo");
    expect(inProgressCol?.wipLimit).toBe(3);
    expect(todoCol?.wipLimit).toBeNull();
  });

  it("supports Custom Kanban template with empty board states and allows adding custom states", () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <BoardModal open={true} onClose={vi.fn()} board={null} onSubmit={onSubmit} />,
      { user: mockUser }
    );

    fireEvent.click(screen.getByRole("button", { name: /customize/i }));

    // Verify Custom Kanban template option is rendered with empty states description
    const customTemplateBtn = screen.getByRole("button", { name: /custom kanban/i });
    expect(customTemplateBtn).toBeInTheDocument();
    expect(screen.getByText("Empty states (start from scratch)")).toBeInTheDocument();

    // Select Custom Kanban template
    fireEvent.click(customTemplateBtn);

    // Board states should now be empty (0 columns)
    expect(screen.getByText(/no workflow states yet/i)).toBeInTheDocument();
    expect(screen.getByText(/starter:/i)).toHaveTextContent("Custom Kanban");
    expect(screen.getByText(/0 columns/i)).toBeInTheDocument();

    // Trying to submit with 0 columns triggers validation and does not submit
    fireEvent.change(screen.getByPlaceholderText("Project or Board name…"), {
      target: { value: "Custom Board" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Board" }));
    expect(onSubmit).not.toHaveBeenCalled();

    // Add a custom state via the empty placeholder button
    fireEvent.click(screen.getByRole("button", { name: /add first state/i }));
    expect(screen.getByDisplayValue("New State")).toBeInTheDocument();

    // Rename the state
    fireEvent.change(screen.getByDisplayValue("New State"), {
      target: { value: "Triage" },
    });

    // Add another state via the header Add State button
    fireEvent.click(screen.getByRole("button", { name: /add state/i }));
    const stateInputs = screen.getAllByPlaceholderText(/state \d+/i);
    expect(stateInputs).toHaveLength(2);

    fireEvent.change(stateInputs[1], {
      target: { value: "Complete" },
    });

    // Now submit
    fireEvent.click(screen.getByRole("button", { name: "Create Board" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.name).toBe("Custom Board");
    const nonArchiveCols = submitted.columns.filter((c: { id: string }) => c.id !== "archive");
    expect(nonArchiveCols).toHaveLength(2);
    expect(nonArchiveCols[0].title).toBe("Triage");
    expect(nonArchiveCols[1].title).toBe("Complete");
  }, 15000);

  it("renders starter templates without emojis in template selection buttons", () => {
    renderWithProviders(
      <BoardModal open={true} onClose={vi.fn()} board={null} onSubmit={vi.fn()} />,
      { user: mockUser }
    );

    fireEvent.click(screen.getByRole("button", { name: /customize/i }));

    const starterTemplatesSection = screen.getByText("Starter Templates").parentElement;
    expect(starterTemplatesSection).toBeInTheDocument();

    const kanbanBtn = screen.getByRole("button", { name: /^kanban/i });
    expect(kanbanBtn.textContent).toContain("Kanban");
    expect(kanbanBtn.textContent).not.toContain("📋");

    const sprintBtn = screen.getByRole("button", { name: /^sprint/i });
    expect(sprintBtn.textContent).toContain("Sprint");
    expect(sprintBtn.textContent).not.toContain("🏃");

    const customBtn = screen.getByRole("button", { name: /custom kanban/i });
    expect(customBtn.textContent).toContain("Custom Kanban");
    expect(customBtn.textContent).not.toContain("✨");
  });
});

