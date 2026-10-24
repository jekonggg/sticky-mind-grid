import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent, act } from "@testing-library/react";
import VerifyEmail from "@/pages/VerifyEmail";
import { renderWithProviders } from "@/test/test-utils";
import { authApi } from "@/services/authApi";
import { toast } from "sonner";

const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();
let mockLocationState: any = null;

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams],
    useLocation: () => ({ state: mockLocationState }),
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  };
});

vi.mock("@/services/authApi", () => ({
  authApi: {
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    getVerificationStatus: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("VerifyEmail Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockLocationState = null;
  });

  it("renders pending verification screen with user email and waiting status", () => {
    mockSearchParams = new URLSearchParams("email=alice%40example.com&pending=true");

    renderWithProviders(<VerifyEmail />, { user: null });

    expect(screen.getByText("Check Your Inbox")).toBeInTheDocument();
    expect(screen.getByTestId("pending-email-badge")).toHaveTextContent("alice@example.com");
    expect(screen.getByText(/Waiting for confirmation/i)).toBeInTheDocument();
    expect(screen.getByTestId("resend-verification-btn")).toBeInTheDocument();
    expect(screen.getByTestId("go-to-login-btn")).toBeInTheDocument();
  });

  it("handles resending verification email and triggers cooldown", async () => {
    mockSearchParams = new URLSearchParams("email=alice%40example.com&pending=true");
    (authApi.resendVerification as any).mockResolvedValueOnce({
      message: "Verification email resent! Please check your inbox.",
    });

    renderWithProviders(<VerifyEmail />, { user: null });

    const resendBtn = screen.getByTestId("resend-verification-btn");
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(authApi.resendVerification).toHaveBeenCalledWith("alice@example.com");
      expect(toast.success).toHaveBeenCalledWith(
        "Verification email resent! Please check your inbox."
      );
      expect(screen.getByText(/Resend verification in \d+s/i)).toBeInTheDocument();
    });
  });

  it("navigates to login when 'Go to Login' button is clicked from pending mode", () => {
    mockSearchParams = new URLSearchParams("email=bob%40example.com&pending=true");

    renderWithProviders(<VerifyEmail />, { user: null });

    const loginBtn = screen.getByTestId("go-to-login-btn");
    fireEvent.click(loginBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/login?email=bob%40example.com", {
      state: { email: "bob@example.com" },
    });
  });

  it("auto-updates to success state when verification status poller detects verified", async () => {
    mockSearchParams = new URLSearchParams("email=carol%40example.com&pending=true");
    (authApi.getVerificationStatus as any).mockResolvedValueOnce({
      verified: true,
      exists: true,
    });

    renderWithProviders(<VerifyEmail />, { user: null });

    await waitFor(() => {
      expect(screen.getByText("Email Verified!")).toBeInTheDocument();
      expect(screen.getByTestId("continue-to-login-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("continue-to-login-btn"));
    expect(mockNavigate).toHaveBeenCalledWith("/login?email=carol%40example.com", {
      state: { email: "carol@example.com" },
    });
  });

  it("handles token verification from URL successfully", async () => {
    mockSearchParams = new URLSearchParams("token=valid-secret-token");
    (authApi.verifyEmail as any).mockResolvedValueOnce({
      message: "Your email address has been successfully verified.",
    });

    renderWithProviders(<VerifyEmail />, { user: null });

    await waitFor(() => {
      expect(authApi.verifyEmail).toHaveBeenCalledWith("valid-secret-token");
      expect(screen.getByText("Email Verified!")).toBeInTheDocument();
      expect(screen.getByTestId("continue-to-login-btn")).toBeInTheDocument();
    });
  });

  it("handles invalid or expired token gracefully", async () => {
    mockSearchParams = new URLSearchParams("token=expired-token");
    (authApi.verifyEmail as any).mockRejectedValueOnce(
      new Error("The verification link is invalid or has expired.")
    );

    renderWithProviders(<VerifyEmail />, { user: null });

    await waitFor(() => {
      expect(screen.getByText("Verification Failed")).toBeInTheDocument();
      expect(
        screen.getByText("The verification link is invalid or has expired.")
      ).toBeInTheDocument();
    });
  });
});
