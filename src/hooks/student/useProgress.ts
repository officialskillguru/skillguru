import { useMutation, useQueryClient } from "@tanstack/react-query";
import { progressService } from "@/services/progress.service";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function useProgress() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const studentId = user?.id;

  const markComplete = useMutation({
    mutationFn: async ({ enrollmentId, lessonId, courseId: _courseId }: { enrollmentId: string, lessonId: string, courseId: string }) => {
      if (!studentId) throw new Error("Not authenticated");
      const res = await progressService.markLessonComplete(enrollmentId, lessonId);
      if (!res.success) throw res.error;
      return res.data;
    },
    onMutate: async () => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["continue-learning", studentId] });
      await queryClient.cancelQueries({ queryKey: ["student-stats", studentId] });

      toast.success("Lesson marked as complete");
    },
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: ["continue-learning", studentId] }); void queryClient.invalidateQueries({ queryKey: ["student-stats", studentId] }); void queryClient.invalidateQueries({ queryKey: ["student-courses", studentId] });
    },
  });

  const updateWatched = useMutation({
    mutationFn: async ({ enrollmentId, lessonId, seconds }: { enrollmentId: string, lessonId: string, seconds: number }) => {
      if (!studentId) throw new Error("Not authenticated");
      const res = await progressService.updateWatchedSeconds(enrollmentId, lessonId, seconds);
      if (!res.success) throw res.error;
      return res.data;
    }
  });

  return {
    markComplete,
    updateWatched
  };
}
