import { supabase } from "@/lib/supabase/client";
import { type Result, ok, fail, DatabaseError, UnexpectedError } from "@/utils/result";
import type { AppError } from "@/utils/result";
import type { Database } from "@/types/database.types";
import { logger } from "@/config/logger";

export interface StudentDashboardStats {
  enrolledCourses: number;
  completedCourses: number;
  certificates: number;
}

export class StudentService {
  async getDashboardStats(studentId: string): Promise<Result<StudentDashboardStats, AppError>> {
    try {
      const { count: enrolledCourses, error: enrolledError } = await supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .eq("student_id", studentId);
        
      if (enrolledError) throw enrolledError;

      const { count: completedCourses, error: completedError } = await supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .eq("student_id", studentId)
        .eq("status", "completed");
        
      if (completedError) throw completedError;

      const { count: certificates, error: certError } = await supabase
        .from("certificates")
        .select("*, enrollments!inner(student_id)", { count: "exact", head: true })
        .eq("enrollments.student_id", studentId);
        
      if (certError) throw certError;

      const stats: StudentDashboardStats = {
        enrolledCourses: enrolledCourses || 0,
        completedCourses: completedCourses || 0,
        certificates: certificates || 0
      };

      return ok(stats);
    } catch (err: unknown) {
      logger.error("StudentService getDashboardStats Error", err);
      return fail(new UnexpectedError("An unexpected error occurred", String(err), undefined, err));
    }
  }

  async updateProfile(studentId: string, updates: Partial<Database["public"]["Tables"]["profiles"]["Update"]>): Promise<Result<void, AppError>> {
    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", studentId);
        
      if (error) throw error;
      return ok(undefined);
    } catch (err: unknown) {
      logger.error("StudentService updateProfile Error", err);
      return fail(new DatabaseError("Failed to update profile", String(err), undefined, err));
    }
  }
}

export const studentService = new StudentService();
