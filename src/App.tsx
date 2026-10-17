import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Analytics } from "@vercel/analytics/react";
import React, { Suspense, lazy } from "react";
import { ThemeProvider } from "next-themes";
import { SettingsProvider } from "./contexts/SettingsContext";
import { DevModeProvider } from "./contexts/DevModeContext";
import { ActivityProvider } from "./hooks/useActivity";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { AppLayoutSkeleton } from "./components/skeletons";
import { DevSkeletonToolbar } from "./components/common/DevSkeletonToolbar";

// Lazy-loaded route pages for on-demand bundle splitting
const BoardsOverview = lazy(() => import("./pages/BoardsOverview"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const KanbanBoard = lazy(() =>
  import("./components/kanban/KanbanBoard").then((m) => ({ default: m.KanbanBoard }))
);
const TaskDetailPage = lazy(() => import("./pages/TaskDetailPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const TasksPage = lazy(() => import("./pages/TasksPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const TeamsPage = lazy(() => import("./pages/TeamsPage"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute fresh cache window
      gcTime: 10 * 60 * 1000, // 10 minutes cache retention in memory
      refetchOnWindowFocus: false, // Avoid network spikes on window focus
      refetchOnMount: false, // Reuse fresh cached data across component remounts
      refetchIntervalInBackground: false, // Stop all periodic polling when tab is hidden or backgrounded
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <SettingsProvider>
              <DevModeProvider>
                <ActivityProvider>
                <Toaster />
                <Sonner />
                <Suspense fallback={<AppLayoutSkeleton />}>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    
                    <Route element={<ProtectedRoute />}>
                      <Route element={<AppLayout />}>
                        <Route path="/" element={<BoardsOverview />} />
                        <Route path="/boards" element={<BoardsOverview />} />
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/tasks" element={<TasksPage />} />
                        <Route path="/calendar" element={<CalendarPage />} />
                        <Route path="/teams" element={<TeamsPage />} />
                        <Route path="/boards/:boardId" element={<KanbanBoard />} />
                        <Route path="/boards/:boardId/tasks/:taskId" element={<TaskDetailPage />} />
                        <Route path="/messages" element={<MessagesPage />} />
                        <Route path="/messages/:conversationId" element={<MessagesPage />} />
                      </Route>
                    </Route>

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                <Analytics />
                <DevSkeletonToolbar />
              </ActivityProvider>
            </DevModeProvider>
          </SettingsProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
