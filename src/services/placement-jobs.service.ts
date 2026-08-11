// Job posting CRUD (admin) + browse/search/filter (student). Mirrors
// curriculum.service.ts / mentor-profile-content.service.ts conventions.
import type { Json, Tables, Updates } from "@/types/database";
import { assertServiceResponse, getSupabaseClientOrThrow } from "./_shared";

export type JobPosting = Tables<"job_postings">;
export type JobPostingWithPartner = JobPosting & { hiring_partners: Pick<Tables<"hiring_partners">, "id" | "name" | "logo_url" | "industry"> | null };

export type JobPostingInput = {
  hiringPartnerId: string;
  title: string;
  description: string;
  employmentType?: "full_time" | "part_time" | "internship" | "contract";
  location?: string | null;
  isRemote?: boolean;
  minPackage?: number | null;
  maxPackage?: number | null;
  currency?: string;
  eligibilityCriteria?: Json;
  skillsRequired?: string[];
  openingsCount?: number;
  applicationDeadline?: string | null;
  status?: "draft" | "under_review" | "open" | "closed" | "cancelled";
};

export type JobBrowseFilters = {
  search?: string;
  employmentType?: string;
  isRemote?: boolean;
  minPackage?: number;
};

// ─── Student-facing browse (only real open postings, per RLS) ──────────────

export async function browseOpenJobs(filters: JobBrowseFilters = {}): Promise<JobPostingWithPartner[]> {
  const supabase = getSupabaseClientOrThrow();
  let query = supabase
    .from("job_postings")
    .select("*, hiring_partners(id, name, logo_url, industry)")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (filters.search) query = query.ilike("title", `%${filters.search}%`);
  if (filters.employmentType) query = query.eq("employment_type", filters.employmentType);
  if (filters.isRemote !== undefined) query = query.eq("is_remote", filters.isRemote);
  if (filters.minPackage !== undefined) query = query.gte("max_package", filters.minPackage);

  const { data, error } = await query;
  assertServiceResponse(error);
  return data ?? [];
}

export async function getJobPosting(id: string): Promise<JobPostingWithPartner | null> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("job_postings")
    .select("*, hiring_partners(id, name, logo_url, industry)")
    .eq("id", id)
    .maybeSingle();
  assertServiceResponse(error);
  return data;
}

// ─── Admin management ────────────────────────────────────────────────────────

