import { BaseRepository, type PaginationOptions, type PaginatedResponse } from "./base.repository";
import { supabase } from "@/lib/supabase/client";
import { type Result, ok, fail, DatabaseError } from "@/utils/result";
import type { Database } from "@/types/database.types";

export type LessonProgressRow = Database["public"]["Tables"]["lesson_progress"]["Row"];
export type LessonProgressInsert = Database["public"]["Tables"]["lesson_progress"]["Insert"];
export type CourseProgressRow = Database["public"]["Tables"]["course_progress"]["Row"];

export class ProgressRepository extends BaseRepository<"lesson_progress"> {
  constructor() {
    super(supabase, "lesson_progress");
  }

  search(_query: string, _options: PaginationOptions): Promise<Result<PaginatedResponse<LessonProgressRow>>> {
    return Promise.resolve(fail(new DatabaseError("Search not supported on lesson_progress", "NOT_SUPPORTED")));
  }

  async upsertLessonProgress(data: LessonProgressInsert): Promise<Result<LessonProgressRow>> {
    try {
      const { data: result, error } = await this.client
        .from("lesson_progress")
        .upsert(data, { onConflict: "enrollment_id,lesson_id" })
        .select()
        .single();

      if (error) return fail(this.mapError(error, "upsertLessonProgress"));
      return ok(result);
    } catch (err: unknown) {
      return fail(this.mapError(err, "upsertLessonProgress"));
    }
  }

  async getCourseProgress(enrollmentId: string): Promise<Result<CourseProgressRow | null>> {
    try {
      const { data, error } = await this.client
        .from("course_progress")
        .select("*")
        .eq("enrollment_id", enrollmentId)
        .maybeSingle();

      if (error) return fail(this.mapError(error, "getCourseProgress"));
      return ok(data);
    } catch (err: unknown) {
      return fail(this.mapError(err, "getCourseProgress"));
    }
  }
}

export const progressRepository = new ProgressRepository();
