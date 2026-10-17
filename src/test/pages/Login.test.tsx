import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import Login from "@/pages/Login";
import { renderWithProviders } from "@/test/test-utils";
import { authApi } from "@/services/authApi";
import { toast } from "sonner";

const mockNavigate = vi.fn();
let mockLocationState: any = null;

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: mockLocationState }),
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  };
});

vi.mock("@/services/authApi", () => ({
  authApi: {
    login: vi.fn(),
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
  });

  it("pre-fills email when passed in router location state", () => {
    mockLocationState = { email: "prefilled@example.com" };

    renderWithProviders(<Login />, { user: null });

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(emailInput.value).toBe("prefilled@example.com");
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
});
