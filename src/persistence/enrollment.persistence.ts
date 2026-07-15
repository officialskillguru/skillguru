import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { fail, ok, type Result, DatabaseError } from "@/utils/result";

type EnrollmentRow = Database["public"]["Tables"]["enrollments"]["Row"];

export class EnrollmentPersistence {
  static async getEnrollmentById(id: string): Promise<Result<EnrollmentRow, DatabaseError>> {
    const { data, error } = await supabase
      .from("enrollments")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return fail(new DatabaseError(error.message, "getEnrollmentById failed"));
    }
    return ok(data);
  }

  static async getEnrollmentsByStudent(studentId: string, page: number, limit: number): Promise<Result<{data: EnrollmentRow[], count: number}, DatabaseError>> {
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from("enrollments")
      .select("*", { count: "exact" })
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return fail(new DatabaseError(error.message, "getEnrollmentsByStudent failed"));
    }
    return ok({ data: data || [], count: count || 0 });
  }
}
