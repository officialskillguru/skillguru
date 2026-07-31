// Real AI Career Guidance. Generation is server-side only (supabase/functions/
// career-guidance), which reuses the AIProvider/GeminiProvider abstraction
// built for the AI Voice Agent - never call the Gemini API directly from the
// client. This file only invokes that function and reads back stored reports.
import type { Tables } from "@/types/database";
import { assertServiceResponse, getSupabaseClientOrThrow } from "./_shared";

export type CareerGuidanceReport = Tables<"career_guidance_reports">;

type GenerateResponse = {
  success: boolean;
  message: string;
  data: CareerGuidanceReport | null;
  errors: string[];
};

export async function generateCareerGuidance(targetRole: string): Promise<CareerGuidanceReport> {
  const supabase = getSupabaseClientOrThrow();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- supabase-js's FunctionsError union resolves loosely here
  const { data, error } = await supabase.functions.invoke<GenerateResponse>("career-guidance", {
    body: { targetRole },
  });
  if (error) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- see above
    throw new Error(error.message);
  }
  if (!data?.success || !data.data) {
    throw new Error(data?.message || data?.errors?.[0] || "Failed to generate career guidance");
  }
  return data.data;
}

export async function listCareerGuidanceReports(studentId: string): Promise<CareerGuidanceReport[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("career_guidance_reports")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  assertServiceResponse(error);
  return data ?? [];
}

export async function listRecommendedCourses(courseIds: string[]): Promise<Pick<Tables<"courses">, "id" | "title" | "slug">[]> {
  if (courseIds.length === 0) return [];
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("courses").select("id, title, slug").in("id", courseIds);
  assertServiceResponse(error);
  return data ?? [];
}
