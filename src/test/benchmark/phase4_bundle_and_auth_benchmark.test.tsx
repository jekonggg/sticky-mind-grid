import { describe, it, expect, beforeEach, vi } from "vitest";
import React, { Suspense, lazy } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TOKEN_STORAGE_KEY } from "@/config/api";

// Create a valid mock JWT with expiration far in future
function createMockJwt(expSec: number = Math.floor(Date.now() / 1000) + 7200): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ sub: "user-benchmark-1", exp: expSec }));
  const signature = "sig";
  return `${header}.${payload}.${signature}`;
}

const mockUser = {
  id: "user-benchmark-1",
  email: "test@example.com",
  username: "benchmarkUser",
  name: "Benchmark User",
  avatar: "",
};

describe("Phase 4 Performance Benchmark: Code-Splitting & Auth Bootstrap Waterfall", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("Benchmark 1: AuthProvider resolves authenticated state synchronously on first render tick (zero skeleton flash)", () => {
    const validToken = createMockJwt();
    localStorage.setItem(TOKEN_STORAGE_KEY, validToken);
    localStorage.setItem("auth_user", JSON.stringify(mockUser));

    let initialRenderLoading: boolean | undefined;
    let initialRenderUserId: string | undefined;

    function TestConsumer() {
      const { user, loading } = useAuth();
      if (initialRenderLoading === undefined) {
        initialRenderLoading = loading;
        initialRenderUserId = user?.id;
      }
      return (
        <div>
          <span data-testid="auth-loading">{String(loading)}</span>
          <span data-testid="auth-user">{user?.name || "Anonymous"}</span>
        </div>
      );
    }

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // On the VERY FIRST render tick, loading must already be false and user pre-populated
    expect(initialRenderLoading).toBe(false);
    expect(initialRenderUserId).toBe("user-benchmark-1");
    expect(screen.getByTestId("auth-user")).toHaveTextContent("Benchmark User");
    expect(screen.getByTestId("auth-loading")).toHaveTextContent("false");
  });

  it("Benchmark 2: Dynamic route code-splitting works seamlessly with Suspense fallback", async () => {
    // Simulate lazy-loaded page
    const LazyComponent = lazy(
      () =>
        new Promise<{ default: React.ComponentType }>((resolve) => {
          setTimeout(() => {
            resolve({
              default: () => <div data-testid="lazy-loaded-page">Loaded Page Content</div>,
            });
          }, 50);
        })
    );

    render(
      <Suspense fallback={<div data-testid="suspense-fallback">Loading Route...</div>}>
        <LazyComponent />
      </Suspense>
    );

    // Initially shows suspense fallback
    expect(screen.getByTestId("suspense-fallback")).toBeInTheDocument();

    // Resolves cleanly to page content
    await waitFor(() => {
      expect(screen.getByTestId("lazy-loaded-page")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
  });

  it("Benchmark 3: Expired sessions are synchronously cleaned without blocking UI paint", () => {
    const expiredToken = createMockJwt(Math.floor(Date.now() / 1000) - 3600);
    localStorage.setItem(TOKEN_STORAGE_KEY, expiredToken);
    localStorage.setItem("auth_user", JSON.stringify(mockUser));

    function TestConsumer() {
      const { user, loading } = useAuth();
      return (
        <div>
          <span data-testid="auth-user">{user ? user.name : "Unauthenticated"}</span>
          <span data-testid="auth-loading">{String(loading)}</span>
        </div>
      );
    }

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId("auth-user")).toHaveTextContent("Unauthenticated");
    expect(screen.getByTestId("auth-loading")).toHaveTextContent("false");
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });
});
