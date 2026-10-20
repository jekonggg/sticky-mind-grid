import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import Register from "@/pages/Register";
import { renderWithProviders } from "@/test/test-utils";
import { authApi } from "@/services/authApi";
import { toast } from "sonner";

const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams],
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  };
});

vi.mock("@/services/authApi", () => ({
  authApi: {
    register: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Register Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("renders registration form inputs correctly", () => {
    renderWithProviders(<Register />, { user: null });

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^confirm password$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeDisabled();
  });

  it("displays password criteria and updates dynamically as user types", async () => {
    renderWithProviders(<Register />, { user: null });

    const passwordInput = screen.getByLabelText(/^password$/i);

    // Focus password input to show criteria
    fireEvent.focus(passwordInput);

    expect(screen.getByText(/must contain:/i)).toBeInTheDocument();
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one uppercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one lowercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one number/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one special symbol/i)).toBeInTheDocument();

    // Type a simple lowercase string
    fireEvent.change(passwordInput, { target: { value: "abc" } });
    expect(screen.getByText(/weak/i)).toBeInTheDocument();

    // Type to meet all criteria: "Password123!"
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    expect(screen.getByText(/strong/i)).toBeInTheDocument();
  });

  it("disables submit button until password criteria and matching confirm password are met", async () => {
    renderWithProviders(<Register />, { user: null });

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmInput = screen.getByLabelText(/^confirm password$/i);
    const submitBtn = screen.getByRole("button", { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    expect(submitBtn).toBeDisabled();

    // Confirm password mismatches
    fireEvent.change(confirmInput, { target: { value: "Mismatch123!" } });
    expect(submitBtn).toBeDisabled();

    // Confirm password matches
    fireEvent.change(confirmInput, { target: { value: "Password123!" } });
    expect(submitBtn).toBeEnabled();
  });

  it("submits the form successfully and redirects to /login with state email", async () => {
    (authApi.register as any).mockResolvedValueOnce({
      user: { id: "1", email: "test@example.com", fullName: "Test User" },
      message: "Account created successfully. Please sign in to continue.",
    });

    renderWithProviders(<Register />, { user: null });

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Test User" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "Password123!" } });
    fireEvent.change(screen.getByLabelText(/^confirm password$/i), { target: { value: "Password123!" } });

    const submitButton = screen.getByRole("button", { name: /create account/i });
    expect(submitButton).toBeEnabled();

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith(
        "test@example.com",
        "Password123!",
        "Test User"
      );
      expect(toast.success).toHaveBeenCalledWith(
        "Account created successfully. Please sign in to continue."
      );
      expect(mockNavigate).toHaveBeenCalledWith("/login", {
        state: { email: "test@example.com" },
      });
    });
  });

  it("pre-fills email and forwards redirect param to /login", async () => {
    mockSearchParams = new URLSearchParams("email=invitee@example.com&redirect=/invite/invite-123");
    (authApi.register as any).mockResolvedValueOnce({
      user: { id: "2", email: "invitee@example.com", fullName: "Invitee" },
      message: "Success",
    });

    renderWithProviders(<Register />, { user: null });

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(emailInput.value).toBe("invitee@example.com");

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Invitee" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "Password123!" } });
    fireEvent.change(screen.getByLabelText(/^confirm password$/i), { target: { value: "Password123!" } });

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        "/login?email=invitee%40example.com&redirect=%2Finvite%2Finvite-123",
        { state: { email: "invitee@example.com" } }
      );
    });
  });
});
