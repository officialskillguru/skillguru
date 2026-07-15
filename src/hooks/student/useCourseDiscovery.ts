import { useQuery } from "@tanstack/react-query";
import { courseService } from "@/services/course.service";
import type { CourseFilters, CourseSortOptions } from "@/repositories/courses.repository";
import type { PaginationOptions } from "@/repositories/base.repository";

export function useCourseDiscovery(
  filters: CourseFilters,
  sort: CourseSortOptions,
  options: PaginationOptions
) {
  return useQuery({
    queryKey: ["course-discovery", filters, sort, options],
    queryFn: async () => {
      const res = await courseService.searchCourses(filters, sort, options);
      if (!res.success) throw res.error;
      return res.data;
    },
    staleTime: 60 * 1000,
  });
}
