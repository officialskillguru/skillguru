import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { fail, ok, type Result, DatabaseError } from "@/utils/result";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
type ModuleRow = Database["public"]["Tables"]["modules"]["Row"];
type LessonRow = Database["public"]["Tables"]["lessons"]["Row"];

export class CoursePersistence {
  static async getCourseById(id: string): Promise<Result<CourseRow, DatabaseError>> {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return fail(new DatabaseError(error.message, "getCourseById failed"));
    }
    return ok(data);
  }

  static async getCourseBySlug(slug: string): Promise<Result<CourseRow, DatabaseError>> {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) {
      return fail(new DatabaseError(error.message, "getCourseBySlug failed"));
    }
    return ok(data);
  }

  static async getModulesForCourse(courseId: string): Promise<Result<ModuleRow[], DatabaseError>> {
    const { data, error } = await supabase
      .from("modules")
      .select("*")
      .eq("course_id", courseId)
      .order("sort_order", { ascending: true });

    if (error) {
      return fail(new DatabaseError(error.message, "getModulesForCourse failed"));
    }
    return ok(data || []);
  }

  static async getLessonsForModule(moduleId: string): Promise<Result<LessonRow[], DatabaseError>> {
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("module_id", moduleId)
      .order("sort_order", { ascending: true });

    if (error) {
      return fail(new DatabaseError(error.message, "getLessonsForModule failed"));
    }
    return ok(data || []);
  }

  static async searchCourses(filters: { query?: string; level?: string; status?: string }, sort: string, page: number, limit: number): Promise<Result<{data: CourseRow[], count: number}, DatabaseError>> {
    const offset = (page - 1) * limit;

    let q = supabase
      .from("courses")
      .select("*", { count: "exact" });

    if (filters.query) {
      q = q.ilike("title", `%${filters.query}%`);
        if (filters.level) q = q.eq("level", filters.level as NonNullable<"beginner" | "intermediate" | "advanced" | "all_levels">);
        if (filters.status) q = q.eq("status", filters.status as NonNullable<"draft" | "under_review" | "published" | "archived">);
    } else {
      q = q.eq("status", "published");
    }

    switch (sort) {
      case "newest":
        q = q.order("created_at", { ascending: false });
        break;
      case "popular":
      case "highest_rated":
      case "recommended":
      default:
        q = q.order("created_at", { ascending: false });
        break;
    }

    const { data, error, count } = await q.range(offset, offset + limit - 1);

    if (error) {
      return fail(new DatabaseError(error.message, "searchCourses failed"));
    }
    return ok({ data: data || [], count: count || 0 });
  }
}
