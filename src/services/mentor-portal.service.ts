import { assertServiceResponse, getSupabaseClientOrThrow } from "./_shared";

export async function getMentorProfileId(profileId: string) {
  const supabase = getSupabaseClientOrThrow();
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
  const supabase = getSupabaseClientOrThrow();

  // Courses
  const { data: mentorCourses, error: mcError } = await supabase
    .from("courses")
    .select("id")
    .eq("mentor_id", mentorId);

  assertServiceResponse(mcError);

  const courseIds = mentorCourses?.map((mc) => mc.id) || [];

  let studentsCount = 0;
  let reviewsCount = 0;

  if (courseIds.length > 0) {
    const { count: studentCount, error: studentError } = await supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .in("course_id", courseIds);
    assertServiceResponse(studentError);
    studentsCount = studentCount || 0;

    // missing relationship: testimonials does not have course_id.
    // missing table: course_reviews doesn't exist.
    reviewsCount = 0;
  }

  return {
    totalCourses: courseIds.length,
    activeStudents: studentsCount,
    reviews: reviewsCount,
    // missing table/column for analyticsViews. Documented missing object.
    analyticsViews: 0,
  };
}

export async function getMentorCoursesList(mentorId: string) {
  const supabase = getSupabaseClientOrThrow();

  const { data: courses, error } = await supabase
    .from("courses")
    .select("*")
    .eq("mentor_id", mentorId);
  assertServiceResponse(error);

  return courses || [];
}

export async function getMentorStudentsList(mentorId: string) {
  const supabase = getSupabaseClientOrThrow();

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

  const profileMap = new Map(profiles?.map((p) => [p.id, p]));
  const courseMap = new Map(mentorCourses?.map((c) => [c.id, c]));

  return enrollments.map((e) => ({
    ...e,
    profile: e.student_id ? profileMap.get(e.student_id) : undefined,
    courses: e.course_id ? courseMap.get(e.course_id) : undefined,
  }));
}

export async function getMentorAnalyticsList(mentorId: string) {
  const courses = await getMentorCoursesList(mentorId);
  if (courses.length === 0) return [];
  const courseIds = courses.map((c) => c.id);

  const supabase = getSupabaseClientOrThrow();
  const { data: enrollments, error } = await supabase
    .from("enrollments")
    .select("course_id, status")
    .in("course_id", courseIds);
  assertServiceResponse(error);

  const stats = courses.map(c => {
    const courseEnrollments = enrollments?.filter(e => e.course_id === c.id) || [];
    const total = courseEnrollments.length;
    const completed = courseEnrollments.filter(e => e.status === 'completed').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // missing relationship: No course_id on testimonials, and no course_reviews table
    const averageRating = 0.0;

    return {
      id: c.id,
      title: c.title || "",
      enrollments: total,
      completionRate: completionRate,
      averageRating: averageRating.toFixed(1),
    };
  });

  return stats;
}
