import { useQuery, useQueryClient } from "@tanstack/react-query";
import { courseService } from "@/services/course.service";
import { lessonService } from "@/services/lesson.service";
import { useEffect } from "react";

export function useCourse(courseId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      if (!courseId) return null;
      const res = await courseService.getCourseDetails(courseId);
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!courseId,
  });

  // Prefetch Modules and Lessons
  useEffect(() => {
    if (courseId) {
      void queryClient.prefetchQuery({
        queryKey: ["course-modules", courseId],
        queryFn: async () => {
          const res = await lessonService.getCourseModules(courseId);
          if (!res.success) throw res.error;
          return res.data;
        }
      });
    }
  }, [courseId, queryClient]);

  return query;
}
