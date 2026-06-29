// Remove this directive after running `supabase gen types` to sync database schema.
import type { CrmLeadStatus, Inserts, Tables, Updates } from "@/types/database";

import {
  assertServiceResponse,
  getSupabaseClientOrThrow,
  normalizeSearchTerm,
  paginationRange,
  type ListParams,
  type PaginatedResult,
} from "./_shared";

export type Lead = Tables<"leads">;
export type LeadNote = Tables<"lead_notes">;
export type LeadTimelineItem = Tables<"lead_timeline">;

export type LeadListParams = ListParams & {
  status?: CrmLeadStatus | "all";
  assignedTo?: string;
  source?: string;
};

export async function listLeads(params: LeadListParams = {}): Promise<PaginatedResult<Lead>> {
  const supabase = getSupabaseClientOrThrow();
  const { page, pageSize, from, to } = paginationRange(params);
  const search = normalizeSearchTerm(params.search);

  let query = supabase.from("leads").select("*", { count: "exact" });

  if (search) {
    query = query.or(`full_name.ilike.${search},name.ilike.${search},email.ilike.${search},phone.ilike.${search},course_interest.ilike.${search}`);
  }

  if (params.status && params.status !== "all") {
    query = query.eq("crm_status", params.status);
  }

  if (params.assignedTo) {
    query = query.eq("assigned_to", params.assignedTo);
  }

  if (params.source) {
    query = query.eq("source", params.source);
  }

  const { data, error, count } = await query
    .order(params.sortBy ?? "created_at", { ascending: params.sortDirection === "asc" })
    .range(from, to);
  assertServiceResponse(error);

  return { data: data ?? [], count: count ?? 0, page, pageSize };
}

export async function createLead(input: Inserts<"leads">) {
  const supabase = getSupabaseClientOrThrow();
  const payload: Inserts<"leads"> = {
    ...input,
    name: input.name ?? input.full_name,
  };
  const { data, error } = await supabase.from("leads").insert(payload).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function updateLead(id: string, input: Updates<"leads">) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("leads").update(input).eq("id", id).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function assignLead(id: string, adminId: string | null) {
  return updateLead(id, { assigned_to: adminId });
}

export async function changeLeadStatus(id: string, status: CrmLeadStatus, actorId?: string | null) {
  const supabase = getSupabaseClientOrThrow();
  const current = await supabase.from("leads").select("crm_status").eq("id", id).single();
  assertServiceResponse(current.error);

  const { data, error } = await supabase.from("leads").update({ crm_status: status }).eq("id", id).select("*").single();
  assertServiceResponse(error);

  const timelineError = await supabase.from("lead_timeline").insert({
    lead_id: id,
    action: "status_changed",
    from_status: current.data?.crm_status ?? null,
    to_status: status,
    actor_id: actorId ?? null,
  });
  assertServiceResponse(timelineError.error);

  return data;
}

export async function addLeadNote(input: Inserts<"lead_notes">) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("lead_notes").insert(input).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function getLeadTimeline(leadId: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("lead_timeline")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  assertServiceResponse(error);
  return data ?? [];
}
