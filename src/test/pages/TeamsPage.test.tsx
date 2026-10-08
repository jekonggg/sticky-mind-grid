import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import TeamsPage from "@/pages/TeamsPage";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { boardApi } from "@/services/boardApi";
import { userApi } from "@/services/userApi";

vi.mock("@/services/boardApi", () => ({
  boardApi: {
    getBoards: vi.fn(),
    getPendingInvitations: vi.fn(),
    acceptInvitation: vi.fn(),
    declineInvitation: vi.fn(),
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

  beforeEach(() => {
    vi.clearAllMocks();
    (boardApi.getBoards as any).mockResolvedValue(mockBoards);
    (boardApi.getPendingInvitations as any).mockResolvedValue([]);
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
});
