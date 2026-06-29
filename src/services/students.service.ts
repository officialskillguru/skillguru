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

export type Student = Tables<"students">;

export type StudentListParams = ListParams & {
  status?: AccountStatus | "all";
  courseId?: string;
  mentorId?: string;
};

export async function listStudents(params: StudentListParams = {}): Promise<PaginatedResult<Student>> {
  const supabase = getSupabaseClientOrThrow();
  const { page, pageSize, from, to } = paginationRange(params);
  const search = normalizeSearchTerm(params.search);

  let query = supabase.from("students").select("*", { count: "exact" });

  if (search) {
    query = query.or(`name.ilike.${search},email.ilike.${search},phone.ilike.${search},city.ilike.${search}`);
  }

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.courseId) {
    query = query.eq("course_id", params.courseId);
  }

  if (params.mentorId) {
    query = query.eq("mentor_id", params.mentorId);
  }

  const { data, error, count } = await query
    .order(params.sortBy ?? "created_at", { ascending: params.sortDirection === "asc" })
    .range(from, to);
  assertServiceResponse(error);

  return { data: data ?? [], count: count ?? 0, page, pageSize };
}

export async function getStudent(id: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("students").select("*").eq("id", id).single();
  assertServiceResponse(error);
  return data;
}

export async function createStudent(input: Inserts<"students">) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("students").insert(input).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function updateStudent(id: string, input: Updates<"students">) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("students").update(input).eq("id", id).select("*").single();
  assertServiceResponse(error);
  return data;
}

export function toStudentsCsv(students: Student[]) {
  const headers = ["Name", "Email", "Phone", "City", "State", "Status", "Enrollment Date"];
  const rows = students.map((student) => [
    student.name,
    student.email,
    student.phone ?? "",
    student.city ?? "",
    student.state ?? "",
    student.status,
    student.enrollment_date ?? "",
  ]);
  const escapeCell = (value: string) => `"${value.replaceAll('"', '""')}"`;

  return [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\n");
}
