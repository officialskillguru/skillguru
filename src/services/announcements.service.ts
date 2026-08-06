import { getSupabaseClientOrThrow, assertServiceResponse } from "./_shared";
import type { Tables } from "@/types/database";

// ============================================================================
// Announcements (Phase C - schema/RLS + service layer only, no UI yet)
// ============================================================================
// campaigns/campaign_recipients already exist (CRM schema) and were
// admin-only. Phase C adds a mentor-scoped path: a mentor may create an
// 'announcement'-type campaign addressed only to an audience they're ever
// allowed to reach (my_students / course_cohort / selected - never
// all_students/all_mentors, enforced by RLS on campaigns.audience_type).
// campaign_recipients has NO direct mentor INSERT policy at all - the only
// way it gets populated is resolve_campaign_audience(), a SECURITY DEFINER
// RPC that computes the real recipient set server-side from enrollments,
// never from a client-supplied list (except 'selected', which the RPC
// itself clamps to the mentor's own real students).
// ============================================================================

export type Campaign = Tables<"campaigns">;
export type CampaignRecipient = Tables<"campaign_recipients">;
export type AnnouncementAudienceType = "my_students" | "course_cohort" | "selected";

export type CreateAnnouncementInput = {
  name: string;
  body: string;
  subject?: string | null;
  audienceType: AnnouncementAudienceType;
  courseId?: string | null;
};

/** Mentor-facing: create a draft announcement. Always type='announcement' - RLS rejects any other type/audience for a non-admin sender. */
export async function createAnnouncement(input: CreateAnnouncementInput): Promise<Campaign> {
  const supabase = getSupabaseClientOrThrow();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to create an announcement.");

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      name: input.name,
      type: "announcement",
      body: input.body,
      subject: input.subject ?? null,
      sender_id: user.id,
      audience_type: input.audienceType,
      course_id: input.courseId ?? null,
    })
    .select("*")
    .single();
  assertServiceResponse(error);
  return data;
}

/** The calling mentor's (or admin's) own sent/draft announcements. */
export async function listMyAnnouncements(): Promise<Campaign[]> {
  const supabase = getSupabaseClientOrThrow();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("sender_id", user.id)
    .order("created_at", { ascending: false });
  assertServiceResponse(error);
  return data ?? [];
}

/**
 * Resolves the real recipient set for a campaign server-side and returns the
 * resulting recipient count. This is the ONLY way campaign_recipients gets
 * populated - there is no direct INSERT policy for a mentor on that table.
 * `selectedRecipientIds` is only consulted for audience_type='selected', and
 * even then the RPC clamps it to the mentor's own real enrolled students -
 * this function cannot be used to reach an arbitrary platform user.
 */
export async function resolveAnnouncementAudience(campaignId: string, selectedRecipientIds?: string[]): Promise<number> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.rpc("resolve_campaign_audience", {
    p_campaign_id: campaignId,
    p_selected_recipient_ids: selectedRecipientIds,
  });
  assertServiceResponse(error);
  return data ?? 0;
}

/** Recipient delivery status for a campaign the caller owns (or, for an admin, any campaign). */
export async function listAnnouncementRecipients(campaignId: string): Promise<CampaignRecipient[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("campaign_recipients").select("*").eq("campaign_id", campaignId);
  assertServiceResponse(error);
  return data ?? [];
}
