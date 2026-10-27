import { lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppLayoutSkeleton } from "@/components/skeletons";

const LandingPage = lazy(() => import("@/pages/LandingPage"));

export function HomeRouteLayout() {
  const { user, loading } = useAuth();
  if (loading) return <AppLayoutSkeleton />;
  if (user) return <AppLayout />;
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen bg-white"
          role="status"
          aria-label="Loading home page"
        />
      }
    >
      <LandingPage />
    </Suspense>
  );
}
