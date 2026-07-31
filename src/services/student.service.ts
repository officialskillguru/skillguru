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

export interface DailyStudyHours {
  day: string;
  hours: number;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

  /**
   * Real study-time chart from lesson_progress.time_spent_seconds (previously
   * a permanent "coming in a future release" placeholder, despite this real
   * per-lesson time-tracking data already existing and being written to by
   * the course-learning flow). rangeDays controls the window (7 = this week,
   * 30 = this month); days are always returned in real calendar order.
   */
  async getWeeklyStudyHours(studentId: string, rangeDays: 7 | 30 = 7): Promise<Result<DailyStudyHours[], AppError>> {
    try {
      const { data: enrollmentRows, error: enrollmentError } = await supabase
        .from("enrollments")
        .select("id")
        .eq("student_id", studentId);
      if (enrollmentError) throw enrollmentError;

      const enrollmentIds = (enrollmentRows ?? []).map((e) => e.id);
      if (enrollmentIds.length === 0) return ok([]);

      const rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - (rangeDays - 1));
      rangeStart.setHours(0, 0, 0, 0);

      const { data: progressRows, error: progressError } = await supabase
        .from("lesson_progress")
        .select("updated_at, time_spent_seconds")
        .in("enrollment_id", enrollmentIds)
        .gte("updated_at", rangeStart.toISOString());
      if (progressError) throw progressError;

      const secondsByDay = new Map<string, number>();
      for (const row of progressRows ?? []) {
        const dateKey = row.updated_at.slice(0, 10);
        secondsByDay.set(dateKey, (secondsByDay.get(dateKey) ?? 0) + (row.time_spent_seconds ?? 0));
      }

      const result: DailyStudyHours[] = [];
      for (let i = rangeDays - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().slice(0, 10);
        const label = rangeDays === 7 ? DAY_LABELS[date.getDay()]! : `${date.getMonth() + 1}/${date.getDate()}`;
        const seconds = secondsByDay.get(dateKey) ?? 0;
        result.push({ day: label, hours: Math.round((seconds / 3600) * 10) / 10 });
      }

      return ok(result);
    } catch (err: unknown) {
      logger.error("StudentService getWeeklyStudyHours Error", err);
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
