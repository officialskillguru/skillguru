import { BaseRepository } from "./base.repository";
import { supabase } from "@/lib/supabase/client";
import { type Result, ok, fail, type AppError } from "@/utils/result";
import type { Database } from "@/types/database.types";

export type CourseModuleRow = Database["public"]["Tables"]["modules"]["Row"];
export type LessonRow = Database["public"]["Tables"]["lessons"]["Row"];
export type CourseProgressRow = Database["public"]["Tables"]["course_progress"]["Row"];
export type ResourceRow = Database["public"]["Tables"]["resources"]["Row"];

export class LearningRepository extends BaseRepository<"modules"> {
  constructor() {
    super(supabase, "modules");
  }

  async getCourseModulesWithLessons(courseId: string): Promise<Result<(CourseModuleRow & { lessons: LessonRow[] })[], AppError>> {
    try {
      const { data, error } = await this.client
        .from("modules")
        .select(`
          *,
          lessons (*)
        `)
        .eq("course_id", courseId)
        .order("sort_order", { ascending: true })
        // Order nested lessons by sort_order
        .order("sort_order", { ascending: true, foreignTable: "lessons" });

      if (error) return fail(this.mapError(error, "getCourseModulesWithLessons"));
      
      // Types from supabase nested queries can be messy, cast to our clean type
      return ok((data as unknown) as (CourseModuleRow & { lessons: LessonRow[] })[]);
    } catch (err: unknown) {
      return fail(this.mapError(err, "getCourseModulesWithLessons"));
    }
  }

  async getLessonDetails(lessonId: string): Promise<Result<LessonRow, AppError>> {
    try {
      const { data, error } = await this.client
        .from("lessons")
        .select("*")
        .eq("id", lessonId)
        .single();
        
      if (error) return fail(this.mapError(error, "getLessonDetails"));
      return ok(data);
    } catch (err: unknown) {
      return fail(this.mapError(err, "getLessonDetails"));
    }
  }

  async getLessonResources(lessonId: string): Promise<Result<ResourceRow[], AppError>> {
    try {
      const { data, error } = await this.client
        .from("resources")
        .select("*")
        .eq("lesson_id", lessonId);
        
      if (error) return fail(this.mapError(error, "getLessonResources"));
      return ok(data || []);
    } catch (err: unknown) {
      return fail(this.mapError(err, "getLessonResources"));
    }
  }

  async getStudentProgress(studentId: string, enrollmentId: string): Promise<Result<CourseProgressRow[], AppError>> {
    try {
      const { data, error } = await this.client
        .from("course_progress")
        .select("*")
        .eq("enrollment_id", enrollmentId);
        
      if (error) return fail(this.mapError(error, "getStudentProgress"));
      return ok(data || []);
    } catch (err: unknown) {
      return fail(this.mapError(err, "getStudentProgress"));
    }
  }

  async upsertLessonProgress(progress: Database["public"]["Tables"]["course_progress"]["Insert"]): Promise<Result<CourseProgressRow, AppError>> {
    try {
      // Stubbing this to only update based on enrollment_id as lesson_id and student_id are gone
      const { data, error } = await this.client
        .from("course_progress")
        .upsert(progress, { onConflict: "enrollment_id" })
        .select()
        .single();
        
      if (error) return fail(this.mapError(error, "upsertLessonProgress"));
      return ok(data);
    } catch (err: unknown) {
      return fail(this.mapError(err, "upsertLessonProgress"));
    }
  }

  async search(
    query: string,
    options: { page: number; limit: number }
  ): Promise<Result<{ data: CourseModuleRow[]; count: number; page: number; limit: number; totalPages: number; }, AppError>> {
    try {
      const { page, limit } = options;
      const offset = (page - 1) * limit;

      const { data, count, error } = await this.client
        .from("modules")
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
}

export const learningRepository = new LearningRepository();
