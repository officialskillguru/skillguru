import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { listCourses, updateCourseStatus, deleteCourse, type CourseListParams } from "@/services/courses.service";
import type { ContentStatus } from "@/types/database";

export function useAdminCourses(params: CourseListParams) {
  return useQuery({
    queryKey: ["admin_courses", params],
    queryFn: async () => {
      return await listCourses(params);
    },
    placeholderData: keepPreviousData,
  });
}

export function useBulkUpdateCourseStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseIds, status }: { courseIds: string[]; status: ContentStatus }) => {
      await Promise.all(courseIds.map(id => updateCourseStatus(id, status)));
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin_courses"] });
    },
  });
}

export function useBulkDeleteCourses() {
  const queryClient = useQueryClient();


  return useMutation({
    mutationFn: async ({ courseIds }: { courseIds: string[] }) => {
      await Promise.all(courseIds.map((id: string) => deleteCourse(id)));
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin_courses"] });
    },
  });
}
