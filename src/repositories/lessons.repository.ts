import { BaseRepository, type PaginationOptions, type PaginatedResponse } from "./base.repository";
import { supabase } from "@/lib/supabase/client";
import { type Result, ok, fail, type AppError } from "@/utils/result";
import type { Database } from "@/types/database.types";

type LessonRow = Database["public"]["Tables"]["lessons"]["Row"];
type ModuleRow = Database["public"]["Tables"]["modules"]["Row"];
type ResourceRow = Database["public"]["Tables"]["resources"]["Row"];

export class LessonsRepository extends BaseRepository<"lessons"> {
  constructor() {
    super(supabase, "lessons");
  }

  async search(query: string, options: PaginationOptions): Promise<Result<PaginatedResponse<LessonRow>, AppError>> {
    try {
      const { page, limit } = options;
      const offset = (page - 1) * limit;

      const { data, error, count } = await this.client
        .from(this.tableName)
        .select("*", { count: "exact" })
        .textSearch("title", query)
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

  async getCourseModules(courseId: string): Promise<Result<ModuleRow[], AppError>> {
    try {
      const { data, error } = await this.client
        .from("modules")
        .select("*")
        .eq("course_id", courseId)
        .order("sort_order", { ascending: true });

      if (error) return fail(this.mapError(error, "getCourseModules"));
      return ok(data || []);
    } catch (err: unknown) {
      return fail(this.mapError(err, "getCourseModules"));
    }
  }

  async getModuleLessons(moduleId: string): Promise<Result<LessonRow[], AppError>> {
    try {
      const { data, error } = await this.client
        .from("lessons")
        .select("*")
        .eq("module_id", moduleId)
        .order("sort_order", { ascending: true });

      if (error) return fail(this.mapError(error, "getModuleLessons"));
      return ok(data || []);
    } catch (err: unknown) {
      return fail(this.mapError(err, "getModuleLessons"));
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
}

export const lessonsRepository = new LessonsRepository();
