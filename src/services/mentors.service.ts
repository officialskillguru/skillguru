// Remove this directive after running `supabase gen types` to sync database schema.
import type { AccountStatus, Inserts, Tables, Updates } from "@/types/database";

import {
  assertServiceResponse,
  getSupabaseClientOrThrow,
  normalizeSearchTerm,
  paginationRange,
  type ListParams,
  type PaginatedResult,
} from "./_shared";

export type Mentor = Tables<"mentors">;
export type MentorEducation = Tables<"mentor_education">;
export type MentorCertification = Tables<"mentor_certifications">;
export type MentorExperience = Tables<"mentor_experience">;
export type MentorReview = Tables<"mentor_reviews">;

export type MentorProfile = Mentor & {
  education: MentorEducation[];
  certifications: MentorCertification[];
  experience: MentorExperience[];
  reviews: MentorReview[];
};

export type MentorListParams = ListParams & {
  status?: AccountStatus | "all";
  featured?: boolean;
};

export async function listMentors(params: MentorListParams = {}): Promise<PaginatedResult<Mentor>> {
  const supabase = getSupabaseClientOrThrow();
  const { page, pageSize, from, to } = paginationRange(params);
  const search = normalizeSearchTerm(params.search);

  let query = supabase.from("mentors").select("*", { count: "exact" });

  if (search) {
    query = query.or(`name.ilike.${search},designation.ilike.${search},email.ilike.${search}`);
  }

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (typeof params.featured === "boolean") {
    query = query.eq("featured", params.featured);
  }

  const { data, error, count } = await query
    .order(params.sortBy ?? "updated_at", { ascending: params.sortDirection === "asc" })
    .range(from, to);
  assertServiceResponse(error);

  return { data: data ?? [], count: count ?? 0, page, pageSize };
}

export async function getMentorProfile(id: string): Promise<MentorProfile> {
  const supabase = getSupabaseClientOrThrow();
  const [mentor, education, certifications, experience, reviews] = await Promise.all([
    supabase.from("mentors").select("*").eq("id", id).single(),
    supabase.from("mentor_education").select("*").eq("mentor_id", id).order("sort_order", { ascending: true }),
    supabase.from("mentor_certifications").select("*").eq("mentor_id", id).order("sort_order", { ascending: true }),
    supabase.from("mentor_experience").select("*").eq("mentor_id", id).order("sort_order", { ascending: true }),
    supabase.from("mentor_reviews").select("*").eq("mentor_id", id).order("created_at", { ascending: false }),
  ]);

  assertServiceResponse(mentor.error);
  assertServiceResponse(education.error);
  assertServiceResponse(certifications.error);
  assertServiceResponse(experience.error);
  assertServiceResponse(reviews.error);

  if (!mentor.data) {
    throw new Error("Mentor profile not found.");
  }

  return {
    ...mentor.data,
    education: education.data ?? [],
    certifications: certifications.data ?? [],
    experience: experience.data ?? [],
    reviews: reviews.data ?? [],
  };
}

export async function createMentor(input: Inserts<"mentors">) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("mentors").insert(input).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function updateMentor(id: string, input: Updates<"mentors">) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("mentors").update(input).eq("id", id).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function deleteMentor(id: string) {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("mentors").delete().eq("id", id);
  assertServiceResponse(error);
}

export async function setMentorStatus(id: string, status: AccountStatus) {
  return updateMentor(id, { status });
}
