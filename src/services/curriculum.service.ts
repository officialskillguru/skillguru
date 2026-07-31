// Module/lesson/resource CRUD for course curriculum building (mentor/admin course
// editors). Complements courses.service.ts (course-level CRUD) and learning.service.ts/
// lesson.service.ts (read-only student-facing curriculum access) - this file is the
// missing write side for modules/lessons/resources, which previously only had SELECT
// queries anywhere in the codebase.
import type { Inserts, Tables, Updates } from "@/types/database";
import { assertServiceResponse, getSupabaseClientOrThrow } from "./_shared";

export type Module = Tables<"modules">;
export type Lesson = Tables<"lessons">;
export type Resource = Tables<"resources">;
export type ModuleInput = Inserts<"modules">;
export type LessonInput = Inserts<"lessons">;
export type ResourceInput = Inserts<"resources">;

export type ModuleWithLessons = Module & { lessons: Lesson[] };

export async function getCourseCurriculum(courseId: string): Promise<ModuleWithLessons[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("modules")
    .select("*, lessons(*)")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true })
    .order("sort_order", { referencedTable: "lessons", ascending: true });
  assertServiceResponse(error);
  return data ?? [];
}

// ─── Modules ──────────────────────────────────────────────────────────────────

export async function createModule(input: ModuleInput): Promise<Module> {
  const supabase = getSupabaseClientOrThrow();

  if (input.sort_order === undefined) {
    const { count } = await supabase
      .from("modules")
      .select("id", { count: "exact", head: true })
      .eq("course_id", input.course_id);
    input = { ...input, sort_order: count ?? 0 };
  }

  const { data, error } = await supabase.from("modules").insert(input).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function updateModule(id: string, input: Updates<"modules">): Promise<Module> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("modules").update(input).eq("id", id).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function deleteModule(id: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("modules").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  assertServiceResponse(error);
}

export async function reorderModules(courseId: string, orderedModuleIds: string[]): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  await Promise.all(
    orderedModuleIds.map((id, index) =>
      supabase.from("modules").update({ sort_order: index }).eq("id", id).eq("course_id", courseId)
    )
  );
}

// ─── Lessons ──────────────────────────────────────────────────────────────────

export async function createLesson(input: LessonInput): Promise<Lesson> {
  const supabase = getSupabaseClientOrThrow();

  if (input.sort_order === undefined) {
    const { count } = await supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("module_id", input.module_id);
    input = { ...input, sort_order: count ?? 0 };
  }

  const { data, error } = await supabase.from("lessons").insert(input).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function updateLesson(id: string, input: Updates<"lessons">): Promise<Lesson> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("lessons").update(input).eq("id", id).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function deleteLesson(id: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("lessons").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  assertServiceResponse(error);
}

export async function reorderLessons(moduleId: string, orderedLessonIds: string[]): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  await Promise.all(
    orderedLessonIds.map((id, index) =>
      supabase.from("lessons").update({ sort_order: index }).eq("id", id).eq("module_id", moduleId)
    )
  );
}

// ─── Resources ────────────────────────────────────────────────────────────────

export async function createResource(input: ResourceInput): Promise<Resource> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("resources").insert(input).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function deleteResource(id: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("resources").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  assertServiceResponse(error);
}
