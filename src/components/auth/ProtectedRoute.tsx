import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayoutSkeleton } from "@/components/skeletons";

export const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <AppLayoutSkeleton />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
