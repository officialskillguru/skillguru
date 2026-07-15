import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/hooks/auth/useSession";
import { routes } from "@/lib/routes";
import { PortalRole } from "@/constants/roles";
import { Loader2 } from "lucide-react";

interface RouteGuardProps {
  children: ReactNode;
}

const FullScreenLoader = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
  </div>
);

export function AuthenticatedRoute({ children }: RouteGuardProps) {
  const { isAuthenticated, isLoading } = useSession();
  const location = useLocation();

  if (isLoading) return <FullScreenLoader />;
  if (!isAuthenticated) return <Navigate to={routes.login} state={{ from: location }} replace />;

  return <>{children}</>;
}

export function GuestRoute({ children }: RouteGuardProps) {
  const { isAuthenticated, isLoading, highestRole } = useSession();

  if (isLoading) return <FullScreenLoader />;
  
  if (isAuthenticated) {
    // Redirect based on role if already authenticated
    switch (highestRole) {
      case PortalRole.ADMIN:
        return <Navigate to={routes.admin.dashboard} replace />;
      case PortalRole.MENTOR:
        return <Navigate to={routes.dashboard} replace />;
      default:
        return <Navigate to={routes.dashboard} replace />;
    }
  }

  return <>{children}</>;
}

export function StudentRoute({ children }: RouteGuardProps) {
  const { isAuthenticated, isLoading, highestRole } = useSession();

  if (isLoading) return <FullScreenLoader />;
  if (!isAuthenticated) return <Navigate to={routes.login} replace />;
  
  if (highestRole !== PortalRole.STUDENT) {
    return <Navigate to={routes.home} replace />;
  }

  return <>{children}</>;
}

export function MentorRoute({ children }: RouteGuardProps) {
  const { isAuthenticated, isLoading, highestRole } = useSession();

  if (isLoading) return <FullScreenLoader />;
  if (!isAuthenticated) return <Navigate to={routes.login} replace />;
  
  if (highestRole !== PortalRole.MENTOR) {
    return <Navigate to={routes.home} replace />;
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: RouteGuardProps) {
  const { isAuthenticated, isLoading, highestRole, permissions } = useSession();

  if (isLoading) return <FullScreenLoader />;
  if (!isAuthenticated) return <Navigate to={routes.login} replace />;
  
  if (highestRole !== PortalRole.ADMIN || !permissions.includes("canViewAdminDashboard")) {
    return <Navigate to={routes.home} replace />;
  }

  return <>{children}</>;
}
