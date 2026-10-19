import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppLayout } from "@/components/layout/AppLayout";
import { BoardHeader } from "@/components/kanban/BoardHeader";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { boardApi } from "@/services/boardApi";
import { taskApi } from "@/services/api";

// Mock boardApi, taskApi, messageApi
vi.mock("@/services/boardApi", () => ({
  boardApi: {
    getBoards: vi.fn(),
    getPendingInvitations: vi.fn(),
    createBoard: vi.fn(),
  },
}));

vi.mock("@/services/api", () => ({
  taskApi: {
    getTasks: vi.fn(),
  },
}));

vi.mock("@/services/messageApi", () => ({
  messageApi: {
    getUnreadCount: vi.fn().mockResolvedValue({ unreadCount: 3 }),
  },
}));

describe("AppSidebar Component", () => {
  const mockBoards = [
    {
      id: "board-1",
      name: "Engineering Sprint",
      emoji: "🚀",
      color: "#3b82f6",
      ownerId: mockUser.id,
      columns: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "board-2",
      name: "Design System",
      emoji: "🎨",
      color: "#ec4899",
      ownerId: mockUser.id,
      columns: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (boardApi.getBoards as any).mockResolvedValue(mockBoards);
    (taskApi.getTasks as any).mockResolvedValue([
      { id: "t-1", title: "Task 1", status: "todo" },
      { id: "t-2", title: "Task 2", status: "in_progress" },
      { id: "t-3", title: "Task 3", status: "done" },
      { id: "t-4", title: "Task 4", status: "todo" },
    ]);
    (boardApi.getPendingInvitations as any).mockResolvedValue([
      { id: "invite-1", boardId: "board-3", boardName: "Marketing", inviterName: "Alice", role: "member", status: "pending", createdAt: new Date().toISOString() }
    ]);
  });

  it("renders workspace & user profile details", () => {
    renderWithProviders(
      <AppSidebar isCollapsed={false} onToggleCollapse={vi.fn()} />
    );

    expect(screen.getByText(mockUser.fullName)).toBeInTheDocument();
    expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    expect(screen.getByText(/workspace/i)).toBeInTheDocument();
  });

  it("renders all PAGES navigation items including Messages", () => {
    renderWithProviders(
      <AppSidebar isCollapsed={false} onToggleCollapse={vi.fn()} />
    );

    expect(screen.getByText("PAGES")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Boards")).toBeInTheDocument();
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Calendar")).toBeInTheDocument();
    expect(screen.getByText("Teams")).toBeInTheDocument();
    expect(screen.getByText("Messages")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders expandable board items dynamically", async () => {
    renderWithProviders(
      <AppSidebar isCollapsed={false} onToggleCollapse={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText("Engineering Sprint")).toBeInTheDocument();
      expect(screen.getByText("Design System")).toBeInTheDocument();
    });
  });

  it("renders FILES section with Board Files and Personal Files", () => {
    renderWithProviders(
      <AppSidebar isCollapsed={false} onToggleCollapse={vi.fn()} />
    );

    expect(screen.getByText("FILES")).toBeInTheDocument();
    expect(screen.getByText("Board Files")).toBeInTheDocument();
    expect(screen.getByText("Personal Files")).toBeInTheDocument();
  });

  it("renders bottom 3-way theme selector (Light, Dark, Auto) and collapse sidebar button", () => {
    const onToggleCollapse = vi.fn();
    renderWithProviders(
      <AppSidebar isCollapsed={false} onToggleCollapse={onToggleCollapse} />
    );

    expect(screen.getByTestId("sidebar-theme-light-btn")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-theme-dark-btn")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-theme-system-btn")).toBeInTheDocument();

    // Clicking theme buttons switches active theme
    fireEvent.click(screen.getByTestId("sidebar-theme-dark-btn"));

    const collapseBtn = screen.getByText("Collapse Sidebar");
    expect(collapseBtn).toBeInTheDocument();

    fireEvent.click(collapseBtn);
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it("renders collapsed theme selector in rail mode", () => {
    renderWithProviders(
      <AppSidebar isCollapsed={true} onToggleCollapse={vi.fn()} />
    );

    const collapsedThemeBtn = screen.getByTestId("sidebar-theme-collapsed-btn");
    expect(collapsedThemeBtn).toBeInTheDocument();
  });

  it("opens personal scratchpad when clicking Open Scratchpad", async () => {
    renderWithProviders(
      <AppSidebar isCollapsed={false} onToggleCollapse={vi.fn()} />
    );

    // Expand Personal Files section if collapsed
    const personalFilesHeader = screen.getByText("Personal Files");
    fireEvent.click(personalFilesHeader);

    await waitFor(() => {
      const scratchpadBtn = screen.getByText("Open Scratchpad");
      expect(scratchpadBtn).toBeInTheDocument();
      fireEvent.click(scratchpadBtn);
    });

    await waitFor(() => {
      expect(screen.getByText("Personal Files & Scratchpad")).toBeInTheDocument();
    });
  });

  it("renders aggregated task attachments under Board Files", async () => {
    (taskApi.getTasks as any).mockResolvedValue([
      {
        id: "t-1",
        boardId: "board-1",
        title: "Task with Attachments",
        status: "todo",
        attachments: [
          { id: "att-1", name: "diagram.png", url: "/api/files/diagram.png", type: "image/png", size: "20 KB" },
          { id: "att-2", name: "spec.pdf", url: "/api/files/spec.pdf", type: "application/pdf", size: "150 KB" }
        ]
      }
    ]);

    renderWithProviders(
      <AppSidebar isCollapsed={false} onToggleCollapse={vi.fn()} boardId="board-1" />
    );

    // Expand Board Files section
    const boardFilesHeader = screen.getByText("Board Files");
    fireEvent.click(boardFilesHeader);

    expect(await screen.findByText("diagram.png")).toBeInTheDocument();
    expect(screen.getByText("spec.pdf")).toBeInTheDocument();
    expect(screen.getByText(/Task Files \(2\)/)).toBeInTheDocument();
  });

  it("renders numerical notification badges for Boards, Tasks, Messages, and Personal Files", async () => {
    renderWithProviders(
      <AppSidebar isCollapsed={false} onToggleCollapse={vi.fn()} />
    );

    // Wait for boards count badges (mockBoards length is 2, personalNotesCount is 2)
    await waitFor(() => {
      const badgesWithTwo = screen.getAllByText("2");
      expect(badgesWithTwo.length).toBeGreaterThanOrEqual(2);
    });

    // Tasks count badge (mockTasks length is 4)
    await waitFor(() => {
      expect(screen.getByText("4")).toBeInTheDocument();
    });

    // Unread messages count badge (unreadCount is 3)
    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  it("opens New Chat modal when clicking Plus button on Messages", async () => {
    renderWithProviders(
      <AppSidebar isCollapsed={false} onToggleCollapse={vi.fn()} />
    );

    const newChatBtn = screen.getByTitle("New Message / Chat");
    expect(newChatBtn).toBeInTheDocument();
    fireEvent.click(newChatBtn);

    await waitFor(() => {
      expect(screen.getByText("New Conversation")).toBeInTheDocument();
    });
  });

  it("centers all icons uniformly without conflicting justify-between or px-2.5 classes when collapsed", () => {
    const { container } = renderWithProviders(
      <AppSidebar isCollapsed={true} onToggleCollapse={vi.fn()} />
    );

    const aside = container.querySelector("aside");
    expect(aside).toHaveClass("w-[68px]");

    // Every interactive row with justify-center must not also have justify-between or px-2.5
    const centeredElements = aside?.querySelectorAll(".justify-center") ?? [];
    expect(centeredElements.length).toBeGreaterThan(0);
    centeredElements.forEach((el) => {
      expect(el).not.toHaveClass("justify-between");
      expect(el).not.toHaveClass("px-2.5");
    });
  });

  it("keeps the search button visible when collapsed and forces the sidebar to expand when clicked", () => {
    const onToggleCollapse = vi.fn();
    const onOpenSearch = vi.fn();

    renderWithProviders(
      <AppSidebar
        isCollapsed={true}
        onToggleCollapse={onToggleCollapse}
        onOpenSearch={onOpenSearch}
      />
    );

    const searchBtn = screen.getByRole("button", { name: /quick search/i });
    expect(searchBtn).toBeInTheDocument();
    expect(searchBtn).toHaveClass("h-8");

    fireEvent.click(searchBtn);
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
    expect(onOpenSearch).not.toHaveBeenCalled();
  });

  it("renders consolidated User menu dropdown with settings, My Boards, Developer Suite, and Log Out (without theme switcher)", async () => {
    renderWithProviders(
      <AppSidebar isCollapsed={false} onToggleCollapse={vi.fn()} />
    );

    const userMenuBtn = screen.getByRole("button", { name: /user menu/i });
    expect(userMenuBtn).toBeInTheDocument();

    fireEvent.keyDown(userMenuBtn, { key: "Enter" });

    expect(await screen.findByText("Account Profile")).toBeInTheDocument();
    expect(screen.getByText("Appearance & Theme")).toBeInTheDocument();
    expect(screen.getByText("All Settings")).toBeInTheDocument();
    expect(screen.getByText("My Boards")).toBeInTheDocument();
    expect(screen.getByText("Developer Suite")).toBeInTheDocument();
    expect(screen.getByText("Log Out")).toBeInTheDocument();

    // Theme selector is on the main sidebar footer, not inside the user menu dropdown
    const userDropdown = screen.getByRole("menu");
    expect(within(userDropdown).queryByText(/light/i)).not.toBeInTheDocument();
    expect(within(userDropdown).queryByText(/dark/i)).not.toBeInTheDocument();
    expect(within(userDropdown).queryByText(/auto/i)).not.toBeInTheDocument();

    // Profile card is not duplicated inside the dropdown
    expect(screen.getAllByText(mockUser.fullName)).toHaveLength(1);
    expect(screen.getAllByText(mockUser.email)).toHaveLength(1);
  });

  it("does not render a duplicate User menu avatar in BoardHeader", () => {
    renderWithProviders(<BoardHeader />);

    expect(screen.queryByRole("button", { name: /user menu/i })).not.toBeInTheDocument();
  });

  it("does not render BottomNavBar in AppLayout and retains the mobile hamburger button to open the drawer", async () => {
    renderWithProviders(
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<BoardHeader />} />
        </Route>
      </Routes>
    );

    // Bottom navigation bar should not be rendered in AppLayout
    expect(
      screen.queryByRole("navigation", { name: /Mobile Bottom Navigation/i })
    ).not.toBeInTheDocument();

    // Hamburger button is retained and opens the mobile Sheet drawer
    const hamburgerBtn = screen.getByRole("button", { name: /open menu/i });
    expect(hamburgerBtn).toBeInTheDocument();

    fireEvent.click(hamburgerBtn);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Close ('X') button is eliminated from the mobile sidebar drawer
    expect(
      screen.queryByRole("button", { name: /close/i })
    ).not.toBeInTheDocument();
  });
});
