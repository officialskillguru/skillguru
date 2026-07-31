// Real student learning notes (Phase 1 gap - previously no table/service/UI
// existed at all for this; `student_notes`/`mentor_notes` are an unrelated
// CRM concept - staff notes about a student, not a student's own notes).
import type { Inserts, Tables, Updates } from "@/types/database";
import { assertServiceResponse, getSupabaseClientOrThrow } from "./_shared";

export type LessonNote = Tables<"lesson_notes">;
export type LessonNoteWithContext = LessonNote & { lessons: { title: string } | null; courses: { title: string; slug: string } | null };

export async function listMyNotes(studentId: string): Promise<LessonNoteWithContext[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("lesson_notes")
    .select("*, lessons(title), courses(title, slug)")
    .eq("student_id", studentId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  assertServiceResponse(error);
  return data ?? [];
}

export async function getNoteForLesson(studentId: string, lessonId: string): Promise<LessonNote | null> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("lesson_notes")
    .select("*")
    .eq("student_id", studentId)
    .eq("lesson_id", lessonId)
    .is("deleted_at", null)
    .maybeSingle();
  assertServiceResponse(error);
  return data;
}

export async function saveNote(input: Inserts<"lesson_notes">): Promise<LessonNote> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("lesson_notes")
    .upsert(input, { onConflict: "student_id,lesson_id" })
    .select("*")
    .single();
  assertServiceResponse(error);
  return data;
}

export async function updateNote(id: string, input: Updates<"lesson_notes">): Promise<LessonNote> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("lesson_notes").update(input).eq("id", id).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function deleteNote(id: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("lesson_notes").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  assertServiceResponse(error);
}
