import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { fail, ok, type Result, DatabaseError } from "@/utils/result";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type MentorRow = Database["public"]["Tables"]["mentor_profiles"]["Row"];
type StudentRow = Database["public"]["Tables"]["student_profiles"]["Row"];

export class ProfilePersistence {
  static async getProfileById(id: string): Promise<Result<ProfileRow, DatabaseError>> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return fail(new DatabaseError(error.message, "getProfileById failed"));
    }
    return ok(data);
  }

  static async getMentorProfileById(id: string): Promise<Result<MentorRow, DatabaseError>> {
    const { data, error } = await supabase
      .from("mentor_profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return fail(new DatabaseError(error.message, "getMentorProfileById failed"));
    }
    return ok(data);
  }

  static async getStudentProfileById(id: string): Promise<Result<StudentRow, DatabaseError>> {
    const { data, error } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return fail(new DatabaseError(error.message, "getStudentProfileById failed"));
    }
    return ok(data);
  }

  static async updateProfile(id: string, updates: Partial<ProfileRow>): Promise<Result<ProfileRow, DatabaseError>> {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return fail(new DatabaseError(error.message, "updateProfile failed"));
    }
    return ok(data);
  }
}

