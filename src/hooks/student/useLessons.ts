import { useQuery } from "@tanstack/react-query";
import { lessonService } from "@/services/lesson.service";

export function useCourseModules(courseId: string) {
  return useQuery({
    queryKey: ["course-modules", courseId],
    queryFn: async () => {
      if (!courseId) return null;
      const res = await lessonService.getCourseModules(courseId);
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!courseId,
  });
}

export function useModuleLessons(moduleId: string) {
  return useQuery({
    queryKey: ["module-lessons", moduleId],
    queryFn: async () => {
      if (!moduleId) return null;
      const res = await lessonService.getModuleLessons(moduleId);
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!moduleId,
  });
}

export function useLessonResources(lessonId: string) {
  return useQuery({
    queryKey: ["lesson-resources", lessonId],
    queryFn: async () => {
      if (!lessonId) return null;
      const res = await lessonService.getLessonResources(lessonId);
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!lessonId,
  });
}

export function useLesson(lessonId: string) {
  return useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      if (!lessonId) return null;
      const res = await lessonService.getLessonDetails(lessonId);
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!lessonId,
  });
}
