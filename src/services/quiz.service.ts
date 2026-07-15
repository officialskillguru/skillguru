
import { type Result } from "@/utils/result";
import { quizRepository } from "@/repositories/quiz.repository";
import type { Database } from "@/types/database.types";
import { type AppError } from "@/utils/result";

type QuizRow = Database["public"]["Tables"]["quizzes"]["Row"];
type QuizAttemptRow = Database["public"]["Tables"]["quiz_attempts"]["Row"];
type QuizAnswerInsert = Database["public"]["Tables"]["quiz_answers"]["Insert"];

export class QuizService {
  async getQuizForLesson(lessonId: string): Promise<Result<QuizRow | null, AppError>> {
    return quizRepository.getQuizByLessonId(lessonId);
  }

  async startQuiz(enrollmentId: string, quizId: string): Promise<Result<QuizAttemptRow, AppError>> {
    return quizRepository.startAttempt({ enrollment_id: enrollmentId, quiz_id: quizId });
  }

  async submitQuiz(attemptId: string, answers: QuizAnswerInsert[], score: number, passed: boolean): Promise<Result<void, AppError>> {
    const submitResult = await quizRepository.submitAnswers(answers);
    if (!submitResult.success) return submitResult;

    return quizRepository.finishAttempt(attemptId, score, passed);
  }
}

export const quizService = new QuizService();

