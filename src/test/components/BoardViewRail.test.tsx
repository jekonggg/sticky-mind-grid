import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  BarChart01 as BarChart3,
  Calendar,
  File06 as FileText,
  LayoutGrid01 as LayoutGrid,
  List,
  Users01 as Users,
} from "@untitledui/icons";
import {
  BoardViewRail,
  type BoardViewRailItem,
} from "@/components/kanban/BoardViewRail";

const items: BoardViewRailItem[] = [
  { id: "board", label: "Board", icon: LayoutGrid },
  { id: "list", label: "List", icon: List },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "documents", label: "Docs & Files", icon: FileText },
  { id: "overview", label: "Analytics", icon: BarChart3 },
  { id: "members", label: "Team", icon: Users },
];

describe("BoardViewRail", () => {
  it("renders six icon-only accessible view controls", () => {
    render(
      <BoardViewRail items={items} activeId="board" onChange={vi.fn()} />
    );

    const rail = screen.getByRole("navigation", { name: "Board views" });
    expect(rail).toBeInTheDocument();

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(6);
    buttons.forEach((button) => {
      expect(button.querySelector("svg")).toBeInTheDocument();
      expect(button).toHaveTextContent("");
    });

    expect(screen.getByRole("button", { name: "Board" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Docs & Files" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analytics" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Team" })).toBeInTheDocument();
  });

  it("marks the active view and changes view on click", () => {
    const onChange = vi.fn();
    render(
      <BoardViewRail items={items} activeId="calendar" onChange={onChange} />
    );

    const calendarButton = screen.getByRole("button", { name: "Calendar" });
    expect(calendarButton).toHaveAttribute("aria-current", "page");

    const boardButton = screen.getByRole("button", { name: "Board" });
    expect(boardButton).not.toHaveAttribute("aria-current");

    fireEvent.click(boardButton);
    expect(onChange).toHaveBeenCalledWith("board");
  });

  it("keeps all six tabs in one fixed six-column row", () => {
    render(
      <BoardViewRail items={items} activeId="board" onChange={vi.fn()} />
    );

    const rail = screen.getByTestId("board-view-rail");
    expect(rail).toHaveClass("grid", "grid-cols-6", "md:hidden");
    expect(rail.querySelectorAll("button")).toHaveLength(6);
  });
});
