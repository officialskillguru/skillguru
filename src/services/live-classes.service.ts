import type { Tables } from "@/types/database";
import { todayInIst } from "@/lib/date";
import { assertServiceResponse, getSupabaseClientOrThrow } from "./_shared";

/**
 * DEMO-ONLY feature (see the live_classes_demo migration). There is no real video/
 * meeting provider connected — `meetingPlatform`/`meetingLink` exist as the boundary
 * a future real integration (Zoom/Meet/WebRTC) will sit behind. `isDemo` is always
 * true today; the UI must always show a "Demo" badge and never imply a real class.
 */
export type LiveClass = Tables<"live_classes"> & {
  courseTitle?: string;
  mentorName?: string;
};

export type LiveClassBucket = "today" | "upcoming" | "past";

function bucketOf(cls: Pick<LiveClass, "scheduled_date" | "status">): LiveClassBucket {
  if (cls.status === "completed" || cls.status === "cancelled") return "past";
  // Class dates are IST calendar dates; compare against today in IST, not UTC.
  const today = todayInIst();
  if (cls.scheduled_date === today) return "today";
  return cls.scheduled_date > today ? "upcoming" : "past";
}

async function enrichWithCourseAndMentor(rows: Tables<"live_classes">[]): Promise<LiveClass[]> {
  if (rows.length === 0) return [];
  const supabase = getSupabaseClientOrThrow();
  const courseIds = [...new Set(rows.map((r) => r.course_id))];
  const mentorIds = [...new Set(rows.map((r) => r.mentor_id))];

  // Teacher names come from the public mentor RPC: students cannot read
  // teacher rows in `profiles`, and the RPC exposes only public fields.
  const [{ data: courses }, { data: mentors }] = await Promise.all([
    supabase.from("courses").select("id, title").in("id", courseIds),
    supabase.rpc("get_public_mentor_profiles", { p_mentor_ids: mentorIds }),
  ]);
  const courseTitleById = new Map((courses ?? []).map((c) => [c.id, c.title]));
  const mentorNameById = new Map((mentors ?? []).map((m) => [m.id, m.full_name]));

  return rows.map((r) => ({
    ...r,
    courseTitle: courseTitleById.get(r.course_id) ?? "Unknown course",
    mentorName: mentorNameById.get(r.mentor_id) ?? "Unknown teacher",
  }));
}

/** Every live class visible to the current teacher (RLS scopes this to courses they
 *  actually teach via course_mentors), across all buckets — grouping is done client-side. */
export async function listMentorLiveClasses(): Promise<LiveClass[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("live_classes")
    .select("*")
    .order("scheduled_date", { ascending: true })
    .order("start_time", { ascending: true });
  assertServiceResponse(error);
  return enrichWithCourseAndMentor(data ?? []);
}

/** Every live class visible to the current student (RLS scopes this to courses they
 *  have an active enrollment in). */
export async function listStudentLiveClasses(): Promise<LiveClass[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("live_classes")
    .select("*")
    .order("scheduled_date", { ascending: true })
    .order("start_time", { ascending: true });
  assertServiceResponse(error);
  return enrichWithCourseAndMentor(data ?? []);
}

export function groupLiveClasses(classes: LiveClass[]): Record<LiveClassBucket, LiveClass[]> {
  const groups: Record<LiveClassBucket, LiveClass[]> = { today: [], upcoming: [], past: [] };
  for (const cls of classes) groups[bucketOf(cls)].push(cls);
  groups.past.reverse();
  return groups;
}

export async function getLiveClass(id: string): Promise<LiveClass> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("live_classes").select("*").eq("id", id).single();
  assertServiceResponse(error);
  const [enriched] = await enrichWithCourseAndMentor([data]);
  return enriched!;
}

export interface CreateLiveClassInput {
  courseId: string;
  /** Teacher who runs the class. Defaults to the signed-in teacher; a counsellor passes the assigned teacher. */
  mentorId?: string;
  title: string;
  description?: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  meetingPlatform: string;
}

export async function createLiveClass(input: CreateLiveClassInput): Promise<LiveClass> {
  const supabase = getSupabaseClientOrThrow();
  const { data: userResp, error: userError } = await supabase.auth.getUser();
  assertServiceResponse(userError);
  const currentUserId = userResp.user?.id;
  if (!currentUserId) throw new Error("Not signed in.");
  const mentorId = input.mentorId ?? currentUserId;

  const { data, error } = await supabase
    .from("live_classes")
    .insert({
      course_id: input.courseId,
      mentor_id: mentorId,
      created_by: currentUserId,
      title: input.title,
      description: input.description || null,
      scheduled_date: input.scheduledDate,
      start_time: input.startTime,
      end_time: input.endTime,
      meeting_platform: input.meetingPlatform,
      meeting_link: null,
      status: "scheduled",
      is_demo: true,
    })
    .select("*")
    .single();
  assertServiceResponse(error);
  const [enriched] = await enrichWithCourseAndMentor([data]);
  return enriched!;
}

