import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { PersonalScratchpadModal } from "@/components/documents/PersonalScratchpadModal";
import { renderWithProviders } from "@/test/test-utils";

describe("PersonalScratchpadModal", () => {
  it("renders when open and displays private scratchpad notes", () => {
    renderWithProviders(
      <PersonalScratchpadModal open={true} onClose={vi.fn()} />
    );

    expect(screen.getByText("Personal Files & Scratchpad")).toBeInTheDocument();
    expect(screen.getByText("New Note")).toBeInTheDocument();
  });

  it("allows creating a new note", () => {
    renderWithProviders(
      <PersonalScratchpadModal open={true} onClose={vi.fn()} />
    );

    const newNoteBtn = screen.getByText("New Note");
    fireEvent.click(newNoteBtn);

    expect(screen.getByPlaceholderText("Note Title...")).toBeInTheDocument();
  });
});
