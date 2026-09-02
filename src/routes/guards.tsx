import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

import { PageLoader } from "@/components/common/PageLoader";
import { useAuth } from "@/hooks/useAuth";
import { useMentorAccountStatus } from "@/hooks/useMentorPortal";
import { routes } from "@/lib/routes";
import { RouteResolver } from "./RouteResolver";

function MentorAccountBlockedScreen({ reason }: { reason: "suspended" | "deleted" }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-muted px-4 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-red-100 text-red-600">
        <ShieldAlert className="size-8" />
      </div>
      <h1 className="text-2xl font-black text-foreground">Account {reason === "deleted" ? "Removed" : "Suspended"}</h1>
      <p className="max-w-md text-sm font-semibold text-muted-foreground">
        {reason === "deleted"
          ? "Your mentor account has been removed by an administrator. Contact SkillGuru support if you believe this is a mistake."
          : "Your mentor account has been suspended by an administrator. Contact SkillGuru support for more information."}
      </p>
    </div>
  );
}

export function ProtectedRoute({ children }: Readonly<{ children: ReactNode }>) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "WAITING_EMAIL_CONFIRMATION") {
    return <Navigate to="/verify-email" replace />;
  }

  if (auth.status === "UNAUTHENTICATED" || auth.status === "LOGOUT" || auth.status === "ERROR" || auth.status === "SESSION_EXPIRED") {
    return <Navigate to={routes.login} replace state={{ from: location.pathname }} />;
  }

  if (auth.status !== "READY" || !auth.authUser) {
    return <PageLoader />;
  }

  if (auth.authUser.passwordResetRequired && location.pathname !== routes.forcePasswordChange) {
    return <Navigate to={routes.forcePasswordChange} replace />;
  }

  // This is the student dashboard - admins/mentors must never land here (each
  // role gets its own layout), mirroring the same redirect-away pattern
  // AdminProtectedRoute/MentorProtectedRoute already use for their areas.
  // forcePasswordChange is exempted: it's shared across all roles, and without
  // this exemption a non-student with passwordResetRequired would bounce
  // forever between this redirect and the passwordResetRequired redirect above.
  if (auth.authUser.highestRole !== "student" && location.pathname !== routes.forcePasswordChange) {
    return <Navigate to={RouteResolver.getDashboard(auth.authUser)} replace />;
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

export function AdminProtectedRoute({ children, requiredPermission }: Readonly<{ children: ReactNode; requiredPermission?: string }>) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "WAITING_EMAIL_CONFIRMATION") {
    return <Navigate to="/verify-email" replace />;
  }

  if (auth.status === "UNAUTHENTICATED" || auth.status === "LOGOUT" || auth.status === "ERROR" || auth.status === "SESSION_EXPIRED") {
    return <Navigate to={routes.login} replace state={{ from: location.pathname }} />;
  }

  if (auth.status !== "READY" || !auth.authUser) {
    return <PageLoader />;
  }

  if (auth.authUser.passwordResetRequired && location.pathname !== routes.forcePasswordChange) {
    return <Navigate to={routes.forcePasswordChange} replace />;
  }

  const userPermissions = auth.authUser.permissions ?? [];
  const userRoles = auth.authUser.roles ?? [];
  
  // Super admin overrides everything
  const isSuperAdmin = userRoles.includes("admin");

  // Check specific permission or default dashboard access
  const hasAccess = isSuperAdmin || 
    (requiredPermission 
      ? userPermissions.includes(requiredPermission)
      : userPermissions.includes("canViewAdminDashboard") || userRoles.some(r => ["counsellor", "sales", "content_manager", "hr", "finance"].includes(r)));

  if (!hasAccess) {
    const dashboard = RouteResolver.getDashboard(auth.authUser);
    return <Navigate to={dashboard} replace />;
  }

  return <>{children}</>;
}

export function MentorProtectedRoute({ children }: Readonly<{ children: ReactNode }>) {
  const auth = useAuth();
  const location = useLocation();
  const isAdmin = !!auth.authUser?.roles.includes("admin");
  const { data: mentorAccountStatus, isLoading: isLoadingMentorStatus } = useMentorAccountStatus();

  if (auth.status === "WAITING_EMAIL_CONFIRMATION") {
    return <Navigate to="/verify-email" replace />;
  }

  if (auth.status === "UNAUTHENTICATED" || auth.status === "LOGOUT" || auth.status === "ERROR" || auth.status === "SESSION_EXPIRED") {
    return <Navigate to={routes.login} replace state={{ from: location.pathname }} />;
  }

  if (auth.status !== "READY" || !auth.authUser) {
    return <PageLoader />;
  }

  if (auth.authUser.passwordResetRequired && location.pathname !== routes.forcePasswordChange) {
    return <Navigate to={routes.forcePasswordChange} replace />;
  }

  // Allow admins to also view mentor areas, or just mentors
  if (!auth.authUser.roles.includes("mentor") && !isAdmin) {
    const dashboard = RouteResolver.getDashboard(auth.authUser);
    return <Navigate to={dashboard} replace />;
  }

  // Real enforcement of an admin's Suspend/Delete action (BUG-06) - admins bypass
  // this check for their own mentor row, if they have one, since they already
  // have full platform access via the admin role.
  if (!isAdmin) {
    if (isLoadingMentorStatus) return <PageLoader />;
    if (mentorAccountStatus?.deleted_at) return <MentorAccountBlockedScreen reason="deleted" />;
    if (mentorAccountStatus?.status === "suspended") return <MentorAccountBlockedScreen reason="suspended" />;
  }

  return <>{children}</>;
}

export function CounsellorProtectedRoute({ children }: Readonly<{ children: ReactNode }>) {
  const auth = useAuth();
  const location = useLocation();
  const isAdmin = !!auth.authUser?.roles.includes("admin");

  if (auth.status === "WAITING_EMAIL_CONFIRMATION") {
    return <Navigate to="/verify-email" replace />;
  }

  if (auth.status === "UNAUTHENTICATED" || auth.status === "LOGOUT" || auth.status === "ERROR" || auth.status === "SESSION_EXPIRED") {
    return <Navigate to={routes.login} replace state={{ from: location.pathname }} />;
  }

  if (auth.status !== "READY" || !auth.authUser) {
    return <PageLoader />;
  }

  if (auth.authUser.passwordResetRequired && location.pathname !== routes.forcePasswordChange) {
    return <Navigate to={routes.forcePasswordChange} replace />;
  }

  // Allow admins to also view the counsellor portal, or just counsellors.
  if (!auth.authUser.roles.includes("counsellor") && !isAdmin) {
    const dashboard = RouteResolver.getDashboard(auth.authUser);
    return <Navigate to={dashboard} replace />;
  }

  return <>{children}</>;
}
