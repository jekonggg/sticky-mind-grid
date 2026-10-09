import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PillNavBar, PillNavItem } from "@/components/common/PillNavBar";
import { LayoutGrid01 as LayoutGrid, List, Calendar, File06 as FileText, BarChart01 as BarChart3, Users01 as Users } from "@untitledui/icons";

describe("PillNavBar Component", () => {
  const mockItems: PillNavItem[] = [
    { id: "board", label: "Board", icon: LayoutGrid },
    { id: "list", label: "List", icon: List },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "documents", label: "Docs", icon: FileText },
    { id: "overview", label: "Analytics", icon: BarChart3 },
    { id: "members", label: "Team", icon: Users, badge: 5 },
  ];

  it("renders all navigation items and badge", () => {
    const handleChange = vi.fn();
    render(
      <PillNavBar
        items={mockItems}
        activeId="board"
        onChange={handleChange}
        accentColor="violet"
      />
    );

    expect(screen.getByText("Board")).toBeInTheDocument();
    expect(screen.getByText("List")).toBeInTheDocument();
    expect(screen.getByText("Calendar")).toBeInTheDocument();
    expect(screen.getByText("Docs")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("sets active item with aria-selected true and tabIndex 0", () => {
    const handleChange = vi.fn();
    render(
      <PillNavBar
        items={mockItems}
        activeId="board"
        onChange={handleChange}
      />
    );

    const boardTab = screen.getByRole("tab", { name: /board/i });
    const listTab = screen.getByRole("tab", { name: /list/i });

    expect(boardTab).toHaveAttribute("aria-selected", "true");
    expect(boardTab).toHaveAttribute("tabindex", "0");
    expect(listTab).toHaveAttribute("aria-selected", "false");
    expect(listTab).toHaveAttribute("tabindex", "-1");
  });

  it("calls onChange when an inactive tab is clicked", () => {
    const handleChange = vi.fn();
    render(
      <PillNavBar
        items={mockItems}
        activeId="board"
        onChange={handleChange}
      />
    );

    const analyticsTab = screen.getByRole("tab", { name: /analytics/i });
    fireEvent.click(analyticsTab);

    expect(handleChange).toHaveBeenCalledWith("overview");
  });
});
