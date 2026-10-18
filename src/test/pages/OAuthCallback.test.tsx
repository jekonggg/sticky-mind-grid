import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import OAuthCallback from "@/pages/OAuthCallback";
import { authApi } from "@/services/authApi";
import * as oauthUtils from "@/utils/oauth";

vi.mock("@/services/authApi", () => ({
  authApi: {
    oauthLogin: vi.fn(),
  },
}));

describe("OAuthCallback Page", () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    (window as any).opener = null;
    window.history.pushState({}, "", "/auth/callback");
  });

  it("communicates code to opener window when opened as a popup", async () => {
    sessionStorage.setItem("smg_oauth_state", "valid-csrf-token");

    const mockPostMessage = vi.fn();
    const mockClose = vi.fn();
    window.opener = {
      postMessage: mockPostMessage,
      closed: false,
    };
    window.close = mockClose;

    // Simulate callback URL with code and state
    window.history.pushState({}, "", "/auth/callback?code=test-auth-code&state=valid-csrf-token");

    renderWithProviders(<OAuthCallback />, {
      authOverrides: { login: mockLogin },
    });

    await waitFor(() => {
      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: "OAUTH_CALLBACK",
          code: "test-auth-code",
          state: "valid-csrf-token",
          error: null,
        },
        window.location.origin
      );
      expect(screen.getByText("Authentication Successful!")).toBeInTheDocument();
    });

    delete (window as any).opener;
  });

  it("handles CSRF state mismatch with an error message", async () => {
    sessionStorage.setItem("smg_oauth_state", "expected-secret-token");

    window.history.pushState({}, "", "/auth/callback?code=test-code&state=forged-or-mismatched-token");

    renderWithProviders(<OAuthCallback />, {
      authOverrides: { login: mockLogin },
    });

    expect(await screen.findByText("Authentication Failed")).toBeInTheDocument();
    expect(
      screen.getByText(/Security warning: OAuth state verification failed/i)
    ).toBeInTheDocument();
  });

  it("performs direct backend code exchange on direct page redirect when opener is absent", async () => {
    sessionStorage.setItem("smg_oauth_state", "my-valid-state");
    sessionStorage.setItem("smg_oauth_provider", "google");
    delete (window as any).opener;

    (authApi.oauthLogin as any).mockResolvedValueOnce({
      user: {
        id: "direct-user-1",
        email: "direct@example.com",
        fullName: "Direct User",
        authProvider: "google",
      },
      token: "jwt-token-direct",
    });

    window.history.pushState({}, "", "/auth/callback?code=direct-auth-code&state=my-valid-state");

    renderWithProviders(<OAuthCallback />, {
      authOverrides: { login: mockLogin },
    });

    await waitFor(() => {
      expect(authApi.oauthLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "google",
          code: "direct-auth-code",
        })
      );
      expect(mockLogin).toHaveBeenCalledWith(
        expect.objectContaining({ email: "direct@example.com" }),
        "jwt-token-direct"
      );
    });
  });
});
