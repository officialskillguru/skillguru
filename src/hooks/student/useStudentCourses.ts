import { useQuery } from "@tanstack/react-query";
import { courseService } from "@/services/course.service";
import { useAuth } from "@/hooks/useAuth";

export function useStudentCourses(page: number = 1, limit: number = 10) {
  const { user } = useAuth();
  const studentId = user?.id;

  return useQuery({
    queryKey: ["student-courses", studentId, page, limit],
    queryFn: async () => {
      if (!studentId) return null;
      const res = await courseService.getEnrolledCourses(studentId, { page, limit });
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!studentId,
  });
}
