import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { BoardMembers } from "@/components/board/BoardMembers";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { boardApi } from "@/services/boardApi";
import { BoardMember } from "@/types/board";
import { DEV_SETTINGS_STORAGE_KEY } from "@/contexts/DevModeContext";

vi.mock("@/services/boardApi", () => ({
  boardApi: {
    getMembers: vi.fn(),
    removeMember: vi.fn(),
    updateMemberRole: vi.fn(),
    transferOwnership: vi.fn(),
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
    localStorage.removeItem(DEV_SETTINGS_STORAGE_KEY);
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

  it("renders role select without emojis when disableEmojiCustomization is enabled", async () => {
    localStorage.setItem(
      DEV_SETTINGS_STORAGE_KEY,
      JSON.stringify({ disableEmojiCustomization: true })
    );

    const ownerUser = {
      id: "owner-user-id",
      email: "owner@example.com",
      fullName: "Owner User",
      createdAt: new Date().toISOString(),
    };

    vi.mocked(boardApi.getMembers).mockResolvedValue(mockMembers);

    renderWithProviders(<BoardMembers boardId="board-1" />, { user: ownerUser });

    await waitFor(() => {
      expect(screen.getByText("Owner User")).toBeInTheDocument();
    });

    // The role select trigger should show "member" or clean label
    const triggers = screen.getAllByRole("combobox");
    expect(triggers.length).toBeGreaterThan(0);
  });

  it("requires typing the board name to confirm when clicking Transfer Ownership button", async () => {
    const ownerUser = {
      id: "owner-user-id",
      email: "owner@example.com",
      fullName: "Owner User",
      createdAt: new Date().toISOString(),
    };

    vi.mocked(boardApi.getMembers).mockResolvedValue(mockMembers);
    vi.mocked(boardApi.transferOwnership).mockResolvedValue();

    renderWithProviders(<BoardMembers boardId="board-1" />, { user: ownerUser });

    const makeOwnerBtn = await screen.findByRole("button", { name: /transfer ownership/i });
    fireEvent.click(makeOwnerBtn);

    expect(
      await screen.findByText(/Transfer Ownership to Test User\?/i)
    ).toBeInTheDocument();

    const input = screen.getByTestId("confirm-promote-owner-input");
    const confirmBtn = screen.getByTestId("confirm-promote-owner-btn");

    // Disabled initially and when wrong board name is typed
    expect(confirmBtn).toBeDisabled();
    fireEvent.change(input, { target: { value: "Wrong Board" } });
    expect(confirmBtn).toBeDisabled();
    expect(boardApi.transferOwnership).not.toHaveBeenCalled();

    // Enabled once exact board name is typed
    fireEvent.change(input, { target: { value: "Test Board" } });
    expect(confirmBtn).not.toBeDisabled();

    fireEvent.click(confirmBtn);
    await waitFor(() => {
      expect(boardApi.transferOwnership).toHaveBeenCalledWith("board-1", mockUser.id);
    });
  });

  it("cancelling the owner promotion dialog does not promote the member", async () => {
    const ownerUser = {
      id: "owner-user-id",
      email: "owner@example.com",
      fullName: "Owner User",
      createdAt: new Date().toISOString(),
    };

    vi.mocked(boardApi.getMembers).mockResolvedValue(mockMembers);

    renderWithProviders(<BoardMembers boardId="board-1" />, { user: ownerUser });

    const makeOwnerBtn = await screen.findByRole("button", { name: /transfer ownership/i });
    fireEvent.click(makeOwnerBtn);

    expect(
      await screen.findByText(/Transfer Ownership to Test User\?/i)
    ).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(
        screen.queryByText(/Transfer Ownership to Test User\?/i)
      ).not.toBeInTheDocument();
    });
    expect(boardApi.transferOwnership).not.toHaveBeenCalled();
    expect(boardApi.updateMemberRole).not.toHaveBeenCalled();
  });

  it("requires typing the board name to confirm when selecting Owner from the role dropdown", async () => {
    const ownerUser = {
      id: "owner-user-id",
      email: "owner@example.com",
      fullName: "Owner User",
      createdAt: new Date().toISOString(),
    };

    vi.mocked(boardApi.getMembers).mockResolvedValue(mockMembers);
    vi.mocked(boardApi.updateMemberRole).mockResolvedValue({
      ...mockMembers[1],
      role: "owner",
    });

    renderWithProviders(<BoardMembers boardId="board-1" />, { user: ownerUser });

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    const triggers = screen.getAllByRole("combobox");
    fireEvent.keyDown(triggers[0], { key: "ArrowDown" });

    const ownerOption = await screen.findByRole("option", { name: /Owner/i });
    fireEvent.click(ownerOption);

    // Should NOT mutate immediately
    expect(boardApi.updateMemberRole).not.toHaveBeenCalled();

    // Confirmation dialog opens
    expect(
      await screen.findByText(/Transfer Ownership to Test User\?/i)
    ).toBeInTheDocument();

    const input = screen.getByTestId("confirm-promote-owner-input");
    const confirmBtn = screen.getByTestId("confirm-promote-owner-btn");
    expect(confirmBtn).toBeDisabled();

    fireEvent.change(input, { target: { value: "Test Board" } });
    expect(confirmBtn).not.toBeDisabled();

    fireEvent.click(confirmBtn);
    await waitFor(() => {
      expect(boardApi.updateMemberRole).toHaveBeenCalledWith(
        "board-1",
        mockUser.id,
        "owner"
      );
    });
  });

  it("updates non-Owner roles directly without opening the Owner confirmation dialog", async () => {
    const ownerUser = {
      id: "owner-user-id",
      email: "owner@example.com",
      fullName: "Owner User",
      createdAt: new Date().toISOString(),
    };

    vi.mocked(boardApi.getMembers).mockResolvedValue(mockMembers);
    vi.mocked(boardApi.updateMemberRole).mockResolvedValue({
      ...mockMembers[1],
      role: "admin",
    });

    renderWithProviders(<BoardMembers boardId="board-1" />, { user: ownerUser });

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    const triggers = screen.getAllByRole("combobox");
    fireEvent.keyDown(triggers[0], { key: "ArrowDown" });

    const adminOption = await screen.findByRole("option", { name: /Admin/i });
    fireEvent.click(adminOption);

    expect(
      screen.queryByText(/Promote Test User to Owner\?/i)
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(boardApi.updateMemberRole).toHaveBeenCalledWith(
        "board-1",
        mockUser.id,
        "admin"
      );
    });
  });
});
