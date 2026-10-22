import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { PersonalScratchpadModal } from "@/components/documents/PersonalScratchpadModal";
import { renderWithProviders } from "@/test/test-utils";
import { scratchpadApi } from "@/services/scratchpadApi";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => true,
}));

vi.mock("@/services/scratchpadApi", () => ({
  scratchpadApi: {
    getScratchpads: vi.fn(),
    createScratchpad: vi.fn(),
    updateScratchpad: vi.fn(),
    deleteScratchpad: vi.fn(),
  },
}));

describe("PersonalScratchpadModal mobile navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (scratchpadApi.getScratchpads as any).mockResolvedValue([
      {
        id: "mobile-note-1",
        title: "Mobile Note",
        content: "Mobile content",
        color: "#fef3c7",
        pinned: false,
        updatedAt: new Date().toISOString(),
      },
    ]);
  });

  it("shows the note list first, then the editor, and returns with Back", async () => {
    renderWithProviders(
      <PersonalScratchpadModal open={true} onClose={vi.fn()} />
    );

    expect(screen.getByRole("heading", { name: "Scratchpad" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search notes...")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Note Title...")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Mobile Note/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Mobile Note/ }));

    expect(screen.getByPlaceholderText("Note Title...")).toHaveValue("Mobile Note");
    expect(screen.queryByPlaceholderText("Search notes...")).not.toBeInTheDocument();
    const toolbar = screen.getByTestId("scratchpad-format-toolbar");
    expect(toolbar).toHaveAttribute("data-placement", "bottom");
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
      expect(within(toolbar).getByRole("button", { name })).toBeInTheDocument();
    }
    expect(within(toolbar).getByLabelText("Font size")).toBeInTheDocument();
    expect(within(toolbar).getByLabelText("Text color")).toBeInTheDocument();
    expect(screen.getByTestId("scratchpad-content-editor")).toHaveTextContent(
      "Mobile content"
    );

    fireEvent.click(screen.getByRole("button", { name: "Back to notes" }));

    expect(screen.getByPlaceholderText("Search notes...")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Note Title...")).not.toBeInTheDocument();
  });
});
