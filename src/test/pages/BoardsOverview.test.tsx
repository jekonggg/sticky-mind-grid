import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent, within } from "@testing-library/react";
import BoardsOverview from "@/pages/BoardsOverview";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { boardApi } from "@/services/boardApi";
import { BoardInvitation } from "@/types/board";

import { useBoards } from "@/hooks/useBoards";

vi.mock("@/services/boardApi", () => ({
  boardApi: {
    getBoards: vi.fn().mockResolvedValue([]),
    getPendingInvitations: vi.fn().mockResolvedValue([]),
    acceptInvitation: vi.fn(),
    declineInvitation: vi.fn(),
    reportInvitation: vi.fn(),
    leaveBoard: vi.fn(),
  },
}));

vi.mock("@/services/notificationApi", () => ({
  notificationApi: {
    getNotifications: vi.fn().mockResolvedValue({ notifications: [], unreadCount: 0 }),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}));

vi.mock("@/hooks/useBoards", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useBoards")>();
  return {
    ...actual,
    useBoards: vi.fn(() => ({
      boards: [
        {
          id: "board-1",
          name: "My First Board",
          ownerId: mockUser.id,
          role: "owner",
          emoji: "🚀",
          color: "hsl(220, 80%, 56%)",
          columns: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      loading: false,
      search: "",
      setSearch: vi.fn(),
      sort: "updated",
      setSort: vi.fn(),
      createBoard: vi.fn(),
      updateBoard: vi.fn(),
      deleteBoard: vi.fn(),
    })),
  };
});

const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

const mockInvitations: BoardInvitation[] = [
  {
    id: "invite-1",
    boardId: "board-collab",
    role: "member",
    status: "pending",
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: threeDaysFromNow,
    board: {
      id: "board-collab",
      name: "Team Roadmap 2026",
      emoji: "🌟",
      description: "Confidential description that must not leak before acceptance",
      color: "hsl(140, 70%, 50%)",
      ownerName: "Alice Director",
    },
  },
];

describe("BoardsOverview Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(boardApi.getPendingInvitations).mockResolvedValue([]);
    vi.mocked(useBoards).mockReturnValue({
      boards: [
        {
          id: "board-1",
          name: "My First Board",
          ownerId: mockUser.id,
          role: "owner",
          emoji: "🚀",
          color: "hsl(220, 80%, 56%)",
          columns: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      loading: false,
      search: "",
      setSearch: vi.fn(),
      sort: "updated",
      setSort: vi.fn(),
      createBoard: vi.fn(),
      updateBoard: vi.fn(),
      deleteBoard: vi.fn(),
    });
  });

  it("renders Pending Board Invitations banner with expiry, role, inviter, and never board description", async () => {
    vi.mocked(boardApi.getPendingInvitations).mockResolvedValue(mockInvitations);

    renderWithProviders(<BoardsOverview />);

    await waitFor(() => {
      expect(screen.getByText(/Pending Board Invitations \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText("Team Roadmap 2026")).toBeInTheDocument();
      expect(screen.getByText(/Alice Director/i)).toBeInTheDocument();
      expect(screen.getByText("Editor")).toBeInTheDocument();
      expect(screen.getByTestId("invite-expiry")).toHaveTextContent(/expires in 3 days/i);
    });

    // Tenancy rule: description must never be shown before acceptance
    expect(
      screen.queryByText("Confidential description that must not leak before acceptance")
    ).not.toBeInTheDocument();
  });

  it("triggers acceptInvitation when Accept is clicked", async () => {
    vi.mocked(boardApi.getPendingInvitations).mockResolvedValue(mockInvitations);
    vi.mocked(boardApi.acceptInvitation).mockResolvedValue({
      id: "mem-accepted",
      boardId: "board-collab",
      userId: mockUser.id,
      role: "member",
      status: "accepted",
      createdAt: new Date().toISOString(),
    });

    renderWithProviders(<BoardsOverview />);

    const acceptBtn = await screen.findByRole("button", { name: /accept/i });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(boardApi.acceptInvitation).toHaveBeenCalledWith("board-collab");
    });
  });

  it("triggers reportInvitation when Report or block inviter is clicked", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(boardApi.getPendingInvitations).mockResolvedValue(mockInvitations);
    vi.mocked(boardApi.reportInvitation).mockResolvedValue({ message: "Reported" });

    renderWithProviders(<BoardsOverview />);

    const reportBtn = await screen.findByRole("button", { name: /report or block inviter/i });
    fireEvent.click(reportBtn);

    await waitFor(() => {
      expect(boardApi.reportInvitation).toHaveBeenCalledWith("board-collab");
    });
  });

  it("filters boards by All, Owned by me, and Shared with me tabs", () => {
    vi.mocked(useBoards).mockReturnValue({
      boards: [
        {
          id: "board-owned",
          name: "Personal Roadmap",
          ownerId: mockUser.id,
          role: "owner",
          color: "hsl(220, 80%, 56%)",
          columns: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "board-shared",
          name: "Client Portal",
          ownerId: "user-999",
          role: "editor",
          color: "hsl(142, 60%, 45%)",
          columns: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      loading: false,
      search: "",
      setSearch: vi.fn(),
      sort: "updated",
      setSort: vi.fn(),
      createBoard: vi.fn(),
      updateBoard: vi.fn(),
      deleteBoard: vi.fn(),
    });

    renderWithProviders(<BoardsOverview />, { user: mockUser });

    // All tab shows both boards
    expect(screen.getByText("Personal Roadmap")).toBeInTheDocument();
    expect(screen.getByText("Client Portal")).toBeInTheDocument();

    // Owned by me tab shows only owned board
    fireEvent.click(screen.getByTestId("filter-tab-owned"));
    expect(screen.getByText("Personal Roadmap")).toBeInTheDocument();
    expect(screen.queryByText("Client Portal")).not.toBeInTheDocument();

    // Shared with me tab shows only shared board
    fireEvent.click(screen.getByTestId("filter-tab-shared"));
    expect(screen.queryByText("Personal Roadmap")).not.toBeInTheDocument();
    expect(screen.getByText("Client Portal")).toBeInTheDocument();
  });

  it("pins and unpins a board into the Pinned Boards row at the top", () => {
    renderWithProviders(<BoardsOverview />, { user: mockUser });

    expect(screen.queryByTestId("pinned-boards-section")).not.toBeInTheDocument();

    const pinBtn = screen.getByRole("button", { name: "Pin board" });
    fireEvent.click(pinBtn);

    const pinnedSection = screen.getByTestId("pinned-boards-section");
    expect(pinnedSection).toBeInTheDocument();
    expect(within(pinnedSection).getByText("My First Board")).toBeInTheDocument();

    const unpinBtn = within(pinnedSection).getByRole("button", { name: "Unpin board" });
    fireEvent.click(unpinBtn);
    expect(screen.queryByTestId("pinned-boards-section")).not.toBeInTheDocument();
  });

  it("distinguishes empty state variants and shows pending invites above empty state when user has zero boards", async () => {
    vi.mocked(boardApi.getPendingInvitations).mockResolvedValue(mockInvitations);
    vi.mocked(useBoards).mockReturnValue({
      boards: [],
      allBoards: [],
      loading: false,
      search: "",
      setSearch: vi.fn(),
      sort: "updated",
      setSort: vi.fn(),
      createBoard: vi.fn(),
      updateBoard: vi.fn(),
      deleteBoard: vi.fn(),
    });

    const { unmount } = renderWithProviders(<BoardsOverview />, { user: mockUser });

    // 1. No boards yet + pending invites shown above empty state
    await waitFor(() => {
      expect(screen.getByTestId("pending-invitations-banner")).toBeInTheDocument();
      expect(screen.getByTestId("empty-state-no-boards")).toBeInTheDocument();
      expect(screen.getByText("No boards yet")).toBeInTheDocument();
    });

    // 2. Switching filter to "Shared with me" shows "No boards match this filter"
    fireEvent.click(screen.getByTestId("filter-tab-shared"));
    expect(screen.getByTestId("empty-state-filter")).toBeInTheDocument();
    expect(screen.getByText("No boards match this filter")).toBeInTheDocument();

    unmount();

    // 3. Active search query with 0 results shows "No search results"
    vi.mocked(useBoards).mockReturnValue({
      boards: [],
      allBoards: [],
      loading: false,
      search: "nonexistent",
      setSearch: vi.fn(),
      sort: "updated",
      setSort: vi.fn(),
      createBoard: vi.fn(),
      updateBoard: vi.fn(),
      deleteBoard: vi.fn(),
    });

    renderWithProviders(<BoardsOverview />, { user: mockUser });
    expect(screen.getByTestId("empty-state-search")).toBeInTheDocument();
    expect(screen.getByText("No search results")).toBeInTheDocument();
  });

  it("renders BoardsOverviewSkeleton when boards are loading", () => {
    vi.mocked(useBoards).mockReturnValue({
      boards: [],
      loading: true,
      search: "",
      setSearch: vi.fn(),
      sort: "updated",
      setSort: vi.fn(),
      createBoard: vi.fn(),
      updateBoard: vi.fn(),
      deleteBoard: vi.fn(),
    });

    renderWithProviders(<BoardsOverview />);
    expect(screen.getByRole("status", { name: "Loading boards" })).toBeInTheDocument();
  });
});
