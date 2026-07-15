import { useQuery } from "@tanstack/react-query";
import { courseService } from "@/services/course.service";

export function useCourseBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["course-details", slug],
    queryFn: async () => {
      if (!slug) return null;
      const res = await courseService.getCourseBySlug(slug);
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!slug,
    staleTime: 60 * 1000,
  });
}
