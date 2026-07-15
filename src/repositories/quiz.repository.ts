import { BaseRepository, type PaginationOptions, type PaginatedResponse } from "./base.repository";
import { supabase } from "@/lib/supabase/client";
import { type Result, ok, fail, type AppError } from "@/utils/result";
import type { Database } from "@/types/database.types";

type QuizRow = Database["public"]["Tables"]["quizzes"]["Row"];
type QuizAttemptRow = Database["public"]["Tables"]["quiz_attempts"]["Row"];
type QuizAttemptInsert = Database["public"]["Tables"]["quiz_attempts"]["Insert"];
type QuizAnswerInsert = Database["public"]["Tables"]["quiz_answers"]["Insert"];

export class QuizRepository extends BaseRepository<"quizzes"> {
  constructor() {
    super(supabase, "quizzes");
  }

  async search(query: string, options: PaginationOptions): Promise<Result<PaginatedResponse<QuizRow>, AppError>> {
    // Quizzes may not have a dedicated index, but we can search by title
    try {
      const { page, limit } = options;
      const offset = (page - 1) * limit;

      const { data, error, count } = await this.client
        .from(this.tableName)
        .select("*", { count: "exact" })
        .ilike("title", `%${query}%`) // Fallback to ilike if no tsvector
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
      const { data, error } = await this.client
        .from("quizzes")
        .select(`
          *,
          quiz_questions (
            *,
            quiz_options (*)
          )
        `)
        .eq("module_id", lessonId) // schema change: quizzes are linked to modules, not lessons
        .maybeSingle();

      if (error) return fail(this.mapError(error, "getQuizByLessonId"));
      return ok(data);
    } catch (err: unknown) {
      return fail(this.mapError(err, "getQuizByLessonId"));
    }
  }

  async startAttempt(attempt: QuizAttemptInsert): Promise<Result<QuizAttemptRow, AppError>> {
    try {
      const { data, error } = await this.client
        .from("quiz_attempts")
        .insert(attempt as never)
        .select()
        .single();
      
      if (error) return fail(this.mapError(error, "startAttempt"));
      return ok(data);
    } catch (err: unknown) {
      return fail(this.mapError(err, "startAttempt"));
    }
  }

  async submitAnswers(answers: QuizAnswerInsert[]): Promise<Result<void, AppError>> {
    try {
      const { error } = await this.client
        .from("quiz_answers")
        .insert(answers as never);
      
      if (error) return fail(this.mapError(error, "submitAnswers"));
      return ok(undefined);
    } catch (err: unknown) {
      return fail(this.mapError(err, "submitAnswers"));
    }
  }

  async finishAttempt(attemptId: string, score: number, passed: boolean): Promise<Result<void, AppError>> {
    try {
      const { error } = await this.client
        .from("quiz_attempts")
        .update({ 
          score,
          passed,
          completed_at: new Date().toISOString()
        } as never)
        .eq("id", attemptId);
      
      if (error) return fail(this.mapError(error, "finishAttempt"));
      return ok(undefined);
    } catch (err: unknown) {
      return fail(this.mapError(err, "finishAttempt"));
    }
  }
}

export const quizRepository = new QuizRepository();
