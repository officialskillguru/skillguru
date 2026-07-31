
import type { Inserts, Tables, Updates } from "@/types/database";

import {
  assertServiceResponse,
  getSupabaseClientOrThrow,
  normalizeSearchTerm,
  paginationRange,
  type ListParams,
  type PaginatedResult,
} from "./_shared";

export type Student = Tables<"profiles">;

export type StudentListParams = ListParams & {
  courseId?: string;
  mentorId?: string;
};

export async function listStudents(params: StudentListParams = {}): Promise<PaginatedResult<Student>> {
  const supabase = getSupabaseClientOrThrow();
  const { page, pageSize, from, to } = paginationRange(params);
  const search = normalizeSearchTerm(params.search);

  let query = supabase.from("profiles").select("*", { count: "exact" });

  // Scope to the student role by default so this never silently includes admins/mentors.
  const { data: studentRole } = await supabase.from("roles").select("id").eq("code", "student").maybeSingle();
  if (studentRole) {
    const { data: studentUserRoles } = await supabase.from("user_roles").select("user_id").eq("role_id", studentRole.id);
    const studentIds = (studentUserRoles ?? []).map((ur) => ur.user_id);
    if (studentIds.length === 0) return { data: [], count: 0, page, pageSize, totalPages: 0 };
    query = query.in("id", studentIds);
  }

  if (search) {
    // normalizeSearchTerm() already wraps the term in %...% - don't wrap it again here.
    query = query.or(`full_name.ilike.${search},email.ilike.${search},phone.ilike.${search},city.ilike.${search}`);
  }

  if (params.courseId) {
    // Sequential query: Get student IDs from enrollments
    const { data: enrollments } = await supabase.from("enrollments").select("*").eq("course_id", params.courseId);
    const enrollmentsArr = (enrollments as Tables<"enrollments">[]) || [];
    const studentIds = enrollmentsArr.map(e => e.student_id).filter((id): id is string => Boolean(id));
    if (studentIds.length > 0) {
      query = query.in("id", studentIds);
    } else {
      return { data: [], count: 0, page, pageSize, totalPages: 0 };
    }
  }

  // Note: mentorId is not directly in profiles. Mentors own courses via created_by or mentor_id in the courses table.
  if (params.mentorId) {
    const { data: mentorCourses } = await supabase.from("courses").select("id").eq("mentor_id", params.mentorId);
    const mentorCoursesArr = mentorCourses || [];
    const courseIds = mentorCoursesArr.map(mc => mc.id).filter((id): id is string => Boolean(id));
    if (courseIds.length > 0) {
      const { data: enrollments } = await supabase.from("enrollments").select("*").in("course_id", courseIds);
      const enrollmentsArr = (enrollments as Tables<"enrollments">[]) || [];
      const studentIds = enrollmentsArr.map(e => e.student_id).filter((id): id is string => Boolean(id));
      if (studentIds.length > 0) {
        query = query.in("id", studentIds);
      } else {
        return { data: [], count: 0, page, pageSize, totalPages: 0 };
      }
    } else {
      return { data: [], count: 0, page, pageSize, totalPages: 0 };
    }
  }

  const { data, error, count } = await query
    .order(params.sortBy ?? "created_at", { ascending: params.sortDirection === "asc" })
    .range(from, to);
  assertServiceResponse(error);

  return { data: data ?? [], count: count ?? 0, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) };
}

export async function getStudent(id: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
  assertServiceResponse(error);
  return data;
}

export async function createStudent(input: Inserts<"profiles">) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("profiles").insert(input).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function updateStudent(id: string, input: Updates<"profiles">) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("profiles").update(input).eq("id", id).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function deleteStudent(id: string) {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  assertServiceResponse(error);
}

// ─── Account Security (no-email-dependency admin actions) ───────────────────
// Same generic edge function mentors' equivalent actions use — see
// admin-account-action, which targets any user with a profiles row.

interface StudentAccountActionResponse {
  success: boolean;
  message?: string;
  data?: { userId: string };
}

async function invokeStudentAccountAction(body: Record<string, unknown>): Promise<{ userId: string }> {
  const supabase = getSupabaseClientOrThrow();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- supabase-js's FunctionsError union resolves loosely here
  const { data, error } = await supabase.functions.invoke<StudentAccountActionResponse>("admin-account-action", { body });
  if (error) throw error;
  if (!data?.success || !data.data) {
    throw new Error(data?.message || "Student account action failed");
  }
  return data.data;
}

/** Sets a student's password directly — no approval, no reset email. Never returned/logged. */
export async function setStudentPassword(studentId: string, password: string) {
  return invokeStudentAccountAction({ action: "set_password", userId: studentId, password });
}

/** Forces the student to change their password on next login. */
export async function forceStudentPasswordChange(studentId: string) {
  return invokeStudentAccountAction({ action: "force_password_change", userId: studentId });
}

/** Invalidates every active session for this student immediately. */
export async function forceStudentLogout(studentId: string) {
  return invokeStudentAccountAction({ action: "force_logout", userId: studentId });
}

/** Changes login email directly (service-role, auto-confirmed) — no confirmation email to the old or new address. */
export async function changeStudentEmail(studentId: string, newEmail: string) {
  return invokeStudentAccountAction({ action: "change_email", userId: studentId, newEmail });
}

export function toStudentsCsv(students: Student[]) {
  const headers = ["Name", "Email", "Phone", "City", "State", "Enrollment Date"];
  const rows = students.map((student) => [
    student.full_name ?? "",
    student.email ?? "",
    student.phone ?? "",
    student.city ?? "",
    student.state ?? "",
    student.created_at ? new Date(student.created_at).toLocaleDateString() : "",
  ]);
  const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

  return [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\n");
}

