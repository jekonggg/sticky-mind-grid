import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { authApi } from "@/services/authApi";
import * as oauthUtils from "@/utils/oauth";

vi.mock("@/services/authApi", () => ({
  authApi: {
    oauthLogin: vi.fn(),
    getOAuthProviders: vi.fn().mockResolvedValue({
      google: { name: "Google", enabled: true, configured: false, clientId: null },
      github: { name: "GitHub", enabled: true, configured: false, clientId: null },
      microsoft: { name: "Microsoft", enabled: true, configured: false, clientId: null },
    }),
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

  it("opens account selection modal when provider is in sandbox/unconfigured mode", async () => {
    renderWithProviders(<OAuthButtons mode="login" />, {
      authOverrides: { login: mockLogin },
    });

    fireEvent.click(screen.getByTitle("Continue with Google"));

    expect(await screen.findByText("Alex Johnson")).toBeInTheDocument();
    expect(screen.getByText("Sophia Chen")).toBeInTheDocument();
    expect(screen.getByText("Developer Sandbox Mode")).toBeInTheDocument();
  });

  it("authenticates when selecting a preset account in sandbox mode", async () => {
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

  it("allows entering a custom account email in sandbox mode", async () => {
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

  it("launches real OAuth popup and code exchange when provider is configured", async () => {
    (authApi.getOAuthProviders as any).mockResolvedValueOnce({
      google: { name: "Google", enabled: true, configured: true, clientId: "real-google-client-id" },
      github: { name: "GitHub", enabled: true, configured: false, clientId: null },
      microsoft: { name: "Microsoft", enabled: true, configured: false, clientId: null },
    });

    const openPopupSpy = vi.spyOn(oauthUtils, "openOAuthPopup").mockResolvedValueOnce({
      code: "google-auth-code-12345",
      state: "state-token",
    });

    (authApi.oauthLogin as any).mockResolvedValueOnce({
      user: {
        id: "real-google-user",
        email: "live.user@gmail.com",
        fullName: "Live Google User",
        authProvider: "google",
      },
      token: "real-jwt-token",
    });

    renderWithProviders(<OAuthButtons mode="login" />, {
      authOverrides: { login: mockLogin },
    });

    // Wait for provider config to load
    await waitFor(() => {
      expect(authApi.getOAuthProviders).toHaveBeenCalled();
    });

    const googleBtn = screen.getByTitle("Continue with Google");
    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(openPopupSpy).toHaveBeenCalled();
      expect(authApi.oauthLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "google",
          code: "google-auth-code-12345",
          redirectUri: expect.any(String),
        })
      );
      expect(mockLogin).toHaveBeenCalledWith(
        expect.objectContaining({ email: "live.user@gmail.com" }),
        "real-jwt-token"
      );
    });

    openPopupSpy.mockRestore();
  });
});
