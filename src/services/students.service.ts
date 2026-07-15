
// Remove this directive after running `supabase gen types` to sync database schema.
import type { AccountStatus, Inserts, Tables, Updates } from "@/types/database";

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
  status?: AccountStatus | "all";
  courseId?: string;
  mentorId?: string;
};

export async function listStudents(params: StudentListParams = {}): Promise<PaginatedResult<Student>> {
  const supabase = getSupabaseClientOrThrow();
  const { page, pageSize, from, to } = paginationRange(params);
  const search = normalizeSearchTerm(params.search);

  let query = supabase.from("profiles").select("*", { count: "exact" }).eq("role", "student");

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,city.ilike.%${search}%`);
  }

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
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
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).eq("role", "student").single();
  assertServiceResponse(error);
  return data;
}

export async function createStudent(input: Inserts<"profiles">) {
  const supabase = getSupabaseClientOrThrow();
  const insertData = { ...input, role: "student" };
  const { data, error } = await supabase.from("profiles").insert(insertData as Inserts<"profiles">).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function updateStudent(id: string, input: Updates<"profiles">) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("profiles").update(input).eq("id", id).eq("role", "student").select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function deleteStudent(id: string) {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("profiles").delete().eq("id", id).eq("role", "student");
  assertServiceResponse(error);
}

export async function setStudentStatus(id: string, status: string) {
  return updateStudent(id, { status });
}

export function toStudentsCsv(students: Student[]) {
  const headers = ["Name", "Email", "Phone", "City", "State", "Status", "Enrollment Date"];
  const rows = students.map((student) => [
    student.full_name ?? "",
    student.email ?? "",
    student.phone ?? "",
    student.city ?? "",
    student.state ?? "",
    student.status ?? "",
    student.created_at ? new Date(student.created_at).toLocaleDateString() : "",
  ]);
  const escapeCell = (value: string) => `"${value.replaceAll('"', '""')}"`;

  return [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\n");
}

