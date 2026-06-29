// Remove this directive after running `supabase gen types` to sync database schema.
import { assertServiceResponse, getSupabaseClientOrThrow } from "./_shared";

export type DashboardMetrics = {
  totalCourses: number;
  totalMentors: number;
  totalStudents: number;
  totalLeads: number;
  totalAdmins: number;
  successStories: number;
};

export type DashboardChartPoint = {
  label: string;
  enrollments: number;
  leads: number;
  conversions: number;
};

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = getSupabaseClientOrThrow();
  const [courses, mentors, students, leads, admins, stories] = await Promise.all([
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase.from("mentors").select("id", { count: "exact", head: true }),
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("admin_accounts").select("id", { count: "exact", head: true }),
    supabase.from("success_stories").select("id", { count: "exact", head: true }),
  ]);

  [courses, mentors, students, leads, admins, stories].forEach((response) => assertServiceResponse(response.error));

  return {
    totalCourses: courses.count ?? 0,
    totalMentors: mentors.count ?? 0,
    totalStudents: students.count ?? 0,
    totalLeads: leads.count ?? 0,
    totalAdmins: admins.count ?? 0,
    successStories: stories.count ?? 0,
  };
}

export async function getDashboardRecent() {
  const supabase = getSupabaseClientOrThrow();
  const [students, leads, courses] = await Promise.all([
    supabase.from("students").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("courses").select("*").order("updated_at", { ascending: false }).limit(5),
  ]);

  assertServiceResponse(students.error);
  assertServiceResponse(leads.error);
  assertServiceResponse(courses.error);

  return {
    students: students.data ?? [],
    leads: leads.data ?? [],
    courses: courses.data ?? [],
  };
}

export async function getDashboardChartData(): Promise<DashboardChartPoint[]> {
  const supabase = getSupabaseClientOrThrow();
  const [students, leads] = await Promise.all([
    supabase.from("students").select("created_at,status"),
    supabase.from("leads").select("created_at,crm_status"),
  ]);
  assertServiceResponse(students.error);
  assertServiceResponse(leads.error);

  const points = new Map<string, DashboardChartPoint>();
  const getPoint = (createdAt: string) => {
    const date = new Date(createdAt);
    const label = date.toLocaleString("en", { month: "short", year: "2-digit" });
    const current = points.get(label) ?? { label, enrollments: 0, leads: 0, conversions: 0 };
    points.set(label, current);
    return current;
  };

  (students.data ?? []).forEach((student) => {
    getPoint(student.created_at).enrollments += 1;
  });

  (leads.data ?? []).forEach((lead) => {
    const point = getPoint(lead.created_at);
    point.leads += 1;
    if (lead.crm_status === "converted") {
      point.conversions += 1;
    }
  });

  return Array.from(points.values()).slice(-12);
}
