import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useParams } from "react-router-dom";
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
import { OnboardingProvider } from "./contexts/OnboardingContext";
import { OnboardingTourDialog } from "./components/onboarding/OnboardingTourDialog";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { HomeRouteLayout } from "./components/landing/HomeRouteLayout";
import { AuthPageSkeleton } from "./components/skeletons";
import { DevSkeletonToolbar } from "./components/common/DevSkeletonToolbar";
import { EnvironmentBanner } from "./components/common/EnvironmentBanner";

// Lazy-loaded route pages for on-demand bundle splitting
const BoardsOverview = lazy(() => import("./pages/BoardsOverview"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const OAuthCallback = lazy(() => import("./pages/OAuthCallback"));
const KanbanBoard = lazy(() =>
  import("./components/kanban/KanbanBoard").then((m) => ({ default: m.KanbanBoard }))
);
const TaskDetailPage = lazy(() => import("./pages/TaskDetailPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const TasksPage = lazy(() => import("./pages/TasksPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const TeamsPage = lazy(() => import("./pages/TeamsPage"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const AcceptInvitePage = lazy(() => import("./pages/AcceptInvitePage"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));

/** Keeps lazy public pages inside their own suspense boundary so they never
 * fall back to the authenticated application shell. */
function PublicRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<AuthPageSkeleton />}>{children}</Suspense>;
}

function KanbanBoardRoute() {
  const { boardId } = useParams<{ boardId: string }>();
  return <KanbanBoard key={boardId} />;
}

function TaskDetailPageRoute() {
  const { boardId, taskId } = useParams<{ boardId: string; taskId: string }>();
  return <TaskDetailPage key={`${boardId}-${taskId}`} />;
}

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
                <OnboardingProvider>
                <Toaster />
                <Sonner />
                <EnvironmentBanner />
                <Routes>
                  <Route path="/" element={<HomeRouteLayout />}>
                    <Route index element={<BoardsOverview />} />
                  </Route>
                  <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                  <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
                  <Route path="/auth/callback" element={<PublicRoute><OAuthCallback /></PublicRoute>} />
                  <Route path="/auth/callback/:provider" element={<PublicRoute><OAuthCallback /></PublicRoute>} />
                  <Route path="/invite/:invitationId" element={<PublicRoute><AcceptInvitePage /></PublicRoute>} />
                  <Route path="/verify-email" element={<PublicRoute><VerifyEmail /></PublicRoute>} />

                  <Route element={<ProtectedRoute />}>
                    <Route element={<AppLayout />}>
                      <Route path="/boards" element={<BoardsOverview />} />
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/tasks" element={<TasksPage />} />
                      <Route path="/calendar" element={<CalendarPage />} />
                      <Route path="/teams" element={<TeamsPage />} />
                      <Route path="/boards/:boardId" element={<KanbanBoardRoute />} />
                      <Route path="/boards/:boardId/tasks/:taskId" element={<TaskDetailPageRoute />} />
                      <Route path="/messages" element={<MessagesPage />} />
                      <Route path="/messages/:conversationId" element={<MessagesPage />} />
                    </Route>
                  </Route>

                  <Route
                    path="*"
                    element={
                      <Suspense fallback={<div className="min-h-screen bg-background" />}>
                        <NotFound />
                      </Suspense>
                    }
                  />
                </Routes>
                <Analytics />
                <DevSkeletonToolbar />
                <OnboardingTourDialog />
                </OnboardingProvider>
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
