import type { Inserts, Tables, Updates } from "@/types/database";

import {
  assertServiceResponse,
  getSupabaseClientOrThrow,
  normalizeSearchTerm,
  paginationRange,
  type ListParams,
  type PaginatedResult,
} from "./_shared";

export type Mentor = Tables<"mentor_profiles"> & {
  name?: string;
  avatar?: string;
  email?: string;
  status?: string;
};
export type MentorProfile = Mentor;

export type MentorListParams = ListParams & {
  status?: string;
  featured?: boolean;
};

export async function listMentors(params: MentorListParams = {}): Promise<PaginatedResult<Mentor>> {
  const supabase = getSupabaseClientOrThrow();
  const { page, pageSize, from, to } = paginationRange(params);
  const search = normalizeSearchTerm(params.search);

  let query = supabase.from("mentor_profiles").select("*", { count: "exact" });

  if (search) {
    // We only have headline, bio, etc on mentor_profiles
    query = query.or(`headline.ilike.%${search}%,bio.ilike.%${search}%`);
  }

  // no status or featured on mentor_profiles

  const { data, error, count } = await query
    .order(params.sortBy ?? "created_at", { ascending: params.sortDirection === "asc" })
    .range(from, to);
  assertServiceResponse(error);

  const mentors = data ?? [];
  const profileIds = mentors.map(m => m.id).filter(Boolean);
  
  const profiles: Record<string, Tables<"profiles">> = {};
  if (profileIds.length > 0) {
    const { data: profilesData } = await supabase.from("profiles").select("*").in("id", profileIds);
    if (profilesData) {
      profilesData.forEach(p => {
        profiles[p.id] = p;
      });
    }
  }

  const mappedMentors = mentors.map(m => {
    const p = m.id ? profiles[m.id] : null;
    return {
      ...m,
      name: p?.full_name || "Unknown Mentor",
      avatar: p?.avatar_file_id || "",
      email: p?.email || "",
      status: "active",
    };
  });

  return { data: mappedMentors, count: count ?? 0, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) };
}

export async function getMentorProfile(id: string): Promise<MentorProfile> {
  const supabase = getSupabaseClientOrThrow();
  const mentor = await supabase.from("mentor_profiles").select("*").eq("id", id).single();

  assertServiceResponse(mentor.error);

  if (!mentor.data) {
    throw new Error("Mentor profile not found.");
  }

  return mentor.data;
}

export async function createMentor(input: Partial<Inserts<"mentor_profiles">>) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("mentor_profiles").insert(input as Inserts<"mentor_profiles">).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function updateMentor(id: string, input: Updates<"mentor_profiles">) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("mentor_profiles").update(input).eq("id", id).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function deleteMentor(id: string) {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("mentor_profiles").delete().eq("id", id);
  assertServiceResponse(error);
}

export async function setMentorStatus(id: string, _status: string) {
  return updateMentor(id, { bio: "status change attempted" });
}
