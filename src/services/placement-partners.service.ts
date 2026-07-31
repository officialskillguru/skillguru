// Hiring partner (company) CRUD - admin-managed. Mirrors curriculum.service.ts /
// mentor-profile-content.service.ts conventions: typed via Tables<>/Inserts<>/
// Updates<>, soft delete via deleted_at. RLS lets any authenticated user read
// non-deleted partners (needed so students see the company on a job listing);
// only admins can write (enforced by hiring_partners_insert/update/delete policies).
import { createSlug } from "@/lib/slug";
import type { Tables, Updates } from "@/types/database";
import { assertServiceResponse, getSupabaseClientOrThrow } from "./_shared";

export type HiringPartner = Tables<"hiring_partners">;

export type HiringPartnerInput = {
  name: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  industry?: string | null;
  description?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  status?: "active" | "inactive";
};

export async function listHiringPartners(includeInactive = true): Promise<HiringPartner[]> {
  const supabase = getSupabaseClientOrThrow();
  let query = supabase.from("hiring_partners").select("*").is("deleted_at", null).order("name", { ascending: true });
  if (!includeInactive) query = query.eq("status", "active");
  const { data, error } = await query;
  assertServiceResponse(error);
  return data ?? [];
}

export async function getHiringPartner(id: string): Promise<HiringPartner | null> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("hiring_partners").select("*").eq("id", id).maybeSingle();
  assertServiceResponse(error);
  return data;
}

export async function createHiringPartner(input: HiringPartnerInput): Promise<HiringPartner> {
  const supabase = getSupabaseClientOrThrow();
  const { data: user } = await supabase.auth.getUser();
  const slugBase = createSlug(input.name);
  const { data, error } = await supabase
    .from("hiring_partners")
    .insert({
      name: input.name,
      slug: `${slugBase}-${Date.now().toString(36)}`,
      logo_url: input.logoUrl ?? null,
      website_url: input.websiteUrl ?? null,
      industry: input.industry ?? null,
      description: input.description ?? null,
      contact_name: input.contactName ?? null,
      contact_email: input.contactEmail ?? null,
      contact_phone: input.contactPhone ?? null,
      status: input.status ?? "active",
      created_by: user.user?.id ?? null,
      updated_by: user.user?.id ?? null,
    })
    .select("*")
    .single();
  assertServiceResponse(error);
  return data;
}

export async function updateHiringPartner(id: string, input: Partial<HiringPartnerInput>): Promise<HiringPartner> {
  const supabase = getSupabaseClientOrThrow();
  const { data: user } = await supabase.auth.getUser();
  const patch: Updates<"hiring_partners"> = { updated_by: user.user?.id ?? null };
  if (input.name !== undefined) patch.name = input.name;
  if (input.logoUrl !== undefined) patch.logo_url = input.logoUrl;
  if (input.websiteUrl !== undefined) patch.website_url = input.websiteUrl;
  if (input.industry !== undefined) patch.industry = input.industry;
  if (input.description !== undefined) patch.description = input.description;
  if (input.contactName !== undefined) patch.contact_name = input.contactName;
  if (input.contactEmail !== undefined) patch.contact_email = input.contactEmail;
  if (input.contactPhone !== undefined) patch.contact_phone = input.contactPhone;
  if (input.status !== undefined) patch.status = input.status;

  const { data, error } = await supabase.from("hiring_partners").update(patch).eq("id", id).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function softDeleteHiringPartner(id: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("hiring_partners").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  assertServiceResponse(error);
}

export async function restoreHiringPartner(id: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("hiring_partners").update({ deleted_at: null }).eq("id", id);
  assertServiceResponse(error);
}
