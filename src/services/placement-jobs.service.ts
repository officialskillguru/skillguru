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
  status?: "draft" | "open" | "closed" | "cancelled";
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
