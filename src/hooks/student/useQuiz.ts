import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { quizService } from "@/services/quiz.service";

export function useQuiz(lessonId: string) {
  return useQuery({
    queryKey: ["quiz", lessonId],
    queryFn: async () => {
      if (!lessonId) return null;
      const res = await quizService.getQuizForLesson(lessonId);
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!lessonId,
  });
}

export function useQuizAttempts(enrollmentId: string | undefined, quizId: string | undefined) {
  return useQuery({
    queryKey: ["quiz-attempts", enrollmentId, quizId],
    queryFn: async () => {
      if (!enrollmentId || !quizId) return [];
      const res = await quizService.getMyAttempts(enrollmentId, quizId);
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!enrollmentId && !!quizId,
  });
}

export function useSubmitQuizAttempt(quizId: string | undefined, enrollmentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (selectedOptionIds: string[]) => {
      if (!quizId || !enrollmentId) throw new Error("Missing quiz or enrollment context");
      const res = await quizService.submitAttempt(quizId, enrollmentId, selectedOptionIds);
      if (!res.success) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quiz-attempts", enrollmentId, quizId] });
    },
  });
}
