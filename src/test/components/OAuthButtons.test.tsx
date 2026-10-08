import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { authApi } from "@/services/authApi";

vi.mock("@/services/authApi", () => ({
  authApi: {
    oauthLogin: vi.fn(),
  },
}));

describe("OAuthButtons Component", () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Google, GitHub, and Microsoft sign-in buttons", () => {
    renderWithProviders(<OAuthButtons mode="login" />, {
      authOverrides: { login: mockLogin },
    });

    expect(screen.getByTitle("Continue with Google")).toBeInTheDocument();
    expect(screen.getByTitle("Continue with GitHub")).toBeInTheDocument();
    expect(screen.getByTitle("Continue with Microsoft")).toBeInTheDocument();
  });

  it("opens account selection modal when clicking a provider button", async () => {
    renderWithProviders(<OAuthButtons mode="login" />, {
      authOverrides: { login: mockLogin },
    });

    fireEvent.click(screen.getByTitle("Continue with Google"));

    expect(await screen.findByText("Alex Johnson")).toBeInTheDocument();
    expect(screen.getByText("Sophia Chen")).toBeInTheDocument();
  });

  it("authenticates when selecting a preset account", async () => {
    (authApi.oauthLogin as any).mockResolvedValueOnce({
      user: {
        id: "oauth-user-1",
        email: "alex.johnson@gmail.com",
        fullName: "Alex Johnson",
        avatarUrl: "https://example.com/avatar.jpg",
        authProvider: "google",
      },
      token: "jwt-token-google",
    });

    renderWithProviders(<OAuthButtons mode="login" />, {
      authOverrides: { login: mockLogin },
    });

    fireEvent.click(screen.getByTitle("Continue with Google"));

    const alexBtn = await screen.findByText("Alex Johnson");
    fireEvent.click(alexBtn);

    await waitFor(() => {
      expect(authApi.oauthLogin).toHaveBeenCalledWith({
        provider: "google",
        profile: expect.objectContaining({
          email: "alex.johnson@gmail.com",
          fullName: "Alex Johnson",
        }),
      });
      expect(mockLogin).toHaveBeenCalledWith(
        expect.objectContaining({ email: "alex.johnson@gmail.com" }),
        "jwt-token-google"
      );
    });
  });

  it("allows entering a custom account email", async () => {
    (authApi.oauthLogin as any).mockResolvedValueOnce({
      user: {
        id: "oauth-user-custom",
        email: "custom.user@github.com",
        fullName: "Custom GitHub User",
        authProvider: "github",
      },
      token: "jwt-token-github",
    });

    renderWithProviders(<OAuthButtons mode="register" />, {
      authOverrides: { login: mockLogin },
    });

    fireEvent.click(screen.getByTitle("Continue with GitHub"));

    const emailInput = await screen.findByLabelText("GitHub Email");
    fireEvent.change(emailInput, { target: { value: "custom.user@github.com" } });

    const submitBtn = screen.getByRole("button", { name: "Continue with GitHub" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authApi.oauthLogin).toHaveBeenCalledWith({
        provider: "github",
        profile: expect.objectContaining({
          email: "custom.user@github.com",
        }),
      });
      expect(mockLogin).toHaveBeenCalled();
    });
  });
});
