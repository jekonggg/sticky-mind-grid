import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent, within } from "@testing-library/react";
import TeamsPage from "@/pages/TeamsPage";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { boardApi } from "@/services/boardApi";
import { userApi } from "@/services/userApi";

vi.mock("@/services/boardApi", () => ({
  boardApi: {
    getBoards: vi.fn(),
    getPendingInvitations: vi.fn(),
    getSentInvitations: vi.fn(),
    acceptInvitation: vi.fn(),
    declineInvitation: vi.fn(),
    resendInvite: vi.fn(),
    revokeInvitation: vi.fn(),
  },
}));

vi.mock("@/services/userApi", () => ({
  userApi: {
    getTeammates: vi.fn(),
    getPreferences: vi.fn().mockResolvedValue({}),
    updatePreferences: vi.fn().mockResolvedValue({}),
  },
}));

describe("TeamsPage", () => {
  const mockBoards = [
    {
      id: "board-1",
      name: "Engineering Sprint",
      emoji: "🚀",
      color: "#3b82f6",
      ownerId: mockUser.id,
      role: "owner",
      columns: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockTeammates = [
    {
      id: "user-456",
      email: "sarah@example.com",
      fullName: "Sarah Connor",
      role: "admin",
      sharedBoards: [
        { id: "board-1", name: "Engineering Sprint", emoji: "🚀", role: "admin" },
      ],
    },
  ];

  const mockSentInvitations = [
    {
      id: "invite-1",
      boardId: "board-1",
      role: "editor",
      status: "pending",
      email: "colleague@example.com",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
      board: {
        id: "board-1",
        name: "Engineering Sprint",
        emoji: "🚀",
        color: "#3b82f6",
        ownerName: "Owner User",
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (boardApi.getBoards as any).mockResolvedValue(mockBoards);
    (boardApi.getPendingInvitations as any).mockResolvedValue([]);
    (boardApi.getSentInvitations as any).mockResolvedValue([]);
    (boardApi.resendInvite as any).mockResolvedValue({ message: "Resent" });
    (boardApi.revokeInvitation as any).mockResolvedValue({ message: "Revoked" });
    (userApi.getTeammates as any).mockResolvedValue(mockTeammates);
  });

  it("renders teams directory and shared boards", async () => {
    renderWithProviders(<TeamsPage />);

    // Initially displays skeleton
    expect(screen.getByRole("status", { name: "Loading team directory" })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Teams & Collaborators")).toBeInTheDocument();
      expect(screen.getByText(/workspace boards/i)).toBeInTheDocument();
      expect(screen.getByText("Sarah Connor")).toBeInTheDocument();
      expect(screen.getByText("sarah@example.com")).toBeInTheDocument();
    });
  });

  it("renders pending teammate invitations with invited board name, emoji, and role", async () => {
    (boardApi.getSentInvitations as any).mockResolvedValue(mockSentInvitations);

    renderWithProviders(<TeamsPage />);

    await waitFor(() => {
      const container = screen.getByTestId("sent-invitations-container");
      expect(container).toBeInTheDocument();
      expect(within(container).getByText("Pending Teammate Invitations (1)")).toBeInTheDocument();
      expect(within(container).getByText("colleague@example.com")).toBeInTheDocument();
      expect(within(container).getByText("Pending")).toBeInTheDocument();
      expect(within(container).getByText("Engineering Sprint")).toBeInTheDocument();
      expect(within(container).getByText("🚀")).toBeInTheDocument();
    });
  });

  it("allows resending and revoking pending teammate invitations from TeamsPage", async () => {
    (boardApi.getSentInvitations as any).mockResolvedValue(mockSentInvitations);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderWithProviders(<TeamsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("sent-invitations-container")).toBeInTheDocument();
    });

    // Test Resend
    const resendBtn = screen.getByRole("button", { name: /resend/i });
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(boardApi.resendInvite).toHaveBeenCalledWith("board-1", "invite-1");
    });

    // Test Revoke
    const revokeBtn = screen.getByRole("button", { name: /revoke/i });
    fireEvent.click(revokeBtn);

    await waitFor(() => {
      expect(boardApi.revokeInvitation).toHaveBeenCalledWith("board-1", "invite-1");
    });
  });

  it("renders clean empty state without matching quotes when teammates list is empty and search untouched", async () => {
    (userApi.getTeammates as any).mockResolvedValue([]);

    renderWithProviders(<TeamsPage />);

    await waitFor(() => {
      expect(screen.getByText("No teammates found")).toBeInTheDocument();
      expect(screen.queryByText(/No teammates found matching ""/i)).not.toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /invite teammate/i }).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("hides invite buttons for roles that cannot invite members (editor, commenter, viewer)", async () => {
    (boardApi.getBoards as any).mockResolvedValue([
      {
        id: "board-editor",
        name: "Editor Board",
        emoji: "📝",
        color: "#10b981",
        ownerId: "someone-else",
        role: "editor",
        columns: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    renderWithProviders(<TeamsPage />);

    await waitFor(() => {
      expect(screen.getByText("Teams & Collaborators")).toBeInTheDocument();
    });

    // Both top header and board card invite buttons must be hidden
    expect(screen.queryByRole("button", { name: /invite teammate/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /invite/i })).not.toBeInTheDocument();
  });
});
