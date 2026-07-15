import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { quizService } from "@/services/quiz.service";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/types/database";

type QuizAnswerInsert = Database["public"]["Tables"]["quiz_answers"]["Insert"];

export function useQuiz(lessonId: string) {
  const { user } = useAuth();
  const studentId = user?.id;
  const queryClient = useQueryClient();

  const quizQuery = useQuery({
    queryKey: ["quiz", lessonId],
    queryFn: async () => {
      if (!lessonId) return null;
      const res = await quizService.getQuizForLesson(lessonId);
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!lessonId,
  });

  const startAttempt = useMutation({
    mutationFn: async (quizId: string) => {
      if (!studentId) throw new Error("Not authenticated");
      const res = await quizService.startQuiz(studentId, quizId);
      if (!res.success) throw res.error;
      return res.data;
    }
  });

  const submitAttempt = useMutation({
    mutationFn: async ({ attemptId, answers, score, passed }: { attemptId: string, answers: QuizAnswerInsert[], score: number, passed: boolean }) => {
      const res = await quizService.submitQuiz(attemptId, answers, score, passed);
      if (!res.success) throw res.error;
      return res.data;
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["quiz", lessonId] });
    }
  });

  return {
    quiz: quizQuery.data,
    isLoading: quizQuery.isLoading,
    error: quizQuery.error,
    startAttempt,
    submitAttempt
  };
}
