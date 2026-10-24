import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React, { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, AuthContextType } from "@/contexts/AuthContext";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import { userApi } from "@/services/userApi";
import { User } from "@/types/user";

vi.mock("@/services/userApi", () => ({
  userApi: {
    heartbeatPresence: vi.fn(),
    markPresenceOffline: vi.fn(),
  },
}));

const mockUser: User = {
  id: "presence-user",
  email: "presence@example.com",
  fullName: "Presence User",
  createdAt: new Date().toISOString(),
};

function createWrapper(token: string | null) {
  const authValue: AuthContextType = {
    user: token ? mockUser : null,
    token,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
  };
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
      </QueryClientProvider>
    );
  };
}

describe("usePresenceHeartbeat", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    (userApi.heartbeatPresence as any).mockResolvedValue({ isOnline: true });
    (userApi.markPresenceOffline as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends an immediate heartbeat and repeats every 30 seconds", async () => {
    const { unmount } = renderHook(() => usePresenceHeartbeat(), {
      wrapper: createWrapper("mock-token"),
    });

    await act(async () => {});

    expect(userApi.heartbeatPresence).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(userApi.heartbeatPresence).toHaveBeenCalledTimes(2);

    unmount();
    expect(userApi.markPresenceOffline).toHaveBeenCalledWith("mock-token");
  });

  it("does nothing when there is no authenticated token", () => {
    renderHook(() => usePresenceHeartbeat(), {
      wrapper: createWrapper(null),
    });

    expect(userApi.heartbeatPresence).not.toHaveBeenCalled();
    expect(userApi.markPresenceOffline).not.toHaveBeenCalled();
  });
});
