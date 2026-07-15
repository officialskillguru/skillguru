
import { supabase } from "@/lib/supabase/client";
import { type Result, ok, fail, AppError } from "@/utils/result";
import type { Database } from "@/types/database.types";
import { logger } from "@/config/logger";

export interface StudentDashboardStats {
  active_enrollments: number;
  completed_courses: number;
  certificates_earned: number;
  unread_notifications: number;
}

export class StudentService {
  async getDashboardStats(studentId: string): Promise<Result<StudentDashboardStats, AppError>> {
    try {
      // 1. Active Enrollments (assumed status 'active' or 'in_progress', we use 'active')
      const activeEnrollmentsReq = supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .eq("student_id", studentId)
        .eq("status", "active"); // Assuming active status

      // 2. Completed Courses
      const completedCoursesReq = supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .eq("student_id", studentId)
        .eq("status", "completed");

      // 3. Certificates Earned
      // Need to fetch active enrollments first to know which certificates belong to this student
      const { data: enrollments } = await supabase.from("enrollments").select("id").eq("student_id", studentId);
      const enrollmentIds = enrollments?.map((e) => e.id) || [];
      
      let certificatesCount = 0;
      if (enrollmentIds.length > 0) {
        const certificatesReq = await supabase
          .from("certificates")
          .select("*", { count: "exact", head: true })
          .in("enrollment_id", enrollmentIds);
        certificatesCount = certificatesReq.count || 0;
      }

      // 4. Notifications removed from schema, hardcoded to 0
      const unreadNotificationsCount = 0;

      const [activeRes, completedRes] = await Promise.all([
        activeEnrollmentsReq,
        completedCoursesReq,
      ]);

      if (activeRes.error) throw activeRes.error;
      if (completedRes.error) throw completedRes.error;

      const stats: StudentDashboardStats = {
        active_enrollments: activeRes.count || 0,
        completed_courses: completedRes.count || 0,
        certificates_earned: certificatesCount,
        unread_notifications: unreadNotificationsCount,
      };

      return ok(stats);
    } catch (err: unknown) {
      logger.error("StudentService getDashboardStats Error", err);
      return fail(new AppError("An unexpected error occurred", "UNEXPECTED_ERROR", err));
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
      return fail(new AppError("Failed to update profile", "DATABASE_ERROR", err));
    }
  }
}

export const studentService = new StudentService();

