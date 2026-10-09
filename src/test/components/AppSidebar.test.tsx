import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { AppSidebar } from "@/components/layout/AppSidebar";
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

  it("renders bottom theme toggle and collapse sidebar button", () => {
    const onToggleCollapse = vi.fn();
    renderWithProviders(
      <AppSidebar isCollapsed={false} onToggleCollapse={onToggleCollapse} />
    );

    expect(screen.getByText(/mode/i)).toBeInTheDocument();
    const collapseBtn = screen.getByText("Collapse Sidebar");
    expect(collapseBtn).toBeInTheDocument();

    fireEvent.click(collapseBtn);
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
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
});
