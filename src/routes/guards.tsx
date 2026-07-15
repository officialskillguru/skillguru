import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { PageLoader } from "@/components/common/PageLoader";
import { useAuth } from "@/hooks/useAuth";
import { routes } from "@/lib/routes";
import { RouteResolver } from "./RouteResolver";

export function ProtectedRoute({ children }: Readonly<{ children: ReactNode }>) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "UNAUTHENTICATED" || auth.status === "LOGOUT" || auth.status === "ERROR" || auth.status === "SESSION_EXPIRED") {
    return <Navigate to={routes.login} replace state={{ from: location.pathname }} />;
  }

  if (auth.status !== "READY" || !auth.authUser) {
    return <PageLoader />;
  }

  // Profile completion enforcement for students
  if (auth.authUser.highestRole === "student") {
    const isProfileIncomplete = !auth.authUser.profile?.fullName;
    const isProfileCompletionRoute = location.pathname === "/onboarding"; 

    if (isProfileIncomplete && !isProfileCompletionRoute) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  return <>{children}</>;
}

export function AdminProtectedRoute({ children }: Readonly<{ children: ReactNode }>) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "UNAUTHENTICATED" || auth.status === "LOGOUT" || auth.status === "ERROR" || auth.status === "SESSION_EXPIRED") {
    return <Navigate to={routes.login} replace state={{ from: location.pathname }} />;
  }

  if (auth.status !== "READY" || !auth.authUser) {
    return <PageLoader />;
  }

  if (!auth.authUser.roles.includes("admin")) {
    const dashboard = RouteResolver.getDashboard(auth.authUser);
    return <Navigate to={dashboard} replace />;
  }

  return <>{children}</>;
}

export function MentorProtectedRoute({ children }: Readonly<{ children: ReactNode }>) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "UNAUTHENTICATED" || auth.status === "LOGOUT" || auth.status === "ERROR" || auth.status === "SESSION_EXPIRED") {
    return <Navigate to={routes.login} replace state={{ from: location.pathname }} />;
  }

  if (auth.status !== "READY" || !auth.authUser) {
    return <PageLoader />;
  }

  // Allow admins to also view mentor areas, or just mentors
  if (!auth.authUser.roles.includes("mentor") && !auth.authUser.roles.includes("admin")) {
    const dashboard = RouteResolver.getDashboard(auth.authUser);
    return <Navigate to={dashboard} replace />;
  }

  return <>{children}</>;
}
