// Saved jobs ("wishlist" for job postings). Plain owner-scoped RLS CRUD -
// mirrors the pattern already used for course wishlists (public.wishlists),
// just against public.saved_placements instead.
import type { Tables } from "@/types/database";
import { assertServiceResponse, getSupabaseClientOrThrow } from "./_shared";

export type SavedPlacement = Tables<"saved_placements">;

export async function listSavedJobIds(studentId: string): Promise<Set<string>> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("saved_placements").select("job_posting_id").eq("student_id", studentId);
  assertServiceResponse(error);
  return new Set((data ?? []).map((row) => row.job_posting_id));
}

export async function saveJob(studentId: string, jobPostingId: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("saved_placements").insert({ student_id: studentId, job_posting_id: jobPostingId });
  assertServiceResponse(error);
}

export async function unsaveJob(studentId: string, jobPostingId: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("saved_placements").delete().match({ student_id: studentId, job_posting_id: jobPostingId });
  assertServiceResponse(error);
}
