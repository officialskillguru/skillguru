import { assertServiceResponse, getSupabaseClientOrThrow } from "./_shared";
import { type Result, type AppError } from "@/utils/result";

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

export interface IDashboardService {
  getMetrics(userId: string): Promise<Result<DashboardMetrics, AppError>>;
  getRecentActivity(userId: string): Promise<Result<unknown[], AppError>>;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = getSupabaseClientOrThrow();
  const { count: coursesCount, error: coursesError } = await supabase.from('courses').select('id', { count: 'exact', head: true });
  assertServiceResponse(coursesError);

  return {
    totalCourses: coursesCount ?? 0,
    totalMentors: 0,
    totalStudents: 0,
    totalLeads: 0,
    totalAdmins: 0,
    successStories: 0,
  };
}

export async function getDashboardRecent() {
  const supabase = getSupabaseClientOrThrow();
  const { data: courses, error: coursesError } = await supabase.from('courses').select('*').order('updated_at', { ascending: false }).limit(5);

  assertServiceResponse(coursesError);

  return {
    students: [],
    leads: [],
    courses: courses ?? [],
  };
}

export async function getDashboardChartData(): Promise<DashboardChartPoint[]> {
  return [];
}
