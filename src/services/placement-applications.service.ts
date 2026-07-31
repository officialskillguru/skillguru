// Placement application pipeline. Every state-changing operation goes through
// a SECURITY DEFINER RPC (see 20260727073017_placement_module_schema.sql) -
// there is no direct INSERT/UPDATE RLS policy on placement_applications by
// design, mirroring this project's submit_quiz_attempt/reply_to_testimonial
// pattern for privileged, cross-cutting writes.
import type { Tables } from "@/types/database";
import { assertServiceResponse, getSupabaseClientOrThrow } from "./_shared";

export type PlacementApplication = Tables<"placement_applications">;
export type PlacementStatusHistoryRow = Tables<"placement_status_history">;

export type PlacementApplicationWithJob = PlacementApplication & {
  job_postings: (Tables<"job_postings"> & { hiring_partners: Pick<Tables<"hiring_partners">, "id" | "name" | "logo_url"> | null }) | null;
};

export type PlacementApplicationWithStudent = PlacementApplication & {
  profiles: Pick<Tables<"profiles">, "id" | "full_name" | "email"> | null;
};

export const PLACEMENT_PIPELINE_STAGES = [
  "applied",
  "shortlisted",
  "interview_round_1",
  "interview_round_2",
  "hr_round",
  "selected",
  "offer_released",
  "joined",
] as const;

export type PlacementStage = (typeof PLACEMENT_PIPELINE_STAGES)[number] | "rejected" | "withdrawn";

// ─── Student ─────────────────────────────────────────────────────────────────

export async function applyToJob(jobPostingId: string, resumeFileId: string, coverNote?: string): Promise<string> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.rpc("apply_to_job", {
    p_job_posting_id: jobPostingId,
    p_resume_file_id: resumeFileId,
    p_cover_note: coverNote,
  });
  assertServiceResponse(error);
  return data;
}

export async function withdrawApplication(applicationId: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.rpc("withdraw_application", { p_application_id: applicationId });
  assertServiceResponse(error);
}

export async function listMyApplications(studentId: string): Promise<PlacementApplicationWithJob[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("placement_applications")
    .select("*, job_postings(*, hiring_partners(id, name, logo_url))")
    .eq("student_id", studentId)
    .order("applied_at", { ascending: false });
  assertServiceResponse(error);
  return data ?? [];
}

export async function getMyApplicationForJob(studentId: string, jobPostingId: string): Promise<PlacementApplication | null> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("placement_applications")
    .select("*")
    .eq("student_id", studentId)
    .eq("job_posting_id", jobPostingId)
    .maybeSingle();
  assertServiceResponse(error);
  return data;
}

export async function listStatusHistory(applicationId: string): Promise<PlacementStatusHistoryRow[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("placement_status_history")
    .select("*")
    .eq("application_id", applicationId)
    .order("changed_at", { ascending: true });
  assertServiceResponse(error);
  return data ?? [];
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export async function listApplicantsForJob(jobPostingId: string): Promise<PlacementApplicationWithStudent[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("placement_applications")
    .select("*, profiles(id, full_name, email)")
    .eq("job_posting_id", jobPostingId)
    .order("applied_at", { ascending: false });
  assertServiceResponse(error);
  return data ?? [];
}

export async function listAllApplications(): Promise<(PlacementApplicationWithStudent & PlacementApplicationWithJob)[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("placement_applications")
    .select("*, profiles(id, full_name, email), job_postings(*, hiring_partners(id, name, logo_url))")
    .order("applied_at", { ascending: false });
  assertServiceResponse(error);
  return data ?? [];
}

export async function advanceApplicationStage(applicationId: string, newStatus: PlacementStage, note?: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.rpc("advance_application_stage", {
    p_application_id: applicationId,
    p_new_status: newStatus,
    p_note: note,
  });
  assertServiceResponse(error);
}
