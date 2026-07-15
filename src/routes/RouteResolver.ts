import type { AuthUser } from "@/types/auth.types";
import { routes } from "@/lib/routes";

const ROLE_ROUTE_MAP: Record<string, string> = {
  admin: routes.admin.dashboard,
  mentor: routes.mentor.dashboard,
  student: routes.dashboard,
};

export class RouteResolver {
  /**
   * Returns the appropriate dashboard route for the user based on their highest role.
   */
  static getDashboard(user: AuthUser | null): string {
    if (!user) {
      return routes.login;
    }
    
    // Default to student dashboard if role not found in map
    return ROLE_ROUTE_MAP[user.highestRole] || routes.dashboard;
  }
}
