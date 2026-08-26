import React, { ReactNode } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthContext, AuthContextType } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { User } from "@/types/user";

export const mockUser: User = {
  id: "user-123",
  email: "testuser@example.com",
  fullName: "Test User",
  avatarUrl: null,
  createdAt: new Date().toISOString(),
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
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    ...authOverrides,
  };

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthContext.Provider value={authValue}>
            <SettingsProvider>
              <BrowserRouter>{children}</BrowserRouter>
            </SettingsProvider>
          </AuthContext.Provider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}
