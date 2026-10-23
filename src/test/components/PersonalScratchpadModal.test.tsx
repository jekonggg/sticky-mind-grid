import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { PersonalScratchpadModal } from "@/components/documents/PersonalScratchpadModal";
import { renderWithProviders } from "@/test/test-utils";
import { scratchpadApi } from "@/services/scratchpadApi";

vi.mock("@/services/scratchpadApi", () => ({
  scratchpadApi: {
    getScratchpads: vi.fn(),
    createScratchpad: vi.fn(),
    updateScratchpad: vi.fn(),
    deleteScratchpad: vi.fn(),
  },
}));

describe("PersonalScratchpadModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      writable: true,
      value: vi.fn(() => true),
    });
    (scratchpadApi.getScratchpads as any).mockResolvedValue([
      {
        id: "server-note-1",
        title: "👋 Welcome to your Scratchpad (Quick Tour)",
        content: "Welcome to your personal scratchpad!",
        color: "#fef3c7",
        pinned: true,
        updatedAt: new Date().toISOString(),
      },
      {
        id: "server-note-2",
        title: "📋 Daily Standup & Planner",
        content: "Top priority task",
        color: "#e0f2fe",
        pinned: false,
        updatedAt: new Date().toISOString(),
      },
    ]);
  });

  it("renders when open and displays informative starter notes", async () => {
    renderWithProviders(
      <PersonalScratchpadModal open={true} onClose={vi.fn()} />
    );

    expect(screen.getByRole("heading", { name: "Scratchpad" })).toBeInTheDocument();
    expect(screen.getByText("New Note")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("👋 Welcome to your Scratchpad (Quick Tour)")).toBeInTheDocument();
      expect(screen.getByText("📋 Daily Standup & Planner")).toBeInTheDocument();
    });
  });

  it("renders the formatting toolbar inline on desktop and applies commands", async () => {
    renderWithProviders(
      <PersonalScratchpadModal open={true} onClose={vi.fn()} />
    );

    await waitFor(() => {
      expect(
        screen.getByText("👋 Welcome to your Scratchpad (Quick Tour)")
      ).toBeInTheDocument();
    });

    const toolbar = screen.getByTestId("scratchpad-format-toolbar");
    expect(toolbar).toHaveAttribute("data-placement", "inline");
    for (const name of [
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
    ]) {
      expect(
        within(toolbar).getByRole("button", { name })
      ).toBeInTheDocument();
    }
    expect(within(toolbar).getByLabelText("Font size")).toBeInTheDocument();
    expect(within(toolbar).getByLabelText("Text color")).toBeInTheDocument();
    expect(
      screen.getByTestId("scratchpad-content-editor")
    ).toHaveTextContent("Welcome to your personal scratchpad!");

    fireEvent.click(within(toolbar).getByRole("button", { name: "Bold" }));
    expect(document.execCommand).toHaveBeenCalledWith("bold", false, undefined);

    fireEvent.click(within(toolbar).getByRole("button", { name: "Underline" }));
    expect(document.execCommand).toHaveBeenCalledWith(
      "underline",
      false,
      undefined
    );

    fireEvent.click(
      within(toolbar).getByRole("button", { name: "Numbered list" })
    );
    expect(document.execCommand).toHaveBeenCalledWith(
      "insertOrderedList",
      false,
      undefined
    );

    fireEvent.click(
      within(toolbar).getByRole("button", { name: "Align center" })
    );
    expect(document.execCommand).toHaveBeenCalledWith(
      "justifyCenter",
      false,
      undefined
    );

    const fontTrigger = within(toolbar).getByLabelText("Font size");
    fireEvent.keyDown(fontTrigger, { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "Large" }));
    await waitFor(() => {
      expect(document.execCommand).toHaveBeenCalledWith("fontSize", false, "5");
    });

    fireEvent.change(within(toolbar).getByLabelText("Text color"), {
      target: { value: "#ff0000" },
    });
    expect(document.execCommand).toHaveBeenCalledWith(
      "foreColor",
      false,
      "#ff0000"
    );
  });

  it("converts list items into interactive checklist items", async () => {
    renderWithProviders(
      <PersonalScratchpadModal open={true} onClose={vi.fn()} />
    );

    await waitFor(() => {
      expect(
        screen.getByText("👋 Welcome to your Scratchpad (Quick Tour)")
      ).toBeInTheDocument();
    });

    const editor = screen.getByTestId("scratchpad-content-editor");
    editor.innerHTML = "<ul><li>First item</li><li>Second item</li></ul>";

    const firstItem = editor.querySelector("li")!;
    const range = document.createRange();
    range.setStart(firstItem.firstChild!, 1);
    range.collapse(true);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    const checklistButton = within(
      screen.getByTestId("scratchpad-format-toolbar")
    ).getByRole("button", { name: "Checklist" });
    fireEvent.mouseDown(checklistButton);
    fireEvent.click(checklistButton);

    const list = editor.querySelector("ul")!;
    const checkboxes = editor.querySelectorAll<HTMLInputElement>(
      "input[type='checkbox']"
    );
    expect(list).toHaveAttribute("data-checklist", "true");
    expect(checkboxes).toHaveLength(2);

    checkboxes[0].checked = true;
    fireEvent.change(checkboxes[0]);
    expect(list.querySelector("li")).toHaveAttribute("data-checked", "true");
    expect(checkboxes[0]).toHaveAttribute("checked");
  });

  it("adds a new unchecked checklist item when pressing Enter", async () => {
    renderWithProviders(
      <PersonalScratchpadModal open={true} onClose={vi.fn()} />
    );

    await waitFor(() => {
      expect(
        screen.getByText("👋 Welcome to your Scratchpad (Quick Tour)")
      ).toBeInTheDocument();
    });

    const editor = screen.getByTestId("scratchpad-content-editor");
    editor.innerHTML =
      '<ul data-checklist="true"><li data-checked="false">' +
      '<input type="checkbox" contenteditable="false"> Item one</li></ul>';

    const firstItem = editor.querySelector("li")!;
    const textNode = Array.from(firstItem.childNodes).find(
      (node) =>
        node.nodeType === Node.TEXT_NODE &&
        node.textContent?.includes("Item one")
    );
    expect(textNode).toBeTruthy();

    const range = document.createRange();
    range.setStart(textNode!, textNode!.textContent!.length);
    range.collapse(true);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    fireEvent.keyDown(editor, { key: "Enter" });

    const items = editor.querySelectorAll("li");
    expect(items).toHaveLength(2);
    const secondItem = items[1];
    expect(secondItem).toHaveAttribute("data-checked", "false");
    expect(secondItem.firstChild).toBeInstanceOf(HTMLInputElement);
    expect(
      secondItem.querySelector('input[type="checkbox"]')
    ).not.toBeChecked();
  });

  it("allows creating a new note and calls API", async () => {
    (scratchpadApi.createScratchpad as any).mockResolvedValue({
      id: "new-server-id",
      title: "Untitled Scratchpad",
      content: "",
      color: "#fef3c7",
      pinned: false,
      updatedAt: new Date().toISOString(),
    });

    renderWithProviders(
      <PersonalScratchpadModal open={true} onClose={vi.fn()} />
    );

    const newNoteBtn = screen.getByText("New Note");
    fireEvent.click(newNoteBtn);

    expect(screen.getByPlaceholderText("Note Title...")).toBeInTheDocument();
    expect(scratchpadApi.createScratchpad).toHaveBeenCalled();
  });

  it("allows editing note title", async () => {
    renderWithProviders(
      <PersonalScratchpadModal open={true} onClose={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText("👋 Welcome to your Scratchpad (Quick Tour)")).toBeInTheDocument();
    });

    const titleInput = screen.getByPlaceholderText("Note Title...");
    fireEvent.change(titleInput, { target: { value: "Edited Quick Tour" } });

    expect(titleInput).toHaveValue("Edited Quick Tour");
  });

  it("merges title and content edits into one pending server update", async () => {
    renderWithProviders(
      <PersonalScratchpadModal open={true} onClose={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText("👋 Welcome to your Scratchpad (Quick Tour)")).toBeInTheDocument();
    });

    const titleInput = screen.getByPlaceholderText("Note Title...");
    fireEvent.change(titleInput, { target: { value: "Merged title" } });

    const editor = screen.getByTestId("scratchpad-content-editor");
    editor.innerHTML = "<div>Merged body</div>";
    fireEvent.input(editor);

    await waitFor(
      () => {
        expect(scratchpadApi.updateScratchpad).toHaveBeenCalledTimes(1);
      },
      { timeout: 2000 }
    );

    const [, updates] = (scratchpadApi.updateScratchpad as any).mock.calls[0];
    expect(updates).toMatchObject({
      title: "Merged title",
      content: "<div>Merged body</div>",
    });
  });
});
