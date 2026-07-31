// Real mentor session booking - replaces the mock in the old
// mentor-profile/services/mentor.service.ts (console.log + setTimeout, nothing
// persisted). Slot discovery goes through the get_mentor_available_slots RPC;
// booking creation goes through the book-mentor-session Edge Function (meetings
// has no student-facing INSERT policy by design, mirroring the enrollments/
// enroll-free precedent) - cancellation and listing are direct RLS-scoped queries.
import type { Tables } from "@/types/database";
import { assertServiceResponse, getSupabaseClientOrThrow } from "./_shared";

export type MeetingRow = Tables<"meetings">;
export type AvailableSlot = { slotStart: string; slotEnd: string };

export async function getAvailableSlots(mentorId: string, startDate: string, endDate: string): Promise<AvailableSlot[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.rpc("get_mentor_available_slots", {
    p_mentor_id: mentorId,
    p_start_date: startDate,
    p_end_date: endDate,
  });
  assertServiceResponse(error);
  return (data ?? []).map((row) => ({ slotStart: row.slot_start, slotEnd: row.slot_end }));
}

export async function bookSession(mentorId: string, startTime: string, endTime: string): Promise<MeetingRow> {
  const supabase = getSupabaseClientOrThrow();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- supabase-js's FunctionsError union resolves loosely here
  const { data, error } = await supabase.functions.invoke<{
    success: boolean;
    message: string;
    data: MeetingRow;
    errors: string[];
  }>("book-mentor-session", {
    body: { mentorId, startTime, endTime },
  });

  if (error) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- see above
    throw new Error(error.message);
  }
  if (!data?.success) {
    throw new Error(data?.errors?.[0] || data?.message || "Failed to book session");
  }
  return data.data;
}

export async function cancelBooking(meetingId: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("meetings").update({ status: "cancelled" }).eq("id", meetingId);
  assertServiceResponse(error);
}

export async function listMyUpcomingBookings(studentId: string): Promise<MeetingRow[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("attendee_id", studentId)
    .neq("status", "cancelled")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });
  assertServiceResponse(error);
  return data ?? [];
}

export async function listMentorUpcomingSessions(mentorId: string): Promise<MeetingRow[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("host_id", mentorId)
    .neq("status", "cancelled")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });
  assertServiceResponse(error);
  return data ?? [];
}

// ─── Admin CRM: full meeting history + admin-scheduled meetings ────────────
// Distinct from listMentorUpcomingSessions above (upcoming-only, host-only) —
// this covers the admin's "Meetings" CRM tab: full history (past + future),
// and mentor as either host OR attendee (e.g. an internal/interview meeting
// where the mentor is being interviewed rather than hosting).

export type AdminMeetingType = "mentor" | "student" | "internal" | "interview";

export async function listMentorMeetings(mentorId: string): Promise<MeetingRow[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .or(`host_id.eq.${mentorId},attendee_id.eq.${mentorId}`)
    .order("starts_at", { ascending: false });
  assertServiceResponse(error);
  return data ?? [];
}

export interface CreateAdminMeetingInput {
  title: string;
  description?: string;
  hostId: string;
  attendeeId?: string;
  startsAt: string;
  endsAt: string;
  meetingType: AdminMeetingType;
  meetUrl?: string;
  location?: string;
}

/** Admin schedules a meeting directly (mentor/student/internal/interview) — bypasses the student-facing enroll-free-style restriction since "Admins manage all meetings" already grants full RLS access. */
export async function createAdminMeeting(input: CreateAdminMeetingInput): Promise<MeetingRow> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("meetings")
    .insert({
      title: input.title,
      description: input.description ?? null,
      host_id: input.hostId,
      attendee_id: input.attendeeId ?? null,
      entity_type: input.meetingType,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      meet_url: input.meetUrl ?? null,
      location: input.location ?? null,
      status: "scheduled",
    })
    .select("*")
    .single();
  assertServiceResponse(error);
  if (!data) throw new Error("Meeting creation failed.");
  await supabase.rpc("log_audit_event", {
    p_action: "meeting_scheduled",
    p_entity_type: "mentor_profile",
    p_entity_id: input.hostId,
    p_new_values: { title: input.title, starts_at: input.startsAt, meeting_type: input.meetingType },
  });
  return data;
}

/** Marks a meeting completed and records attendance/outcome in its notes field (no separate outcome column exists on `meetings`). */
export async function completeMeetingWithOutcome(meetingId: string, outcomeNotes: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { data: meeting } = await supabase.from("meetings").select("host_id").eq("id", meetingId).maybeSingle();
  const { error } = await supabase
    .from("meetings")
    .update({ status: "completed", notes: outcomeNotes })
    .eq("id", meetingId);
  if (!error && meeting?.host_id) {
    await supabase.rpc("log_audit_event", {
      p_action: "meeting_completed",
      p_entity_type: "mentor_profile",
      p_entity_id: meeting.host_id,
      p_new_values: { outcome: outcomeNotes },
    });
  }
  assertServiceResponse(error);
}
