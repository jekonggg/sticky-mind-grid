import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { TaskDescription } from "@/components/task/TaskDescription";
import { renderWithProviders } from "@/test/test-utils";

describe("TaskDescription Component", () => {
  it("renders description in read-only mode without edit textarea or action buttons", () => {
    renderWithProviders(
      <TaskDescription
        description="Initial description notes"
        readOnly={true}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText("Initial description notes")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
  });

  it("shows Save and Cancel buttons when user edits description and calls onChange on Save", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <TaskDescription
        description="Initial description notes"
        readOnly={false}
        onChange={onChange}
      />
    );

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue("Initial description notes");

    // Initially when pristine, Save/Cancel are hidden
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();

    // Type new notes
    fireEvent.change(textarea, { target: { value: "Updated description notes" } });

    // Save and Cancel buttons now appear
    const saveBtn = screen.getByRole("button", { name: /save/i });
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    expect(saveBtn).toBeInTheDocument();
    expect(cancelBtn).toBeInTheDocument();

    // Click Save
    fireEvent.click(saveBtn);
    expect(onChange).toHaveBeenCalledWith("Updated description notes");
  });

  it("reverts back to original description when clicking Cancel", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <TaskDescription
        description="Original text"
        readOnly={false}
        onChange={onChange}
      />
    );

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Changed text" } });

    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(onChange).not.toHaveBeenCalled();
    expect(textarea).toHaveValue("Original text");
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
  });
});
