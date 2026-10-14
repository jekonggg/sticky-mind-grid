import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
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

    expect(screen.getByText("Personal Files & Scratchpad")).toBeInTheDocument();
    expect(screen.getByText("New Note")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("👋 Welcome to your Scratchpad (Quick Tour)")).toBeInTheDocument();
      expect(screen.getByText("📋 Daily Standup & Planner")).toBeInTheDocument();
    });
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
});
