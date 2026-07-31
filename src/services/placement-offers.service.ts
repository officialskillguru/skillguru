// Offer release + final placement confirmation. Writes go through the
// release_offer / mark_placement_joined RPCs (see placement_module_schema
// migration) - placement_offers has no direct write policy.
import type { Tables } from "@/types/database";
import { assertServiceResponse, getSupabaseClientOrThrow } from "./_shared";

export type PlacementOffer = Tables<"placement_offers">;

export type ReleaseOfferInput = {
  applicationId: string;
  packageAmount: number;
  currency?: string;
  designation?: string;
  joiningDate?: string;
  offerLetterFileId?: string;
};

export async function releaseOffer(input: ReleaseOfferInput): Promise<string> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.rpc("release_offer", {
    p_application_id: input.applicationId,
    p_package_amount: input.packageAmount,
    p_currency: input.currency ?? "INR",
    p_designation: input.designation,
    p_joining_date: input.joiningDate,
    p_offer_letter_file_id: input.offerLetterFileId,
  });
  assertServiceResponse(error);
  return data;
}

export async function markPlacementJoined(applicationId: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.rpc("mark_placement_joined", { p_application_id: applicationId });
  assertServiceResponse(error);
}

export async function getOfferForApplication(applicationId: string): Promise<PlacementOffer | null> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("placement_offers").select("*").eq("application_id", applicationId).maybeSingle();
  assertServiceResponse(error);
  return data;
}

/** Student's full placement history - every offer ever released to them, across all applications. */
export async function listMyOffers(studentId: string): Promise<(PlacementOffer & { placement_applications: Tables<"placement_applications"> | null })[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("placement_offers")
    .select("*, placement_applications!inner(*)")
    .eq("placement_applications.student_id", studentId)
    .order("released_at", { ascending: false });
  assertServiceResponse(error);
  return data ?? [];
}