export async function listAllJobPostings(): Promise<JobPostingWithPartner[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("job_postings")
    .select("*, hiring_partners(id, name, logo_url, industry)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  assertServiceResponse(error);
  return data ?? [];
}

export async function createJobPosting(input: JobPostingInput): Promise<JobPosting> {
  const supabase = getSupabaseClientOrThrow();
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("job_postings")
    .insert({
      hiring_partner_id: input.hiringPartnerId,
      title: input.title,
      description: input.description,
      employment_type: input.employmentType ?? "full_time",
      location: input.location ?? null,
      is_remote: input.isRemote ?? false,
      min_package: input.minPackage ?? null,
      max_package: input.maxPackage ?? null,
      currency: input.currency ?? "INR",
      eligibility_criteria: input.eligibilityCriteria ?? {},
      skills_required: input.skillsRequired ?? [],
      openings_count: input.openingsCount ?? 1,
      application_deadline: input.applicationDeadline ?? null,
      status: input.status ?? "draft",
      created_by: user.user?.id ?? null,
      updated_by: user.user?.id ?? null,
    })
    .select("*")
    .single();
  assertServiceResponse(error);
  return data;
}

export async function updateJobPosting(id: string, input: Partial<JobPostingInput>): Promise<JobPosting> {
  const supabase = getSupabaseClientOrThrow();
  const { data: user } = await supabase.auth.getUser();
  const patch: Updates<"job_postings"> = { updated_by: user.user?.id ?? null };
  if (input.hiringPartnerId !== undefined) patch.hiring_partner_id = input.hiringPartnerId;
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.employmentType !== undefined) patch.employment_type = input.employmentType;
  if (input.location !== undefined) patch.location = input.location;
  if (input.isRemote !== undefined) patch.is_remote = input.isRemote;
  if (input.minPackage !== undefined) patch.min_package = input.minPackage;
  if (input.maxPackage !== undefined) patch.max_package = input.maxPackage;
  if (input.currency !== undefined) patch.currency = input.currency;
  if (input.eligibilityCriteria !== undefined) patch.eligibility_criteria = input.eligibilityCriteria;
  if (input.skillsRequired !== undefined) patch.skills_required = input.skillsRequired;
  if (input.openingsCount !== undefined) patch.openings_count = input.openingsCount;
  if (input.applicationDeadline !== undefined) patch.application_deadline = input.applicationDeadline;
  if (input.status !== undefined) patch.status = input.status;

  const { data, error } = await supabase.from("job_postings").update(patch).eq("id", id).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function softDeleteJobPosting(id: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("job_postings").update({ deleted_at: new Date().toISOString(), status: "cancelled" }).eq("id", id);
  assertServiceResponse(error);
}

// ─── Mentor management (Phase J) ─────────────────────────────────────────────
// Additive on top of the admin-only functions above - job_postings_insert/
// update RLS (20260812000001_mentor_job_postings.sql) now also allows a
// mentor holding jobs.manage_own to write their OWN postings (created_by =
// auth.uid()), and enforce_job_posting_transition is the actual security
// boundary for which status changes that write may make - these functions
// don't re-implement that boundary, they just send honest values through it.

/** The calling mentor's own postings, any status - listAllJobPostings() is admin-scoped (sees every mentor's postings); this is deliberately narrower. */
export async function listMyJobPostings(mentorId: string): Promise<JobPostingWithPartner[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("job_postings")
    .select("*, hiring_partners(id, name, logo_url, industry)")
    .eq("created_by", mentorId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  assertServiceResponse(error);
  return data ?? [];
}

/** Mentor-facing create: always inserts as 'draft' - enforce_job_posting_transition rejects anything else regardless of what this sends, so this is honest client code, not the guarantee itself. */
export async function createMentorJobPosting(mentorId: string, input: JobPostingInput): Promise<JobPosting> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("job_postings")
    .insert({
      hiring_partner_id: input.hiringPartnerId,
      title: input.title,
      description: input.description,
      employment_type: input.employmentType ?? "full_time",
      location: input.location ?? null,
      is_remote: input.isRemote ?? false,
      min_package: input.minPackage ?? null,
      max_package: input.maxPackage ?? null,
      currency: input.currency ?? "INR",
      eligibility_criteria: input.eligibilityCriteria ?? {},
      skills_required: input.skillsRequired ?? [],
      openings_count: input.openingsCount ?? 1,
      application_deadline: input.applicationDeadline ?? null,
      status: "draft",
      created_by: mentorId,
      updated_by: mentorId,
    })
    .select("*")
    .single();
  assertServiceResponse(error);
  return data;
}

/** Mentor-facing edit of their own posting's fields. Status transitions go through the dedicated functions below, not this. */
export async function updateMentorJobPosting(id: string, input: Partial<Omit<JobPostingInput, "status">>): Promise<JobPosting> {
  return updateJobPosting(id, input);
}

export async function submitJobForReview(id: string): Promise<JobPosting> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("job_postings").update({ status: "under_review" }).eq("id", id).select("*").single();
  assertServiceResponse(error);

  try {
    const { error: notifyError } = await supabase.rpc("notify_admins_job_submitted", { p_job_posting_id: id });
    if (notifyError) console.error("Failed to notify admins of job submission", notifyError);
  } catch (notifyError) {
    console.error("Failed to notify admins of job submission", notifyError);
  }

  return data;
}

export async function withdrawJobSubmission(id: string): Promise<JobPosting> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("job_postings").update({ status: "draft" }).eq("id", id).select("*").single();
  assertServiceResponse(error);
  return data;
}

/** Toggles a mentor's own already-approved posting between open (accepting applications) and closed (paused) - never touches draft/under_review. */
export async function setMentorJobOpenState(id: string, isOpen: boolean): Promise<JobPosting> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("job_postings")
    .update({ status: isOpen ? "open" : "closed" })
    .eq("id", id)
    .select("*")
    .single();
  assertServiceResponse(error);
  return data;
}

export async function archiveMentorJobPosting(id: string): Promise<JobPosting> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("job_postings").update({ status: "cancelled" }).eq("id", id).select("*").single();
  assertServiceResponse(error);
  return data;
}

/**
 * Clones a posting's own fields into a brand-new draft, force-owned by the
 * calling mentor - mirrors duplicateMentorCourse()'s exact scope and
 * ownership-forcing pattern (Phase F). Never copies id/status/timestamps/
 * audit fields from the source.
 */
export async function duplicateMentorJobPosting(jobPostingId: string, mentorId: string): Promise<JobPosting> {
  const supabase = getSupabaseClientOrThrow();
  const { data: source, error } = await supabase.from("job_postings").select("*").eq("id", jobPostingId).single();
  assertServiceResponse(error);

  return createMentorJobPosting(mentorId, {
    hiringPartnerId: source.hiring_partner_id,
    title: `${source.title} (Copy)`,
    description: source.description,
    employmentType: source.employment_type as JobPostingInput["employmentType"],
    location: source.location,
    isRemote: source.is_remote,
    minPackage: source.min_package,
    maxPackage: source.max_package,
    currency: source.currency,
    eligibilityCriteria: source.eligibility_criteria,
    skillsRequired: source.skills_required,
    openingsCount: source.openings_count,
    applicationDeadline: source.application_deadline,
  });
}
