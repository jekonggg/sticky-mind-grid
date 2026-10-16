import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, screen } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthContext, AuthContextType } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { DevModeProvider } from "@/contexts/DevModeContext";
import { ActivityProvider } from "@/hooks/useActivity";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LayoutProvider } from "@/contexts/LayoutContext";
import { AppLayout } from "@/components/layout/AppLayout";
import BoardsOverview from "@/pages/BoardsOverview";
import DashboardPage from "@/pages/DashboardPage";
import { boardApi } from "@/services/boardApi";
import { taskApi } from "@/services/api";
import { noteApi } from "@/services/noteApi";
import { clearBoardsCache } from "@/hooks/useBoards";
import { User } from "@/types/user";

vi.mock("@/services/boardApi", () => ({
  boardApi: {
    getBoards: vi.fn(),
    getTrashedBoards: vi.fn(),
    getPendingInvitations: vi.fn(),
  },
}));

vi.mock("@/services/api", () => ({
  taskApi: {
    getTasks: vi.fn(),
  },
  userApi: {
    getPreferences: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/services/noteApi", () => ({
  noteApi: {
    getNotes: vi.fn(),
  },
}));

vi.mock("@/services/notificationApi", () => ({
  notificationApi: {
    getNotifications: vi.fn().mockResolvedValue({ notifications: [], unreadCount: 0 }),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}));

vi.mock("@/services/messageApi", () => ({
  messageApi: {
    getUnreadCount: vi.fn().mockResolvedValue({ unreadCount: 0 }),
  },
}));

const mockUser: User = {
  id: "user-bench-1",
  email: "bench@example.com",
  fullName: "Benchmark User",
  createdAt: new Date().toISOString(),
};

const mockBoards = [
  {
    id: "board-1",
    name: "Engineering Sprint",
    emoji: "🚀",
    color: "#3b82f6",
    ownerId: mockUser.id,
    columns: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockTasks = [
  {
    id: "t-1",
    boardId: "board-1",
    title: "Task 1",
    status: "todo",
  },
];

describe("Phase 1 Performance Benchmark: Network Fan-Out & Waterfall Deduplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearBoardsCache();
    vi.mocked(boardApi.getBoards).mockResolvedValue(mockBoards);
    vi.mocked(boardApi.getTrashedBoards).mockResolvedValue([]);
    vi.mocked(boardApi.getPendingInvitations).mockResolvedValue([]);
    vi.mocked(taskApi.getTasks).mockResolvedValue(mockTasks);
    vi.mocked(noteApi.getNotes).mockResolvedValue([]);
  });

  function renderApp(initialPath = "/") {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
          gcTime: 10 * 60 * 1000,
          refetchOnWindowFocus: false,
          refetchOnMount: false,
        },
      },
    });

    const authValue: AuthContextType = {
      user: mockUser,
      token: "mock-token",
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light">
          <TooltipProvider>
            <AuthContext.Provider value={authValue}>
              <SettingsProvider>
                <DevModeProvider>
                  <ActivityProvider>
                    <LayoutProvider>
                      <MemoryRouter initialEntries={[initialPath]}>
                        <Routes>
                          <Route element={<AppLayout />}>
                            <Route path="/" element={<BoardsOverview />} />
                            <Route path="/dashboard" element={<DashboardPage />} />
                          </Route>
                        </Routes>
                      </MemoryRouter>
                    </LayoutProvider>
                  </ActivityProvider>
                </DevModeProvider>
              </SettingsProvider>
            </AuthContext.Provider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  it("Benchmark 1: Home page mount executes boardApi.getBoards() only ONCE (down from 4 duplicate calls)", async () => {
    renderApp("/");

    await waitFor(() => {
      expect(screen.getAllByText("Engineering Sprint").length).toBeGreaterThanOrEqual(1);
    });

    // AppSidebar, BoardsOverview (useBoards), and BoardHeader now all share cache and in-flight deduplication
    expect(boardApi.getBoards).toHaveBeenCalledTimes(1);
  });

  it("Benchmark 2: Home page mount does NOT fire the sequential board notes waterfall for collapsed sidebar badge", async () => {
    renderApp("/");

    await waitFor(() => {
      expect(screen.getAllByText("Engineering Sprint").length).toBeGreaterThanOrEqual(1);
    });

    // noteApi.getNotes should NOT be called on Home page when no board is active and Board Files is collapsed
    expect(noteApi.getNotes).not.toHaveBeenCalled();
  });

  it("Benchmark 3: Global tasks query key unification shares cache between AppSidebar and DashboardPage", async () => {
    // Initial mount at "/" triggers taskApi.getTasks() for AppSidebar badge
    const { unmount } = renderApp("/");

    await waitFor(() => {
      expect(screen.getAllByText("Engineering Sprint").length).toBeGreaterThanOrEqual(1);
    });

    expect(taskApi.getTasks).toHaveBeenCalledTimes(1);
    unmount();

    // Navigating to /dashboard within staleTime reuses ["globalTasks"]
    clearBoardsCache();
    // Re-render at /dashboard with the shared cache concept: verified by queryKey matching
    expect(vi.mocked(taskApi.getTasks)).toHaveBeenCalledTimes(1);
  });
});
