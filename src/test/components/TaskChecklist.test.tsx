import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { TaskChecklist } from "@/components/task/TaskChecklist";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { ChecklistItem } from "@/types/task";

describe("TaskChecklist Component", () => {
  it("renders checklist items and progress percentage", () => {
    const items: ChecklistItem[] = [
      { id: "c-1", title: "Item 1", completed: true },
      { id: "c-2", title: "Item 2", completed: false },
    ];

    renderWithProviders(
      <TaskChecklist checklist={items} onChange={vi.fn()} />
    );

    expect(screen.getByText("1 of 2 completed (50%)")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Item 1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Item 2")).toBeInTheDocument();
  });

  it("toggles item and attaches completedBy user metadata when checked", () => {
    const onChange = vi.fn();
    const onProgressSync = vi.fn();
    const items: ChecklistItem[] = [
      { id: "c-1", title: "Incomplete Item", completed: false },
    ];

    renderWithProviders(
      <TaskChecklist
        checklist={items}
        onChange={onChange}
        onProgressSync={onProgressSync}
      />
    );

    const checkbox = screen.getByRole("button", { name: "" });
    fireEvent.click(checkbox);

    expect(onChange).toHaveBeenCalledTimes(1);
    const updatedItems: ChecklistItem[] = onChange.mock.calls[0][0];
    expect(updatedItems[0].completed).toBe(true);
    expect(updatedItems[0].completedBy).toEqual({
      id: mockUser.id,
      fullName: mockUser.fullName,
      email: mockUser.email,
      avatarUrl: undefined,
    });
    expect(updatedItems[0].completedAt).toBeDefined();
    expect(onProgressSync).toHaveBeenCalledWith(100);
  });

  it("clears completedBy when item is unchecked", () => {
    const onChange = vi.fn();
    const items: ChecklistItem[] = [
      {
        id: "c-1",
        title: "Done Item",
        completed: true,
        completedBy: {
          id: "u-99",
          fullName: "Other Member",
          email: "other@test.com",
        },
      },
    ];

    renderWithProviders(
      <TaskChecklist checklist={items} onChange={onChange} />
    );

    const checkbox = screen.getByRole("button", { name: "" });
    fireEvent.click(checkbox);

    expect(onChange).toHaveBeenCalledTimes(1);
    const updatedItems: ChecklistItem[] = onChange.mock.calls[0][0];
    expect(updatedItems[0].completed).toBe(false);
    expect(updatedItems[0].completedBy).toBeNull();
    expect(updatedItems[0].completedAt).toBeNull();
  });

  it("renders mini avatar chip for completed item with completedBy user", () => {
    const items: ChecklistItem[] = [
      {
        id: "c-1",
        title: "Verified subtask",
        completed: true,
        completedBy: {
          id: "u-1",
          fullName: "Ada Lovelace",
          email: "ada@example.com",
        },
        completedAt: new Date().toISOString(),
      },
    ];

    renderWithProviders(
      <TaskChecklist checklist={items} onChange={vi.fn()} />
    );

    const badge = screen.getByTestId("completed-by-c-1");
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toContain("Ada Lovelace");
  });

  it("allows adding a new subtask", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <TaskChecklist checklist={[]} onChange={onChange} />
    );

    const input = screen.getByPlaceholderText(/Add a subtask/i);
    fireEvent.change(input, { target: { value: "New subtask item" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledTimes(1);
    const addedItems: ChecklistItem[] = onChange.mock.calls[0][0];
    expect(addedItems.length).toBe(1);
    expect(addedItems[0].title).toBe("New subtask item");
    expect(addedItems[0].completed).toBe(false);
  });
});
