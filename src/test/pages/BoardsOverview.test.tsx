import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import BoardsOverview from "@/pages/BoardsOverview";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { boardApi } from "@/services/boardApi";
import { BoardInvitation } from "@/types/board";

vi.mock("@/services/boardApi", () => ({
  boardApi: {
    getBoards: vi.fn().mockResolvedValue([]),
    getPendingInvitations: vi.fn(),
    acceptInvitation: vi.fn(),
    declineInvitation: vi.fn(),
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

vi.mock("@/hooks/useBoards", () => ({
  useBoards: () => ({
    boards: [
      {
        id: "board-1",
        name: "My First Board",
        ownerId: mockUser.id,
        emoji: "🚀",
        color: "hsl(220, 80%, 56%)",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
  }),
}));

const mockInvitations: BoardInvitation[] = [
  {
    id: "invite-1",
    boardId: "board-collab",
    role: "member",
    status: "pending",
    createdAt: new Date().toISOString(),
    board: {
      id: "board-collab",
      name: "Team Roadmap 2026",
      emoji: "🌟",
      color: "hsl(140, 70%, 50%)",
      ownerName: "Alice Director",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
];

describe("BoardsOverview Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Pending Board Invitations banner when invitations exist", async () => {
    vi.mocked(boardApi.getPendingInvitations).mockResolvedValue(mockInvitations);

    renderWithProviders(<BoardsOverview />);

    await waitFor(() => {
      expect(screen.getByText(/Pending Board Invitations \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText("Team Roadmap 2026")).toBeInTheDocument();
      expect(screen.getByText(/Alice Director/i)).toBeInTheDocument();
    });
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
});
