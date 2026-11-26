import { getSupabaseClientOrThrow, assertServiceResponse } from "./_shared";
import {
  createCourse,
  getCourseCompleteness,
  updateCourseStatus,
  CourseNotCompleteError,
} from "./courses.service";

/**
 * Counsellor course operations. The counsellor role holds courses.create /
 * courses.update_all / courses.assign_mentor / students.read; RLS and the
 * course status trigger are the real boundary (migration 20261125000001),
 * these helpers only shape the calls the counsellor portal makes.
 */

export interface CounsellorCourseRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  price: number | null;
  updatedAt: string;
  teacherNames: string[];
}

export interface TeacherOption {
  id: string;
  name: string;
  headline: string | null;
}

export async function listCounsellorCourses(): Promise<CounsellorCourseRow[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data: courses, error } = await supabase
    .from("courses")
    .select("id, title, slug, status, price, updated_at")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  assertServiceResponse(error);

  const ids = (courses ?? []).map((c) => c.id);
  const names = new Map<string, string[]>();
  if (ids.length > 0) {
    const { data: links } = await supabase.from("course_mentors").select("course_id, mentor_id").in("course_id", ids).eq("status", "active");
    const mentorIds = [...new Set((links ?? []).map((l) => l.mentor_id))];
    const { data: people } = mentorIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", mentorIds)
      : { data: [] as Array<{ id: string; full_name: string | null }> };
    const nameById = new Map((people ?? []).map((p) => [p.id, p.full_name ?? "Teacher"]));
    for (const l of links ?? []) names.set(l.course_id, [...(names.get(l.course_id) ?? []), nameById.get(l.mentor_id) ?? "Teacher"]);
  }

  return (courses ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    status: c.status,
    price: c.price,
    updatedAt: c.updated_at,
    teacherNames: names.get(c.id) ?? [],
  }));
}

export async function listTeachers(): Promise<TeacherOption[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data: mentors, error } = await supabase
    .from("mentor_profiles")
    .select("id, headline, status, login_disabled")
    .is("deleted_at", null)
    .eq("status", "active");
  assertServiceResponse(error);
  const usable = (mentors ?? []).filter((m) => !m.login_disabled);
  if (usable.length === 0) return [];
  const { data: people } = await supabase.from("profiles").select("id, full_name").in("id", usable.map((m) => m.id));
  const nameById = new Map((people ?? []).map((p) => [p.id, p.full_name ?? "Teacher"]));
  return usable
    .map((m) => ({ id: m.id, name: nameById.get(m.id) ?? "Teacher", headline: m.headline }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listCourseTeachers(courseId: string): Promise<TeacherOption[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data: links, error } = await supabase
    .from("course_mentors")
    .select("mentor_id, is_primary")
    .eq("course_id", courseId)
    .eq("status", "active")
    .order("is_primary", { ascending: false });
  assertServiceResponse(error);
  const ids = (links ?? []).map((l) => l.mentor_id);
  if (ids.length === 0) return [];
  const { data: people } = await supabase.from("profiles").select("id, full_name").in("id", ids);
  const nameById = new Map((people ?? []).map((p) => [p.id, p.full_name ?? "Teacher"]));
  return ids.map((id) => ({ id, name: nameById.get(id) ?? "Teacher", headline: null }));
}

export interface NewCourseDraftInput {
  title: string;
  teacherId: string;
  price: number;
}

/** Creates a draft owned by the chosen teacher (the course_mentors sync trigger assigns them). */
export async function createCourseDraft(input: NewCourseDraftInput) {
  const course = await createCourse({
    title: input.title.trim(),
    mentor_id: input.teacherId,
    price: input.price,
    status: "draft",
    language: "English",
  });
  if (!course) throw new Error("The course could not be created.");
  return course;
}

/** Publishes after the same completeness checks mentors must pass before review. */
export async function publishCourse(courseId: string) {
  const completeness = await getCourseCompleteness(courseId);
  if (!completeness.isComplete) throw new CourseNotCompleteError(completeness);
  return updateCourseStatus(courseId, "published");
}

export async function unpublishCourse(courseId: string) {
  return updateCourseStatus(courseId, "draft");
}

export interface PurchaseOverviewRow {
  studentId: string;
  fullName: string | null;
  email: string | null;
  enrollmentStatus: string | null;
  enrollmentSource: string | null;
  enrolledAt: string | null;
  orderId: string | null;
  orderStatus: string | null;
  amount: number | null;
  paymentMethod: string | null;
  invoiceNumber: string | null;
  orderedAt: string | null;
}

export async function getCoursePurchaseOverview(courseId: string): Promise<PurchaseOverviewRow[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.rpc("get_course_purchase_overview", { p_course_id: courseId });
  assertServiceResponse(error);
  return (data ?? []).map((r) => ({
    studentId: r.student_id,
    fullName: r.full_name,
    email: r.email,
    enrollmentStatus: r.enrollment_status,
    enrollmentSource: r.enrollment_source,
    enrolledAt: r.enrolled_at,
    orderId: r.order_id,
    orderStatus: r.order_status,
    amount: r.amount,
    paymentMethod: r.payment_method,
    invoiceNumber: r.invoice_number,
    orderedAt: r.ordered_at,
  }));
}
