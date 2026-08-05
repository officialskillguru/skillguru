import type { Updates } from "@/types/database";
import { assertServiceResponse, getExtendedSupabaseClient } from "./_shared";

/** Real account-lifecycle check (BUG-06) - used to actually enforce a Suspend/Delete action taken by an admin, not just show a cosmetic badge. */
export async function getMentorAccountStatus(profileId: string) {
  const supabase = getExtendedSupabaseClient();
  const { data, error } = await supabase
    .from("mentor_profiles")
    .select("status, deleted_at")
    .eq("id", profileId)
    .maybeSingle();
  if (error && error.code !== "PGRST116") {
    assertServiceResponse(error);
  }
  return data ?? null;
}

export async function getMentorProfileId(profileId: string) {
  const supabase = getExtendedSupabaseClient();
  const { data, error } = await supabase
    .from("mentor_profiles")
    .select("id")
    .eq("id", profileId)
    .single();

  if (error && error.code !== "PGRST116") {
    assertServiceResponse(error);
  }
  return data?.id || null;
}

export async function getMentorDashboardMetrics(mentorId: string) {
  const supabase = getExtendedSupabaseClient();

  // Courses
  const { data: mentorCourses, error: mcError } = await supabase
    .from("courses")
    .select("id")
    .eq("mentor_id", mentorId);

  assertServiceResponse(mcError);

  const courseIds = mentorCourses?.map((mc) => mc.id) || [];

  let studentsCount = 0;
  let reviewsCount = 0;

  let completedEnrollments = 0;

  if (courseIds.length > 0) {
    const { count: studentCount, error: studentError } = await supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .in("course_id", courseIds);
    assertServiceResponse(studentError);
    studentsCount = studentCount || 0;

    const { count: revCount, error: revError } = await supabase
      .from("testimonials")
      .select("id", { count: "exact", head: true })
      .in("course_id", courseIds)
      .eq("is_approved", true);
    if (revError && revError.code !== "42P01") {
      assertServiceResponse(revError);
    }
    reviewsCount = revCount || 0;

    const { count: completedCount, error: completedError } = await supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .in("course_id", courseIds)
      .eq("status", "completed");
    assertServiceResponse(completedError);
    completedEnrollments = completedCount || 0;
  }

  return {
    totalCourses: courseIds.length,
    activeStudents: studentsCount,
    reviews: reviewsCount,
    completedEnrollments,
  };
}

export async function getMentorProfile(mentorId: string) {
  const supabase = getExtendedSupabaseClient();

  const { data: mentorProfile, error: mpError } = await supabase
    .from("mentor_profiles")
    .select("*")
    .eq("id", mentorId)
    .single();
  assertServiceResponse(mpError);

  const { data: profile, error: pError } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", mentorId)
    .maybeSingle();
  assertServiceResponse(pError);

  return { ...mentorProfile, full_name: profile?.full_name ?? null, email: profile?.email ?? null };
}

export async function updateMentorProfile(mentorId: string, input: Updates<"mentor_profiles">) {
  const supabase = getExtendedSupabaseClient();
  const { data, error } = await supabase.from("mentor_profiles").update(input).eq("id", mentorId).select().single();
  assertServiceResponse(error);
  return data;
}

export async function getMentorCoursesList(mentorId: string) {
  const supabase = getExtendedSupabaseClient();

  const { data: courses, error } = await supabase
    .from("courses")
    .select("*, course_categories(categories(id, name))")
    .eq("mentor_id", mentorId)
    .order("updated_at", { ascending: false });
  assertServiceResponse(error);

  const rows = courses ?? [];
  const courseIds = rows.map((c) => c.id);

  const enrollmentCounts = new Map<string, number>();
  if (courseIds.length > 0) {
    const { data: enrollmentRows, error: enrollError } = await supabase
      .from("enrollments")
      .select("course_id")
      .in("course_id", courseIds);
    assertServiceResponse(enrollError);
    for (const row of enrollmentRows ?? []) {
      enrollmentCounts.set(row.course_id, (enrollmentCounts.get(row.course_id) ?? 0) + 1);
    }
  }

  return rows.map((course) => {
    const { course_categories, ...rest } = course;
    return {
      ...rest,
      categoryNames: (course_categories ?? [])
        .map((cc) => cc.categories?.name)
        .filter((name): name is string => !!name),
      enrollmentCount: enrollmentCounts.get(course.id) ?? 0,
    };
  });
}

export async function getMentorStudentsList(mentorId: string) {
  const supabase = getExtendedSupabaseClient();

  const { data: mentorCourses, error: mcError } = await supabase
    .from("courses")
    .select("id, title")
    .eq("mentor_id", mentorId);
  assertServiceResponse(mcError);

  const courseIds = mentorCourses?.map((mc) => mc.id) || [];
  if (courseIds.length === 0) return [];

  const { data: enrollments, error } = await supabase
    .from("enrollments")
    .select("*")
    .in("course_id", courseIds);
  assertServiceResponse(error);

  if (!enrollments || enrollments.length === 0) return [];

  const profileIds = Array.from(new Set(enrollments.map((e) => e.student_id).filter(Boolean)));

  const { data: profiles, error: pError } = await supabase
    .from("profiles")
    .select("*")
    .in("id", profileIds);
  assertServiceResponse(pError);

  const enrollmentIds = enrollments.map((e) => e.id);
  const { data: progressRows, error: progError } = await supabase
    .from("course_progress")
    .select("enrollment_id, completion_percentage")
    .in("enrollment_id", enrollmentIds);
  assertServiceResponse(progError);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]));
  const courseMap = new Map(mentorCourses?.map((c) => [c.id, c]));
  const progressMap = new Map(progressRows?.map((p) => [p.enrollment_id, p.completion_percentage]));

  return enrollments.map((e) => ({
    ...e,
    profile: e.student_id ? profileMap.get(e.student_id) : undefined,
    courses: e.course_id ? courseMap.get(e.course_id) : undefined,
    completionPercentage: progressMap.get(e.id) ?? 0,
  }));
}

export async function getMentorAnalyticsList(mentorId: string) {
  const courses = await getMentorCoursesList(mentorId);
  if (courses.length === 0) return [];
  const courseIds = courses.map((c) => c.id);

  const supabase = getExtendedSupabaseClient();
  const { data: enrollments, error: enrollError } = await supabase
    .from("enrollments")
    .select("course_id, status")
    .in("course_id", courseIds);
  assertServiceResponse(enrollError);

  const { data: testimonials, error: testError } = await supabase
    .from("testimonials")
    .select("course_id, rating")
    .in("course_id", courseIds)
    .eq("is_approved", true);
  
  if (testError && testError.code !== "42P01") {
    assertServiceResponse(testError);
  }

  const stats = courses.map(c => {
    const courseEnrollments = enrollments?.filter(e => e.course_id === c.id) || [];
    const total = courseEnrollments.length;
    const completed = courseEnrollments.filter(e => e.status === 'completed').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const courseReviews = testimonials?.filter(t => t.course_id === c.id) || [];
    const avgRating = courseReviews.length > 0 
      ? courseReviews.reduce((acc, curr) => acc + (curr.rating || 0), 0) / courseReviews.length 
      : 0;

    return {
      id: c.id,
      title: c.title || "",
      enrollments: total,
      completionRate: completionRate,
      averageRating: avgRating.toFixed(1),
    };
  });

  return stats;
}
