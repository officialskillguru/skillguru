import type { AuthUser } from "@/types/auth.types";
import { PortalRole } from "@/constants/roles";

export interface Permissions {
  canEditCourses: boolean;
  canIssueCertificates: boolean;
  canViewCRM: boolean;
  canManageUsers: boolean;
  canViewAdminDashboard: boolean;
  canManageCourses: boolean;
  canManageStudents: boolean;
  canManageMentors: boolean;
  canManagePayments: boolean;
  canManageCMS: boolean;
}

export class AuthorizationService {
  calculatePermissions(authUser: AuthUser | null): Permissions {
    const basePermissions: Permissions = {
      canEditCourses: false,
      canIssueCertificates: false,
      canViewCRM: false,
      canManageUsers: false,
      canViewAdminDashboard: false,
      canManageCourses: false,
      canManageStudents: false,
      canManageMentors: false,
      canManagePayments: false,
      canManageCMS: false,
    };

    if (!authUser) return basePermissions;

    if (authUser.highestRole === PortalRole.ADMIN) {
      return {
        ...basePermissions,
        canEditCourses: true,
        canIssueCertificates: true,
        canViewCRM: true,
        canManageUsers: true,
        canViewAdminDashboard: true,
        canManageCourses: true,
        canManageStudents: true,
        canManageMentors: true,
        canManagePayments: true,
        canManageCMS: true,
      };
    }

    if (authUser.highestRole === PortalRole.MENTOR) {
      return {
        ...basePermissions,
        canEditCourses: true,
        canIssueCertificates: true,
      };
    }

    // Student permissions are effectively just base
    return basePermissions;
  }

  hasPermission(permissions: Permissions | null, requiredPermission: keyof Permissions): boolean {
    if (!permissions) return false;
    return permissions[requiredPermission] === true;
  }
}

export const authorizationService = new AuthorizationService();
