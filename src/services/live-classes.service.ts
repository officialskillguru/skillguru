import type { Tables } from "@/types/database";
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
  const today = new Date().toISOString().slice(0, 10);
  if (cls.scheduled_date === today) return "today";
  return cls.scheduled_date > today ? "upcoming" : "past";
}

async function enrichWithCourseAndMentor(rows: Tables<"live_classes">[]): Promise<LiveClass[]> {
  if (rows.length === 0) return [];
  const supabase = getSupabaseClientOrThrow();
  const courseIds = [...new Set(rows.map((r) => r.course_id))];
  const mentorIds = [...new Set(rows.map((r) => r.mentor_id))];

  const [{ data: courses }, { data: mentors }] = await Promise.all([
    supabase.from("courses").select("id, title").in("id", courseIds),
    supabase.from("profiles").select("id, full_name").in("id", mentorIds),
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
  const mentorId = userResp.user?.id;
  if (!mentorId) throw new Error("Not signed in.");

  const { data, error } = await supabase
    .from("live_classes")
    .insert({
      course_id: input.courseId,
      mentor_id: mentorId,
      created_by: mentorId,
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
