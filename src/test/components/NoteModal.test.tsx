import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { NoteModal } from "@/components/documents/NoteModal";
import { Note } from "@/types/note";

describe("NoteModal Component", () => {
  const mockNote: Note = {
    id: "note-123",
    boardId: "board-456",
    userId: "user-789",
    title: "Sprint Retrospective Notes",
    content: "<div><b>Key takeaways</b> from this sprint:</div>",
    color: "#e0f2fe",
    createdAt: new Date("2026-10-01T10:00:00Z"),
    updatedAt: new Date("2026-10-01T10:00:00Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      writable: true,
      value: vi.fn(() => true),
    });
  });

  it("renders creation modal with the rich text formatting toolbar", () => {
    renderWithProviders(
      <NoteModal
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "New Project Note" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. Architecture Overview/i)).toBeInTheDocument();

    // Verify rich text formatting toolbar presence and buttons
    const toolbar = screen.getByTestId("scratchpad-format-toolbar");
    expect(toolbar).toBeInTheDocument();

    const formattingActions = [
      "Bold",
      "Italic",
      "Underline",
      "Strikethrough",
      "Bulleted list",
      "Numbered list",
      "Checklist",
      "Align left",
      "Align center",
      "Align right",
      "Justify",
    ];

    formattingActions.forEach((name) => {
      expect(within(toolbar).getByRole("button", { name })).toBeInTheDocument();
    });

    expect(within(toolbar).getByLabelText("Font size")).toBeInTheDocument();
    expect(within(toolbar).getByLabelText("Text color")).toBeInTheDocument();

    // Content editor
    const editor = screen.getByTestId("scratchpad-content-editor");
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveAttribute("contenteditable", "true");
  });

  it("renders existing note content and triggers formatting commands", async () => {
    renderWithProviders(
      <NoteModal
        open={true}
        onClose={vi.fn()}
        note={mockNote}
        onSubmit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "Edit Note" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Sprint Retrospective Notes")).toBeInTheDocument();

    const editor = screen.getByTestId("scratchpad-content-editor");
    expect(editor).toHaveTextContent("Key takeaways from this sprint:");

    const toolbar = screen.getByTestId("scratchpad-format-toolbar");
    fireEvent.click(within(toolbar).getByRole("button", { name: "Bold" }));
    expect(document.execCommand).toHaveBeenCalledWith("bold", false, undefined);

    fireEvent.click(within(toolbar).getByRole("button", { name: "Italic" }));
    expect(document.execCommand).toHaveBeenCalledWith("italic", false, undefined);

    const fontTrigger = within(toolbar).getByLabelText("Font size");
    fireEvent.keyDown(fontTrigger, { key: "ArrowDown" });
    const normalOption = await screen.findByRole("option", { name: "Normal" });
    expect(normalOption.querySelector("svg.lucide-check")).toBeNull();
    fireEvent.click(screen.getByRole("option", { name: "Large" }));
    await waitFor(() => {
      expect(document.execCommand).toHaveBeenCalledWith("fontSize", false, "5");
    });
  });

  it("submits updated title, sanitized rich text content, and color", () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    renderWithProviders(
      <NoteModal
        open={true}
        onClose={onClose}
        note={mockNote}
        onSubmit={onSubmit}
      />
    );

    const titleInput = screen.getByDisplayValue("Sprint Retrospective Notes");
    fireEvent.change(titleInput, { target: { value: "Updated Title" } });

    // Choose different color (Mint Green)
    const mintButton = screen.getByLabelText(/Mint Green/i);
    fireEvent.click(mintButton);

    const saveButton = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(saveButton);

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Updated Title",
      content: expect.stringContaining("Key takeaways"),
      color: "#dcfce7",
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("handles delete note action when editing", () => {
    const onDelete = vi.fn();
    const onClose = vi.fn();

    renderWithProviders(
      <NoteModal
        open={true}
        onClose={onClose}
        note={mockNote}
        onSubmit={vi.fn()}
        onDelete={onDelete}
      />
    );

    const deleteBtn = screen.getByRole("button", { name: /Delete Note/i });
    fireEvent.click(deleteBtn);

    expect(onDelete).toHaveBeenCalledWith("note-123");
    expect(onClose).toHaveBeenCalled();
  });

  it("renders in read-only mode for viewers without formatting toolbar or save button", () => {
    renderWithProviders(
      <NoteModal
        open={true}
        onClose={vi.fn()}
        note={mockNote}
        onSubmit={vi.fn()}
        readOnly={true}
      />
    );

    expect(screen.getByRole("heading", { name: "Project Note" })).toBeInTheDocument();
    expect(screen.queryByTestId("scratchpad-format-toolbar")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save Changes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete Note/i })).not.toBeInTheDocument();

    const editor = screen.getByTestId("scratchpad-content-editor");
    expect(editor).toHaveAttribute("contenteditable", "false");
    expect(screen.getAllByRole("button", { name: "Close" }).length).toBeGreaterThanOrEqual(1);
  });
});
