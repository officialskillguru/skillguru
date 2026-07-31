// Interview round scheduling + feedback. Scheduling reuses the existing
// public.meetings table (see schedule_interview_round RPC) instead of a new
// bookings table - the student sees their scheduled interview the same way
// they already see a booked mentor session (public.meetings' existing
// "Attendees view own booked meetings" RLS policy covers this for free).
import type { Tables } from "@/types/database";
import { assertServiceResponse, getSupabaseClientOrThrow } from "./_shared";

export type InterviewRound = Tables<"interview_rounds">;
export type InterviewRoundWithMeeting = InterviewRound & { meetings: Tables<"meetings"> | null };
export type InterviewFeedback = Tables<"interview_feedback">;

export type ScheduleInterviewInput = {
  applicationId: string;
  roundNumber: number;
  roundType: "technical" | "hr" | "managerial" | "other";
  startsAt: string;
  endsAt: string;
  stageStatus: "interview_round_1" | "interview_round_2" | "hr_round";
  platform?: string;
  meetUrl?: string;
  notes?: string;
};

export async function scheduleInterviewRound(input: ScheduleInterviewInput): Promise<string> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.rpc("schedule_interview_round", {
    p_application_id: input.applicationId,
    p_round_number: input.roundNumber,
    p_round_type: input.roundType,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_stage_status: input.stageStatus,
    p_platform: input.platform ?? "google_meet",
    p_meet_url: input.meetUrl,
    p_notes: input.notes,
  });
  assertServiceResponse(error);
  return data;
}

export type RecordFeedbackInput = {
  interviewRoundId: string;
  decision: "pass" | "fail" | "pending";
  recommendation?: "advance" | "reject" | "hold";
  rating?: number;
  strengths?: string;
  weaknesses?: string;
  notes?: string;
};

export async function recordInterviewFeedback(input: RecordFeedbackInput): Promise<string> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.rpc("record_interview_feedback", {
    p_interview_round_id: input.interviewRoundId,
    p_decision: input.decision,
    p_recommendation: input.recommendation ?? "hold",
    p_rating: input.rating,
    p_strengths: input.strengths,
    p_weaknesses: input.weaknesses,
    p_notes: input.notes,
  });
  assertServiceResponse(error);
  return data;
}

export async function listInterviewRounds(applicationId: string): Promise<InterviewRoundWithMeeting[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("interview_rounds")
    .select("*, meetings(*)")
    .eq("application_id", applicationId)
    .order("round_number", { ascending: true });
  assertServiceResponse(error);
  return data ?? [];
}

export async function listFeedbackForRound(interviewRoundId: string): Promise<InterviewFeedback[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("interview_feedback")
    .select("*")
    .eq("interview_round_id", interviewRoundId)
    .order("created_at", { ascending: true });
  assertServiceResponse(error);
  return data ?? [];
}

/** Student's own upcoming placement interviews - reuses the same meetings row the mentor-booking flow already reads via "Attendees view own booked meetings". */
export async function listMyUpcomingInterviews(studentId: string): Promise<Tables<"meetings">[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("attendee_id", studentId)
    .eq("entity_type", "placement_application")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });
  assertServiceResponse(error);
  return data ?? [];
}
