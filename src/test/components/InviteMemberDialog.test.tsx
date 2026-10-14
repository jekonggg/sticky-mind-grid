import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { InviteMemberDialog } from "@/components/board/InviteMemberDialog";
import { renderWithProviders } from "@/test/test-utils";
import { authApi } from "@/services/authApi";
import { boardApi } from "@/services/boardApi";

vi.mock("@/services/authApi", () => ({
  authApi: {
    searchUsers: vi.fn(),
  },
}));

vi.mock("@/services/boardApi", () => ({
  boardApi: {
    getMembers: vi.fn().mockResolvedValue([]),
    inviteMember: vi.fn().mockResolvedValue({ message: "Invited" }),
    resendInvite: vi.fn().mockResolvedValue({ message: "Resent" }),
    revokeInvitation: vi.fn().mockResolvedValue({ message: "Revoked" }),
  },
}));

vi.mock("@/hooks/useBoards", () => ({
  useBoards: () => ({
    boards: [
      {
        id: "board-1",
        name: "Test Board",
        ownerId: "user-123",
      },
    ],
  }),
}));

describe("InviteMemberDialog Search Loading Animation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (boardApi.getMembers as any).mockResolvedValue([]);
  });

  it("renders search box and shows loading animation while searching", async () => {
    let resolveSearch: (val: any) => void;
    const searchPromise = new Promise((resolve) => {
      resolveSearch = resolve;
    });
    (authApi.searchUsers as any).mockReturnValue(searchPromise);

    renderWithProviders(<InviteMemberDialog boardId="board-1" open={true} />);

    expect(screen.getByText("Invite to Board")).toBeInTheDocument();
    const searchInput = screen.getByPlaceholderText(/search by name or email/i);

    // Type 2 characters to trigger search
    fireEvent.change(searchInput, { target: { value: "jo" } });

    // Loading animation should be visible
    await waitFor(() => {
      expect(screen.getByTestId("search-loader")).toBeInTheDocument();
    });

    // Resolve search
    resolveSearch!([
      {
        id: "user-1",
        email: "john@example.com",
        fullName: "John Doe",
        avatarUrl: "",
      },
    ]);

    // Loader should disappear and user should be displayed
    await waitFor(() => {
      expect(screen.queryByTestId("search-loader")).not.toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });
  });

  it("selecting a user populates the input and does not re-trigger loading spinner", async () => {
    (authApi.searchUsers as any).mockResolvedValue([
      {
        id: "user-1",
        email: "john@example.com",
        fullName: "John Doe",
      },
    ]);

    renderWithProviders(<InviteMemberDialog boardId="board-1" open={true} />);

    const searchInput = screen.getByPlaceholderText(/search by name or email/i);
    fireEvent.change(searchInput, { target: { value: "john" } });

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    // Clear mock call count to track if selecting re-triggers
    (authApi.searchUsers as any).mockClear();

    // Click user
    fireEvent.click(screen.getByText("John Doe"));

    expect(searchInput).toHaveValue("john@example.com");
    expect(screen.queryByText("Matching Users")).not.toBeInTheDocument();
    expect(screen.queryByTestId("search-loader")).not.toBeInTheDocument();
    expect(authApi.searchUsers).not.toHaveBeenCalled();
  });

  it("shows friendly no registered users found message when search is empty", async () => {
    (authApi.searchUsers as any).mockResolvedValue([]);

    renderWithProviders(<InviteMemberDialog boardId="board-1" open={true} />);

    const searchInput = screen.getByPlaceholderText(/search by name or email/i);
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });

    await waitFor(() => {
      expect(screen.getByText("No registered users found")).toBeInTheDocument();
      expect(screen.getByText(/You can still invite by email:/i)).toBeInTheDocument();
    });
  });
});

describe("InviteMemberDialog Form Submission and Sizing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render in-modal pending invitations list (moved to TeamsPage)", async () => {
    (boardApi.getMembers as any).mockResolvedValue([]);

    renderWithProviders(<InviteMemberDialog boardId="board-1" open={true} />);

    expect(screen.getByText("Invite to Board")).toBeInTheDocument();
    expect(screen.queryByTestId("invited-members-container")).not.toBeInTheDocument();
    expect(screen.queryByText(/Pending Invitations/i)).not.toBeInTheDocument();
  });

  it("submitting an invitation calls boardApi.inviteMember and triggers callbacks", async () => {
    (boardApi.inviteMember as any).mockResolvedValue({ id: "new-invite" });
    const onInvitedMock = vi.fn();
    const onOpenChangeMock = vi.fn();

    renderWithProviders(
      <InviteMemberDialog
        boardId="board-1"
        open={true}
        onInvited={onInvitedMock}
        onOpenChange={onOpenChangeMock}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search by name or email/i);
    fireEvent.change(searchInput, { target: { value: "charlie@example.com" } });

    const submitBtn = screen.getByRole("button", { name: /send invite/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(boardApi.inviteMember).toHaveBeenCalledWith(
        "board-1",
        "charlie@example.com",
        "editor"
      );
      expect(onInvitedMock).toHaveBeenCalled();
      expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    });
  });

  it("clicking Cancel button closes the dialog", async () => {
    const onOpenChangeMock = vi.fn();

    renderWithProviders(
      <InviteMemberDialog
        boardId="board-1"
        open={true}
        onOpenChange={onOpenChangeMock}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
  });
});
