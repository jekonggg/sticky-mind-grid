import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import AcceptInvitePage from "@/pages/AcceptInvitePage";
import { renderWithProviders } from "@/test/test-utils";
import { boardApi } from "@/services/boardApi";
import { toast } from "sonner";
import { InvitationPreview } from "@/types/board";

const mockNavigate = vi.fn();
let mockParams = { invitationId: "invite-test-uuid-123" };

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
    Link: ({ children, to, ...props }: any) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

vi.mock("@/services/boardApi", () => ({
  boardApi: {
    getInvitationPreview: vi.fn(),
    acceptInvitationById: vi.fn(),
    declineInvitationById: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockInvitation: InvitationPreview = {
  id: "invite-test-uuid-123",
  boardId: "board-collab-456",
  boardName: "Project Falcon",
  boardEmoji: "🦅",
  boardColor: "#3b82f6",
  inviterName: "Sarah Connor",
  invitedEmail: "usera@example.com",
  role: "editor",
  status: "pending",
  isExpired: false,
  expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  createdAt: new Date().toISOString(),
};

describe("AcceptInvitePage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { invitationId: "invite-test-uuid-123" };
  });

  it("renders loading state while invitation preview is pending", () => {
    vi.mocked(boardApi.getInvitationPreview).mockReturnValue(new Promise(() => {}));

    renderWithProviders(<AcceptInvitePage />, { user: null });

    expect(screen.getByText(/loading invitation.../i)).toBeInTheDocument();
  });

  it("renders error card when invitation is not found", async () => {
    vi.mocked(boardApi.getInvitationPreview).mockRejectedValue(new Error("Invitation not found"));

    renderWithProviders(<AcceptInvitePage />, { user: null });

    await waitFor(() => {
      expect(screen.getByText(/invalid invitation/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /go to my dashboard/i })).toBeInTheDocument();
    });
  });

  it("renders expired notice when invitation is expired", async () => {
    vi.mocked(boardApi.getInvitationPreview).mockResolvedValue({
      ...mockInvitation,
      status: "expired",
      isExpired: true,
    });

    renderWithProviders(<AcceptInvitePage />, { user: null });

    await waitFor(() => {
      expect(screen.getAllByText(/invitation expired/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/expired after 7 days/i)).toBeInTheDocument();
    });
  });

  it("renders Account Mismatch warning when User B is logged in", async () => {
    vi.mocked(boardApi.getInvitationPreview).mockResolvedValue(mockInvitation);

    const mockLogout = vi.fn();
    const userB = {
      id: "user-b-id",
      email: "userb@example.com",
      fullName: "User B",
    };

    renderWithProviders(<AcceptInvitePage />, {
      user: userB as any,
      authOverrides: { user: userB as any, logout: mockLogout },
    });

    await waitFor(() => {
      expect(screen.getByTestId("invite-account-mismatch-card")).toBeInTheDocument();
      expect(screen.getByText(/account mismatch/i)).toBeInTheDocument();
      expect(screen.getAllByText("userb@example.com").length).toBeGreaterThan(0);
      expect(screen.getAllByText("usera@example.com").length).toBeGreaterThan(0);
      expect(screen.getByTestId("switch-account-button")).toBeInTheDocument();
      expect(screen.getByTestId("register-as-invited-button")).toBeInTheDocument();
    });

    // The explicit accept button must NOT be present for User B
    expect(screen.queryByTestId("explicit-accept-button")).not.toBeInTheDocument();

    // Clicking switch account logs out User B and redirects to login with User A prefilled
    fireEvent.click(screen.getByTestId("switch-account-button"));
    expect(mockLogout).toHaveBeenCalledWith(false);
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining("/login?email=usera%40example.com&redirect=%2Finvite%2Finvite-test-uuid-123")
    );
  });

  it("renders sign in and sign up prompts when unauthenticated", async () => {
    vi.mocked(boardApi.getInvitationPreview).mockResolvedValue(mockInvitation);

    renderWithProviders(<AcceptInvitePage />, { user: null });

    await waitFor(() => {
      expect(screen.getByTestId("invite-unauthenticated-card")).toBeInTheDocument();
      expect(screen.getByText("Project Falcon")).toBeInTheDocument();
      expect(screen.getByText(/Sarah Connor/i)).toBeInTheDocument();
      expect(screen.getByText("usera@example.com")).toBeInTheDocument();
      expect(screen.getByTestId("signin-to-accept-button")).toBeInTheDocument();
      expect(screen.getByTestId("signup-to-accept-button")).toBeInTheDocument();
    });

    const signInBtn = screen.getByTestId("signin-to-accept-button");
    const href = signInBtn.getAttribute("href") || signInBtn.querySelector("a")?.getAttribute("href");
    expect(href).toContain("/login?email=usera%40example.com");
  });

  it("renders explicit accept button when logged in as User A (matching account) and accepts successfully", async () => {
    vi.mocked(boardApi.getInvitationPreview).mockResolvedValue(mockInvitation);
    vi.mocked(boardApi.acceptInvitationById).mockResolvedValue({
      id: "membership-123",
      boardId: "board-collab-456",
      userId: "user-a-id",
      role: "editor",
      status: "accepted",
      createdAt: new Date().toISOString(),
    });

    const userA = {
      id: "user-a-id",
      email: "usera@example.com",
      fullName: "User A",
    };

    renderWithProviders(<AcceptInvitePage />, {
      user: userA as any,
      authOverrides: { user: userA as any },
    });

    await waitFor(() => {
      expect(screen.getByTestId("invite-matching-card")).toBeInTheDocument();
      expect(screen.getByText("Project Falcon")).toBeInTheDocument();
      expect(screen.getByTestId("explicit-accept-button")).toBeInTheDocument();
      expect(screen.getByTestId("decline-button")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("explicit-accept-button"));

    await waitFor(() => {
      expect(boardApi.acceptInvitationById).toHaveBeenCalledWith("invite-test-uuid-123");
      expect(toast.success).toHaveBeenCalledWith("Welcome to Project Falcon!");
      expect(mockNavigate).toHaveBeenCalledWith("/boards/board-collab-456");
    });
  });

  it("allows declining the invitation when logged in as User A", async () => {
    vi.mocked(boardApi.getInvitationPreview).mockResolvedValue(mockInvitation);
    vi.mocked(boardApi.declineInvitationById).mockResolvedValue();

    const userA = {
      id: "user-a-id",
      email: "usera@example.com",
      fullName: "User A",
    };

    renderWithProviders(<AcceptInvitePage />, {
      user: userA as any,
      authOverrides: { user: userA as any },
    });

    await waitFor(() => {
      expect(screen.getByTestId("decline-button")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("decline-button"));

    await waitFor(() => {
      expect(boardApi.declineInvitationById).toHaveBeenCalledWith("invite-test-uuid-123");
      expect(toast.info).toHaveBeenCalledWith("Invitation declined");
      expect(mockNavigate).toHaveBeenCalledWith("/boards");
    });
  });
});
