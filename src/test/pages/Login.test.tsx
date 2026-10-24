import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import Login from "@/pages/Login";
import { renderWithProviders } from "@/test/test-utils";
import { authApi } from "@/services/authApi";
import { toast } from "sonner";

const mockNavigate = vi.fn();
let mockLocationState: any = null;
let mockSearchParams = new URLSearchParams();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: mockLocationState }),
    useSearchParams: () => [mockSearchParams],
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  };
});

vi.mock("@/services/authApi", () => ({
  authApi: {
    login: vi.fn(),
    resendVerification: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Login Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocationState = null;
    mockSearchParams = new URLSearchParams();
    sessionStorage.clear();
  });

  it("pre-fills email when passed in router location state", () => {
    mockLocationState = { email: "prefilled@example.com" };

    renderWithProviders(<Login />, { user: null });

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(emailInput.value).toBe("prefilled@example.com");
  });

  it("pre-fills email and redirects to query param after login", async () => {
    mockSearchParams = new URLSearchParams("email=invitee@example.com&redirect=/invite/invite-123");

    const mockLoginFn = vi.fn();
    (authApi.login as any).mockResolvedValueOnce({
      user: { id: "1", email: "invitee@example.com", fullName: "Invitee User" },
      token: "mock-jwt-token",
    });

    renderWithProviders(<Login />, {
      user: null,
      authOverrides: { login: mockLoginFn },
    });

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(emailInput.value).toBe("invitee@example.com");

    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "Password123!" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLoginFn).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/invite/invite-123");
    });
  });

  it("submits the form successfully and logs in", async () => {
    const mockLoginFn = vi.fn();
    (authApi.login as any).mockResolvedValueOnce({
      user: { id: "1", email: "user@example.com", fullName: "User Test" },
      token: "mock-jwt-token",
    });

    renderWithProviders(<Login />, {
      user: null,
      authOverrides: { login: mockLoginFn },
    });

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "Password123!" } });

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith("user@example.com", "Password123!");
      expect(mockLoginFn).toHaveBeenCalledWith(
        { id: "1", email: "user@example.com", fullName: "User Test" },
        "mock-jwt-token"
      );
      expect(toast.success).toHaveBeenCalledWith("Welcome back, User Test!");
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("displays client-side inline error when email is empty", async () => {
    renderWithProviders(<Login />, { user: null });

    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "Password123!" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByTestId("login-error-alert")).toHaveTextContent("Email address is required.");
    expect(screen.getByTestId("email-helper-error")).toHaveTextContent("Email address is required.");
  });

  it("displays client-side inline error when password is empty", async () => {
    renderWithProviders(<Login />, { user: null });

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "user@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByTestId("login-error-alert")).toHaveTextContent("Password is required.");
    expect(screen.getByTestId("password-helper-error")).toHaveTextContent("Password is required.");
  });

  it("renders inline guided error and helper text when user is not found (USER_NOT_FOUND)", async () => {
    const error: any = new Error("No account found with this email address.");
    error.field = "email";
    error.code = "USER_NOT_FOUND";
    (authApi.login as any).mockRejectedValueOnce(error);

    renderWithProviders(<Login />, { user: null });

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "notfound@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "Password123!" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByTestId("login-error-alert")).toHaveTextContent("No account found with this email address.");
      expect(screen.getByTestId("email-helper-error")).toHaveTextContent("No account found with this email address.");
      expect(screen.getByRole("link", { name: /create one here/i })).toBeInTheDocument();
    });

    // Clear error on editing email
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "editing@example.com" } });
    expect(screen.queryByTestId("login-error-alert")).not.toBeInTheDocument();
    expect(screen.queryByTestId("email-helper-error")).not.toBeInTheDocument();
  });

  it("renders inline guided error when password is wrong (INVALID_PASSWORD)", async () => {
    const error: any = new Error("Incorrect password. Please try again.");
    error.field = "password";
    error.code = "INVALID_PASSWORD";
    (authApi.login as any).mockRejectedValueOnce(error);

    renderWithProviders(<Login />, { user: null });

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "valid@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "WrongPassword123!" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByTestId("login-error-alert")).toHaveTextContent("Incorrect password. Please try again.");
      expect(screen.getByTestId("password-helper-error")).toHaveTextContent("Incorrect password. Please try again.");
    });

    // Clear error on editing password
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "NewAttempt123!" } });
    expect(screen.queryByTestId("login-error-alert")).not.toBeInTheDocument();
    expect(screen.queryByTestId("password-helper-error")).not.toBeInTheDocument();
  });

  it("renders guided amber notice when user registered with OAuth (OAUTH_ACCOUNT)", async () => {
    const error: any = new Error("This account was registered using Google. Please sign in with Google.");
    error.field = "oauth";
    error.provider = "google";
    error.code = "OAUTH_ACCOUNT";
    (authApi.login as any).mockRejectedValueOnce(error);

    renderWithProviders(<Login />, { user: null });

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "googleuser@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "SomePassword123!" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      const alert = screen.getByTestId("login-error-alert");
      expect(alert).toHaveTextContent(/This account was registered using Google/i);
      expect(alert).toHaveTextContent(/Please click the google button below/i);
    });
  });

  it("renders 403 unverified state banner with resend email option", async () => {
    const error: any = new Error("Please verify your email address before signing in.");
    error.status = 403;
    error.data = {
      emailVerified: false,
      message: "Please verify your email address before signing in.",
      email: "unverified@example.com",
      canSignUpAgain: true,
    };
    (authApi.login as any).mockRejectedValueOnce(error);

    renderWithProviders(<Login />, { user: null });

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "unverified@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "Password123!" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByTestId("unverified-state-banner")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /resend verification email/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /wrong email\? sign up again/i })).toBeInTheDocument();
    });
  });

  it("displays caps lock warning when typing with caps lock on", () => {
    renderWithProviders(<Login />, { user: null });

    const passwordInput = screen.getByLabelText(/^password$/i);
    fireEvent.keyDown(passwordInput, {
      key: "A",
      modifierCapsLock: true,
    });

    expect(screen.getByTestId("caps-lock-warning")).toHaveTextContent("Caps Lock is ON");
  });
});
