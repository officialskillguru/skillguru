import { supabase } from "@/lib/supabase/client";
import { type Result, ok, fail, AuthorizationError } from "@/utils/result";
import type { AuthUser } from "@/types/auth.types";
import { AuthErrorMapper } from "@/utils/AuthErrorMapper";
import { mapProfileRowToDomain, mapMentorRowToDomain, mapStudentRowToDomain } from "@/domain/auth/mappers/profile.mapper";
import type { Database } from "@/types/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type MentorRow = Database["public"]["Tables"]["mentor_profiles"]["Row"];
type StudentRow = Database["public"]["Tables"]["student_profiles"]["Row"];

export class IdentityService {
  /**
   * Loads the complete identity payload from the database via RPC.
   * This handles fetching the profile, roles, permissions, and domain profiles in one shot.
   */
  async loadCurrentUser(): Promise<Result<AuthUser>> {
    try {
      const { data, error } = await supabase.rpc("get_current_identity");
      
      if (error) {
        return fail(AuthErrorMapper.map(error));
      }

      if (!data) {
        return fail(AuthErrorMapper.map({ message: "Identity not found.", code: "404" }));
      }

      interface IdentityPayload {
        profile: ProfileRow;
        roles: string[];
        permissions: string[];
        mentor_profile: MentorRow;
        student_profile: StudentRow;
      }

      const raw = data as unknown as IdentityPayload;

      // A locked/login-disabled mentor account must never reach a usable
      // session, even if their credentials were valid at sign-in time — the
      // admin-mentor-account edge function can disable login independent of
      // the mentor_profiles.status ('active'/'suspended') lifecycle.
      if (raw.mentor_profile?.login_disabled) {
        await supabase.auth.signOut();
        return fail(
          new AuthorizationError(
            "This mentor account has been disabled by an administrator.",
            "MENTOR_LOGIN_DISABLED",
            "Contact the platform administrator for access."
          )
        );
      }

      const roles = raw.roles || [];
      const highestRole = this.resolveHighestRole(roles);

      // Not part of get_current_identity() (a shared SECURITY DEFINER RPC) - fetched
      // separately via a normal RLS-scoped query so that RPC doesn't need touching.
      const { data: settings } = await supabase
        .from("user_settings")
        .select("password_reset_required")
        .eq("user_id", raw.profile.id)
        .maybeSingle();

      const authUser: AuthUser = {
        profile: mapProfileRowToDomain(raw.profile),
        roles: roles,
        permissions: raw.permissions || [],
        mentorProfile: raw.mentor_profile ? mapMentorRowToDomain(raw.mentor_profile) : null,
        studentProfile: raw.student_profile ? mapStudentRowToDomain(raw.student_profile) : null,
        highestRole,
        passwordResetRequired: settings?.password_reset_required ?? false,
      };

      return ok(authUser);
    } catch (e) {
      return fail(AuthErrorMapper.map(e));
    }
  }

  /**
   * Resolves the highest priority role based on the configured hierarchy.
   */
  private resolveHighestRole(roles: string[]): string {
    if (roles.includes("admin")) return "admin";
    if (roles.includes("mentor")) return "mentor";
    if (roles.includes("student")) return "student";
    // Fallback if no specific role is assigned yet (shouldn't happen with trigger)
    return "student";
  }
}

export const identityService = new IdentityService();
