import { supabase } from "@/lib/supabase/client";
import { type Result, ok, fail } from "@/utils/result";
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
      const roles = raw.roles || [];
      const highestRole = this.resolveHighestRole(roles);

      const authUser: AuthUser = {
        profile: mapProfileRowToDomain(raw.profile),
        roles: roles,
        permissions: raw.permissions || [],
        mentorProfile: raw.mentor_profile ? mapMentorRowToDomain(raw.mentor_profile) : null,
        studentProfile: raw.student_profile ? mapStudentRowToDomain(raw.student_profile) : null,
        highestRole,
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
