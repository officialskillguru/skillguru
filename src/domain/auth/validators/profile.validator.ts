import { fail, ok, type Result, ValidationError } from "@/utils/result";
import type { Profile } from "../models/Profile";

export class ProfileValidator {
  /**
   * Validates business invariants of a profile.
   */
  static validate(profile: Profile): Result<Profile, ValidationError> {
    if (!profile.id) {
      return fail(new ValidationError("Profile ID is required", "Missing_ID", "Provide a valid ID"));
    }
    
    if (!profile.email || !profile.email.includes("@")) {
      return fail(new ValidationError("Valid email is required", "Invalid_Email", "Provide a valid email address"));
    }
    
    if (!profile.fullName || profile.fullName.trim() === "") {
      return fail(new ValidationError("Full name is required", "Missing_FullName", "Provide a full name"));
    }
    
    return ok(profile);
  }
}