export async function cancelLiveClass(id: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("live_classes").update({ status: "cancelled" }).eq("id", id);
  assertServiceResponse(error);
}

// ── Lifecycle (migration 20261125000001) ───────────────────────────────────
// Status changes go through SECURITY DEFINER RPCs that check the caller is the
// course teacher (or admin); a trigger rejects any other transition.

export type LiveClassAccessReason = "not_enrolled" | "not_live" | "ended" | "cancelled" | "not_found" | "other";

export class LiveClassAccessError extends Error {
  readonly reason: LiveClassAccessReason;
  constructor(message: string, reason: LiveClassAccessReason) {
    super(message);
    this.name = "LiveClassAccessError";
    this.reason = reason;
  }
}

const ACCESS_ERRORS: Array<[prefix: string, reason: LiveClassAccessReason, message: string]> = [
  ["not_enrolled", "not_enrolled", "You are not enrolled in this course."],
  ["class_not_live:completed", "ended", "This class has ended."],
  ["class_not_live:cancelled", "cancelled", "This class was cancelled."],
  ["class_not_live", "not_live", "This class has not started yet."],
  ["class_not_found", "not_found", "This live class could not be found."],
];

function toAccessError(error: { message: string }): LiveClassAccessError {
  const match = ACCESS_ERRORS.find(([prefix]) => error.message.startsWith(prefix));
  return match ? new LiveClassAccessError(match[2], match[1]) : new LiveClassAccessError(error.message, "other");
}

export async function startLiveClass(id: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.rpc("start_live_class", { p_class_id: id });
  if (error) throw toAccessError(error);
}

export async function endLiveClass(id: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.rpc("end_live_class", { p_class_id: id });
  if (error) throw toAccessError(error);
}

export interface JoinResult {
  role: "host" | "participant";
  status: string;
  attendanceRecorded: boolean;
  firstJoin?: boolean;
}

/** Enter a class room. Students need an active enrollment and a live class; attendance is recorded server-side. */
export async function joinLiveClass(id: string): Promise<JoinResult> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.rpc("join_live_class", { p_class_id: id });
  if (error) throw toAccessError(error);
  return data as unknown as JoinResult;
}

export interface RosterEntry {
  studentId: string;
  fullName: string | null;
  email: string | null;
  enrolledAt: string | null;
  attendanceStatus: string | null;
  joinedAt: string | null;
}

export async function getLiveClassRoster(id: string): Promise<RosterEntry[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.rpc("get_live_class_roster", { p_class_id: id });
  if (error) throw toAccessError(error);
  return (data ?? []).map((r) => ({
    studentId: r.student_id,
    fullName: r.full_name,
    email: r.email,
    enrolledAt: r.enrolled_at,
    attendanceStatus: r.attendance_status,
    joinedAt: r.joined_at,
  }));
}

export interface PublicSession {
  id: string;
  title: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: string;
  mentorName: string | null;
}

/** Non-sensitive schedule for a published course (course detail page, checkout). */
export async function getPublicCourseSchedule(courseId: string): Promise<PublicSession[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.rpc("get_public_course_schedule", { p_course_id: courseId });
  assertServiceResponse(error);
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    scheduledDate: r.scheduled_date,
    startTime: r.start_time,
    endTime: r.end_time,
    status: r.status,
    mentorName: r.mentor_name,
  }));
}

/** Every class for one course (counsellor/teacher views; RLS-scoped). */
export async function listCourseLiveClasses(courseId: string): Promise<LiveClass[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("live_classes")
    .select("*")
    .eq("course_id", courseId)
    .order("scheduled_date", { ascending: true })
    .order("start_time", { ascending: true });
  assertServiceResponse(error);
  return enrichWithCourseAndMentor(data ?? []);
}

// ── Shared classroom chat ──────────────────────────────────────────────────

export interface LiveClassMessage {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export async function listLiveClassMessages(classId: string): Promise<LiveClassMessage[]> {
  const supabase = getSupabaseClientOrThrow();
  // RPC joins author display names server-side (participants cannot read each other's profiles).
  const { data, error } = await supabase.rpc("get_live_class_messages", { p_class_id: classId });
  assertServiceResponse(error);
  return (data ?? []).map((r) => ({ id: r.id, authorId: r.author_id, authorName: r.author_name, body: r.body, createdAt: r.created_at }));
}

export async function sendLiveClassMessage(classId: string, body: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { data: userResp } = await supabase.auth.getUser();
  const authorId = userResp.user?.id;
  if (!authorId) throw new Error("Not signed in.");
  const { error } = await supabase.from("live_class_messages").insert({ live_class_id: classId, author_id: authorId, body: body.trim() });
  if (error) throw new Error(error.code === "42501" ? "Chat is available only while the class is live." : error.message);
}
