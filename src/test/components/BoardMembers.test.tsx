import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { BoardMembers } from "@/components/board/BoardMembers";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { boardApi } from "@/services/boardApi";
import { BoardMember } from "@/types/board";

vi.mock("@/services/boardApi", () => ({
  boardApi: {
    getMembers: vi.fn(),
    removeMember: vi.fn(),
    updateMemberRole: vi.fn(),
    getBoard: vi.fn(),
  },
}));

vi.mock("@/hooks/useBoards", () => ({
  useBoards: () => ({
    boards: [
      {
        id: "board-1",
        name: "Test Board",
        ownerId: "owner-user-id",
      },
    ],
  }),
}));

const mockMembers: BoardMember[] = [
  {
    id: "mem-1",
    boardId: "board-1",
    userId: "owner-user-id",
    role: "owner",
    status: "accepted",
    createdAt: new Date().toISOString(),
    user: {
      id: "owner-user-id",
      email: "owner@example.com",
      fullName: "Owner User",
      createdAt: new Date().toISOString(),
    },
  },
  {
    id: "mem-2",
    boardId: "board-1",
    userId: mockUser.id,
    role: "member",
    status: "accepted",
    createdAt: new Date().toISOString(),
    user: mockUser,
  },
  {
    id: "mem-3",
    boardId: "board-1",
    userId: "pending-user-id",
    role: "viewer",
    status: "pending",
    createdAt: new Date().toISOString(),
    user: {
      id: "pending-user-id",
      email: "pending@example.com",
      fullName: "Pending Colleague",
      createdAt: new Date().toISOString(),
    },
  },
];

describe("BoardMembers Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders member names, emails, and Pending badge for pending invites", async () => {
    vi.mocked(boardApi.getMembers).mockResolvedValue(mockMembers);

    renderWithProviders(<BoardMembers boardId="board-1" />, { user: mockUser });

    await waitFor(() => {
      expect(screen.getByText("Owner User")).toBeInTheDocument();
      expect(screen.getByText("Pending Colleague")).toBeInTheDocument();
      expect(screen.getByText("Pending")).toBeInTheDocument();
      expect(screen.getByText("You")).toBeInTheDocument();
    });
  });

  it("renders Leave button for current non-owner member and handles leave action", async () => {
    vi.mocked(boardApi.getMembers).mockResolvedValue(mockMembers);
    vi.mocked(boardApi.removeMember).mockResolvedValue();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderWithProviders(<BoardMembers boardId="board-1" />, { user: mockUser });

    const leaveBtn = await screen.findByRole("button", { name: /leave/i });
    expect(leaveBtn).toBeInTheDocument();

    fireEvent.click(leaveBtn);

    await waitFor(() => {
      expect(boardApi.removeMember).toHaveBeenCalledWith("board-1", mockUser.id);
    });
  });
});
