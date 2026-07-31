// Real mentor-reply-to-reviews capability (Phase 1 mentor-module gap). Reads
// use a plain scoped query (mirrors the pattern already used for mentor rating
// aggregation in mentor-portal.service.ts/AdminMentorsPage.tsx); the reply
// write goes through the reply_to_testimonial() RPC, which is the only path
// that can touch mentor_reply/mentor_replied_at (verifies course ownership
// server-side, never lets a mentor touch the student's own rating/content).
import { assertServiceResponse, getSupabaseClientOrThrow } from "./_shared";

export type MentorTestimonial = {
  id: string;
  content: string;
  rating: number | null;
  createdAt: string;
  isApproved: boolean;
  courseId: string;
  courseTitle: string;
  studentName: string;
  mentorReply: string | null;
  mentorRepliedAt: string | null;
};

export async function listMentorTestimonials(mentorId: string): Promise<MentorTestimonial[]> {
  const supabase = getSupabaseClientOrThrow();

  const { data: courses, error: coursesError } = await supabase
    .from("courses")
    .select("id, title")
    .eq("mentor_id", mentorId);
  assertServiceResponse(coursesError);

  const courseMap = new Map((courses ?? []).map((c) => [c.id, c.title]));
  const courseIds = Array.from(courseMap.keys());
  if (courseIds.length === 0) return [];

  const { data: testimonials, error } = await supabase
    .from("testimonials")
    .select("id, content, rating, created_at, is_approved, course_id, student_id, mentor_reply, mentor_replied_at")
    .in("course_id", courseIds)
    .order("created_at", { ascending: false });
  assertServiceResponse(error);

  const rows = testimonials ?? [];
  const studentIds = Array.from(new Set(rows.map((t) => t.student_id).filter((id): id is string => !!id)));
  const { data: students } = studentIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", studentIds)
    : { data: [] as { id: string; full_name: string }[] };
  const studentMap = new Map((students ?? []).map((s) => [s.id, s.full_name]));

  return rows.map((t) => ({
    id: t.id,
    content: t.content,
    rating: t.rating,
    createdAt: t.created_at,
    isApproved: t.is_approved ?? false,
    courseId: t.course_id ?? "",
    courseTitle: (t.course_id && courseMap.get(t.course_id)) || "Unknown course",
    studentName: (t.student_id && studentMap.get(t.student_id)) || "Anonymous student",
    mentorReply: t.mentor_reply,
    mentorRepliedAt: t.mentor_replied_at,
  }));
}

export async function replyToTestimonial(testimonialId: string, reply: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.rpc("reply_to_testimonial", {
    p_testimonial_id: testimonialId,
    p_reply: reply,
  });
  assertServiceResponse(error);
}
