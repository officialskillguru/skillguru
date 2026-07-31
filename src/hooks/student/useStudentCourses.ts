import { useQuery } from "@tanstack/react-query";
import { courseService } from "@/services/course.service";
import { useAuth } from "@/hooks/useAuth";
import { getSupabaseClientOrThrow } from "@/services/_shared";

export function useStudentCourses(page: number = 1, limit: number = 10) {
  const { user } = useAuth();
  const studentId = user?.id;

  return useQuery({
    queryKey: ["student-courses", studentId, page, limit],
    queryFn: async () => {
      if (!studentId) return null;
      const res = await courseService.getEnrolledCourses(studentId, { page, limit });
      if (!res.success) throw res.error;

      // getEnrolledCourses doesn't carry progress - it's a separate rollup
      // table (course_progress), same pattern continue-learning.service.ts
      // already uses. Without this, every course card would show a
      // hardcoded 0% regardless of real progress.
      const enrollmentIds = res.data.data.map((e) => e.id);
      const progressByEnrollmentId = new Map<string, number>();
      if (enrollmentIds.length > 0) {
        const supabase = getSupabaseClientOrThrow();
        const { data: progressRows } = await supabase
          .from("course_progress")
          .select("enrollment_id, completion_percentage")
          .in("enrollment_id", enrollmentIds);
        for (const row of progressRows ?? []) {
          progressByEnrollmentId.set(row.enrollment_id, row.completion_percentage ?? 0);
        }
      }

      return {
        ...res.data,
        data: res.data.data.map((enrollment) => ({
          ...enrollment,
          progressPercentage: progressByEnrollmentId.get(enrollment.id) ?? 0,
        })),
      };
    },
    enabled: !!studentId,
  });
}
