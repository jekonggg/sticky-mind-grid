import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import {
  Skeleton,
  StatCardSkeleton,
  TableRowSkeleton,
  AvatarGroupSkeleton,
  TaskCardSkeleton,
  KanbanColumnSkeleton,
  BoardViewSkeleton,
  BoardCardSkeleton,
  BoardsOverviewSkeleton,
  TaskDetailSkeleton,
  TaskCommentsSkeleton,
  TasksPageSkeleton,
  DashboardSkeleton,
  CalendarPageSkeleton,
  TeamsPageSkeleton,
  ConversationListSkeleton,
  ChatAreaSkeleton,
  SidebarNavSkeleton,
  AppLayoutSkeleton,
} from "@/components/skeletons";
import { Table, TableBody } from "@/components/ui/table";

describe("Skeleton Loading System", () => {
  describe("Core Skeleton Primitive", () => {
    it("renders with default shimmer variant and status role", () => {
      const { container } = render(<Skeleton data-testid="skeleton" />);
      const el = container.firstChild as HTMLElement;
      expect(el).toBeInTheDocument();
      expect(el).toHaveAttribute("role", "status");
      expect(el).toHaveAttribute("aria-hidden", "true");
      expect(el.className).toContain("overflow-hidden");
    });

    it("renders with pulse variant", () => {
      const { container } = render(
        <Skeleton variant="pulse" data-testid="pulse-skeleton" />
      );
      const el = container.firstChild as HTMLElement;
      expect(el.className).toContain("animate-pulse");
    });
  });

  describe("Common Skeletons", () => {
    it("renders StatCardSkeleton", () => {
      const { container } = render(<StatCardSkeleton />);
      expect(container.firstChild).toHaveClass("bg-card");
    });

    it("renders TableRowSkeleton inside TableBody", () => {
      const { container } = render(
        <Table>
          <TableBody>
            <TableRowSkeleton />
          </TableBody>
        </Table>
      );
      expect(container.querySelector("tr")).toBeInTheDocument();
    });

    it("renders AvatarGroupSkeleton with custom count", () => {
      const { container } = render(<AvatarGroupSkeleton count={4} size="sm" />);
      const avatars = container.querySelectorAll("[role='status']");
      expect(avatars.length).toBe(4);
    });
  });

  describe("Board & Task Skeletons", () => {
    it("renders TaskCardSkeleton with and without cover", () => {
      const { rerender, container } = render(<TaskCardSkeleton hasCover={false} />);
      expect(container.firstChild).toBeInTheDocument();

      rerender(<TaskCardSkeleton hasCover={true} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it("renders KanbanColumnSkeleton with 3 cards", () => {
      const { container } = render(<KanbanColumnSkeleton cardCount={3} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it("renders BoardViewSkeleton with accessible role and label", () => {
      renderWithProviders(<BoardViewSkeleton />);
      expect(screen.getByRole("status", { name: "Loading board" })).toBeInTheDocument();
    });

    it("renders BoardCardSkeleton", () => {
      const { container } = render(<BoardCardSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it("renders BoardsOverviewSkeleton with accessible role and label", () => {
      renderWithProviders(<BoardsOverviewSkeleton />);
      expect(screen.getByRole("status", { name: "Loading boards" })).toBeInTheDocument();
    });

    it("renders TaskDetailSkeleton with accessible role and label", () => {
      renderWithProviders(<TaskDetailSkeleton />);
      expect(screen.getByRole("status", { name: "Loading task details" })).toBeInTheDocument();
    });

    it("renders TaskCommentsSkeleton", () => {
      const { container } = renderWithProviders(<TaskCommentsSkeleton count={3} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("Dashboard, Global Tasks & Calendar Skeletons", () => {
    it("renders DashboardSkeleton with accessible role and label", () => {
      renderWithProviders(<DashboardSkeleton />);
      expect(screen.getByRole("status", { name: "Loading dashboard" })).toBeInTheDocument();
    });

    it("renders TasksPageSkeleton in list and grid mode", () => {
      const { rerender } = renderWithProviders(<TasksPageSkeleton viewMode="list" />);
      expect(screen.getByRole("status", { name: "Loading tasks" })).toBeInTheDocument();

      rerender(<TasksPageSkeleton viewMode="grid" />);
      expect(screen.getByRole("status", { name: "Loading tasks" })).toBeInTheDocument();
    });

    it("renders CalendarPageSkeleton with accessible role and label", () => {
      renderWithProviders(<CalendarPageSkeleton />);
      expect(screen.getByRole("status", { name: "Loading calendar" })).toBeInTheDocument();
    });
  });

  describe("Teams & Messaging Skeletons", () => {
    it("renders TeamsPageSkeleton with accessible role and label", () => {
      renderWithProviders(<TeamsPageSkeleton />);
      expect(screen.getByRole("status", { name: "Loading team directory" })).toBeInTheDocument();
    });

    it("renders ConversationListSkeleton and ChatAreaSkeleton", () => {
      renderWithProviders(<ConversationListSkeleton />);
      expect(screen.getByRole("status", { name: "Loading conversations" })).toBeInTheDocument();

      renderWithProviders(<ChatAreaSkeleton />);
      expect(screen.getByRole("status", { name: "Loading chat" })).toBeInTheDocument();
    });
  });

  describe("Layout & Shell Skeletons", () => {
    it("renders SidebarNavSkeleton", () => {
      const { container } = renderWithProviders(<SidebarNavSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it("renders AppLayoutSkeleton with accessible role and label", () => {
      renderWithProviders(<AppLayoutSkeleton />);
      expect(screen.getByRole("status", { name: "Loading application" })).toBeInTheDocument();
    });
  });
});
