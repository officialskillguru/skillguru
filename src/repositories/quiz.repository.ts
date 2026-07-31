import { BaseRepository, type PaginationOptions, type PaginatedResponse } from "./base.repository";
import { supabase } from "@/lib/supabase/client";
import { type Result, ok, fail, type AppError } from "@/utils/result";
import type { Database } from "@/types/database.types";

type QuizRow = Database["public"]["Tables"]["quizzes"]["Row"];

export type SubmitQuizAttemptResult = {
  attemptId: string;
  score: number;
  passed: boolean;
  correctCount: number;
  totalGradable: number;
};

export class QuizRepository extends BaseRepository<"quizzes"> {
  constructor() {
    super(supabase, "quizzes");
  }

  async search(query: string, options: PaginationOptions): Promise<Result<PaginatedResponse<QuizRow>, AppError>> {
    try {
      const { page, limit } = options;
      const offset = (page - 1) * limit;

      const { data, error, count } = await this.client
        .from(this.tableName)
        .select("*", { count: "exact" })
        .ilike("title", `%${query}%`)
        .range(offset, offset + limit - 1);

      if (error) return fail(this.mapError(error, "search"));

      const totalCount = count || 0;
      return ok({
        data: data || [],
        count: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      });
    } catch (err: unknown) {
      return fail(this.mapError(err, "search"));
    }
  }

  async getQuizByLessonId(lessonId: string): Promise<Result<QuizRow | null, AppError>> {
    try {
      // Real per-lesson quizzes use quizzes.lesson_id (added alongside the
      // real quiz-taking flow - the pre-existing module_id column is a
      // separate, unrelated legacy linkage this project never built any real
      // authoring/taking UI against). quiz_options deliberately never selects
      // is_correct here - the answer key must never reach the client before
      // a real attempt is scored server-side (see submitAttempt below).
      const { data, error } = await this.client
        .from("quizzes")
        .select(`
          *,
          quiz_questions (
            *,
            quiz_options (id, question_id, option_text, sort_order)
          )
        `)
        .eq("lesson_id", lessonId)
        .eq("is_published", true)
        .maybeSingle();

      if (error) return fail(this.mapError(error, "getQuizByLessonId"));
      return ok(data);
    } catch (err: unknown) {
      return fail(this.mapError(err, "getQuizByLessonId"));
    }
  }

  /** Real, server-side-scored submission - see the submit_quiz_attempt() RPC. Never sends/receives the answer key. */
  async submitAttempt(quizId: string, enrollmentId: string, selectedOptionIds: string[]): Promise<Result<SubmitQuizAttemptResult, AppError>> {
    try {
      const { data, error } = await this.client.rpc("submit_quiz_attempt", {
        p_quiz_id: quizId,
        p_enrollment_id: enrollmentId,
        p_selected_option_ids: selectedOptionIds,
      });
      if (error) return fail(this.mapError(error, "submitAttempt"));

      const result = data as unknown as { attemptId: string; score: number; passed: boolean; correctCount: number; totalGradable: number };
      return ok({
        attemptId: result.attemptId,
        score: result.score,
        passed: result.passed,
        correctCount: result.correctCount,
        totalGradable: result.totalGradable,
      });
    } catch (err: unknown) {
      return fail(this.mapError(err, "submitAttempt"));
    }
  }

  async getMyAttempts(enrollmentId: string, quizId: string) {
    try {
      const { data, error } = await this.client
        .from("quiz_attempts")
        .select("*")
        .eq("enrollment_id", enrollmentId)
        .eq("quiz_id", quizId)
        .order("attempt_number", { ascending: false });
      if (error) return fail(this.mapError(error, "getMyAttempts"));
      return ok(data ?? []);
    } catch (err: unknown) {
      return fail(this.mapError(err, "getMyAttempts"));
    }
  }
}

export const quizRepository = new QuizRepository();
