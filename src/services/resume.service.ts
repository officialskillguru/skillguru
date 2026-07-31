// Resume Builder (Phase 1 - previously entirely greenfield). Reuses existing
// data rather than duplicating it: contact/links/summary live on `profiles`
// (full_name/phone/city/state/country/linkedin_url/github_url/portfolio_url/
// website_url/bio - all real columns with no prior edit UI anywhere in the
// app), education/skills live on `student_profiles` (also previously
// UI-less). Only work experience/projects/certifications/achievements are
// genuinely new, list-shaped tables - see 20260727080000_resume_builder.sql.
import type { Inserts, Tables, Updates } from "@/types/database";
import { assertServiceResponse, getSupabaseClientOrThrow } from "./_shared";

export type ResumeExperience = Tables<"resume_experience">;
export type ResumeProject = Tables<"resume_projects">;
export type ResumeCertification = Tables<"resume_certifications">;
export type ResumeAchievement = Tables<"resume_achievements">;

export type ResumeContact = Pick<
  Tables<"profiles">,
  "id" | "full_name" | "email" | "phone" | "city" | "state" | "country" | "linkedin_url" | "github_url" | "portfolio_url" | "website_url" | "bio"
>;

export type ResumeEducation = Pick<Tables<"student_profiles">, "education" | "college" | "graduation_year" | "skills">;

export type ResumeProfile = ResumeContact & ResumeEducation;

type ResumeListTable = "resume_experience" | "resume_projects" | "resume_certifications" | "resume_achievements";

async function nextSortOrder(table: ResumeListTable, studentId: string) {
  const supabase = getSupabaseClientOrThrow();
  const { count } = await supabase.from(table).select("id", { count: "exact", head: true }).eq("student_id", studentId).is("deleted_at", null);
  return count ?? 0;
}

// ─── Contact / Summary / Education (reused columns) ────────────────────────

export async function getResumeProfile(studentId: string): Promise<ResumeProfile> {
  const supabase = getSupabaseClientOrThrow();
  const [{ data: profile, error: profileError }, { data: studentProfile, error: studentError }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, city, state, country, linkedin_url, github_url, portfolio_url, website_url, bio")
      .eq("id", studentId)
      .single(),
    supabase.from("student_profiles").select("education, college, graduation_year, skills").eq("id", studentId).maybeSingle(),
  ]);
  assertServiceResponse(profileError);
  assertServiceResponse(studentError);

  return {
    ...profile,
    education: studentProfile?.education ?? null,
    college: studentProfile?.college ?? null,
    graduation_year: studentProfile?.graduation_year ?? null,
    skills: studentProfile?.skills ?? [],
  };
}

export async function updateResumeContact(studentId: string, patch: Updates<"profiles">): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("profiles").update(patch).eq("id", studentId);
  assertServiceResponse(error);
}

export async function updateResumeEducation(
  _studentId: string,
  patch: { education?: string | null; college?: string | null; graduation_year?: number | null; skills?: string[] }
): Promise<void> {
  // student_profiles' INSERT policy is deliberately admin-only (see
  // upsert_my_student_profile's migration comment) - a direct upsert would
  // fail for any student who doesn't already have a row, so this always goes
  // through the RPC, which is hardcoded to auth.uid() on the database side.
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.rpc("upsert_my_student_profile", {
    p_education: patch.education ?? undefined,
    p_college: patch.college ?? undefined,
    p_graduation_year: patch.graduation_year ?? undefined,
    p_skills: patch.skills,
  });
  assertServiceResponse(error);
}

// ─── Experience ───────────────────────────────────────────────────────────────

export async function listResumeExperience(studentId: string): Promise<ResumeExperience[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("resume_experience")
    .select("*")
    .eq("student_id", studentId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  assertServiceResponse(error);
  return data ?? [];
}

export async function createResumeExperience(input: Inserts<"resume_experience">): Promise<ResumeExperience> {
  const supabase = getSupabaseClientOrThrow();
  const finalInput = input.sort_order === undefined ? { ...input, sort_order: await nextSortOrder("resume_experience", input.student_id) } : input;
  const { data, error } = await supabase.from("resume_experience").insert(finalInput).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function updateResumeExperience(id: string, input: Updates<"resume_experience">): Promise<ResumeExperience> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("resume_experience").update(input).eq("id", id).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function deleteResumeExperience(id: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("resume_experience").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  assertServiceResponse(error);
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function listResumeProjects(studentId: string): Promise<ResumeProject[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("resume_projects")
    .select("*")
    .eq("student_id", studentId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  assertServiceResponse(error);
  return data ?? [];
}

export async function createResumeProject(input: Inserts<"resume_projects">): Promise<ResumeProject> {
  const supabase = getSupabaseClientOrThrow();
  const finalInput = input.sort_order === undefined ? { ...input, sort_order: await nextSortOrder("resume_projects", input.student_id) } : input;
  const { data, error } = await supabase.from("resume_projects").insert(finalInput).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function updateResumeProject(id: string, input: Updates<"resume_projects">): Promise<ResumeProject> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("resume_projects").update(input).eq("id", id).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function deleteResumeProject(id: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("resume_projects").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  assertServiceResponse(error);
}

// ─── Certifications ───────────────────────────────────────────────────────────

export async function listResumeCertifications(studentId: string): Promise<ResumeCertification[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("resume_certifications")
    .select("*")
    .eq("student_id", studentId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  assertServiceResponse(error);
  return data ?? [];
}

export async function createResumeCertification(input: Inserts<"resume_certifications">): Promise<ResumeCertification> {
  const supabase = getSupabaseClientOrThrow();
  const finalInput = input.sort_order === undefined ? { ...input, sort_order: await nextSortOrder("resume_certifications", input.student_id) } : input;
  const { data, error } = await supabase.from("resume_certifications").insert(finalInput).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function updateResumeCertification(id: string, input: Updates<"resume_certifications">): Promise<ResumeCertification> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("resume_certifications").update(input).eq("id", id).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function deleteResumeCertification(id: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("resume_certifications").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  assertServiceResponse(error);
}

// ─── Achievements ─────────────────────────────────────────────────────────────

export async function listResumeAchievements(studentId: string): Promise<ResumeAchievement[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("resume_achievements")
    .select("*")
    .eq("student_id", studentId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  assertServiceResponse(error);
  return data ?? [];
}

export async function createResumeAchievement(input: Inserts<"resume_achievements">): Promise<ResumeAchievement> {
  const supabase = getSupabaseClientOrThrow();
  const finalInput = input.sort_order === undefined ? { ...input, sort_order: await nextSortOrder("resume_achievements", input.student_id) } : input;
  const { data, error } = await supabase.from("resume_achievements").insert(finalInput).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function updateResumeAchievement(id: string, input: Updates<"resume_achievements">): Promise<ResumeAchievement> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("resume_achievements").update(input).eq("id", id).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function deleteResumeAchievement(id: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("resume_achievements").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  assertServiceResponse(error);
}
