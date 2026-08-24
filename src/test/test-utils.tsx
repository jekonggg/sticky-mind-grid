import React, { ReactNode } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthContext, AuthContextType } from "@/contexts/AuthContext";
import { User } from "@/types/auth";

export const mockUser: User = {
  id: "user-123",
  email: "testuser@example.com",
  fullName: "Test User",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  user?: User | null;
  authOverrides?: Partial<AuthContextType>;
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) {
  const { user = mockUser, authOverrides = {}, ...renderOptions } = options;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  const authValue: AuthContextType = {
    user,
    token: user ? "mock-jwt-token" : null,
    loading: false,
    isAuthenticated: !!user,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    ...authOverrides,
  };

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <BrowserRouter>{children}</BrowserRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}
