// Real CRUD for a mentor's recurring weekly availability template (the
// `availability` table - previously migrated but unused by any service in the
// codebase). Owner-scoped: RLS already allows `user_id = auth.uid()` direct
// writes, so no Edge Function is needed here (unlike booking itself, which
// needs server-side conflict validation - see mentor-booking.service.ts).
import type { Inserts, Tables, Updates } from "@/types/database";
import { assertServiceResponse, getSupabaseClientOrThrow } from "./_shared";

export type AvailabilityRow = Tables<"availability">;
export type AvailabilityInput = Inserts<"availability">;

export async function listMentorAvailability(mentorId: string): Promise<AvailabilityRow[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("availability")
    .select("*")
    .eq("user_id", mentorId)
    .is("deleted_at", null)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });
  assertServiceResponse(error);
  return data ?? [];
}

export async function createAvailabilitySlot(input: AvailabilityInput): Promise<AvailabilityRow> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("availability").insert(input).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function updateAvailabilitySlot(id: string, input: Updates<"availability">): Promise<AvailabilityRow> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("availability").update(input).eq("id", id).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function deleteAvailabilitySlot(id: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("availability").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  assertServiceResponse(error);
}
