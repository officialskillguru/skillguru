import { type Result } from "@/utils/result";
import { quizRepository, type SubmitQuizAttemptResult } from "@/repositories/quiz.repository";
import type { Database } from "@/types/database.types";
import { type AppError } from "@/utils/result";

type QuizRow = Database["public"]["Tables"]["quizzes"]["Row"];
type QuizQuestionRow = Database["public"]["Tables"]["quiz_questions"]["Row"];
type QuizOptionRow = Pick<Database["public"]["Tables"]["quiz_options"]["Row"], "id" | "question_id" | "option_text" | "sort_order">;
type QuizAttemptRow = Database["public"]["Tables"]["quiz_attempts"]["Row"];

export type QuizWithQuestions = QuizRow & { quiz_questions: (QuizQuestionRow & { quiz_options: QuizOptionRow[] })[] };

export class QuizService {
  async getQuizForLesson(lessonId: string): Promise<Result<QuizWithQuestions | null, AppError>> {
    return quizRepository.getQuizByLessonId(lessonId) as Promise<Result<QuizWithQuestions | null, AppError>>;
  }

  /** Real, server-scored submission (submit_quiz_attempt RPC) - the answer key never round-trips through the client. */
  async submitAttempt(quizId: string, enrollmentId: string, selectedOptionIds: string[]): Promise<Result<SubmitQuizAttemptResult, AppError>> {
    return quizRepository.submitAttempt(quizId, enrollmentId, selectedOptionIds);
  }

  async getMyAttempts(enrollmentId: string, quizId: string): Promise<Result<QuizAttemptRow[], AppError>> {
    return quizRepository.getMyAttempts(enrollmentId, quizId);
  }
}

export const quizService = new QuizService();
