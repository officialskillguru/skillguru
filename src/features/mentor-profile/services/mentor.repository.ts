// Real, DB-backed mentor profile data. Replaces the previous fabricated pipeline
// (mentorProfileFactory.ts, deleted) that invented education, certifications,
// projects, work experience, and reviews attributed to fake student names.
// See docs/BUG_REPORT.md BUG-41.
import { type Mentor } from "../types";
import { getSupabaseClientOrThrow } from "@/services/_shared";
import { resolveFileUrl } from "@/services/storage.service";
import {
  listMentorExperience,
  listMentorProjects,
  listMentorCertifications,
  listMentorAchievements,
} from "@/services/mentor-profile-content.service";
import type { Mentor as BaseMentor } from "@/types/platform";
import { createSlug } from "@/lib/slug";

// Generic, platform-wide explanatory copy - not attributed to any specific
// mentor or claiming a personalized fact, so it isn't part of the fabrication
// problem this rebuild addresses (contrast with the deleted factory's invented
// per-mentor reviews/education/awards).
const GENERIC_MENTORSHIP_PROCESS = [
  { step: 1, title: "Initial Assessment", description: "Your mentor evaluates your current skills, career goals, and identifies gaps in your knowledge." },
  { step: 2, title: "Personalized Roadmap", description: "A step-by-step curriculum tailored to your target role." },
  { step: 3, title: "Hands-on Guidance", description: "Regular 1:1 sessions focused on real projects and practical skills." },
  { step: 4, title: "Interview & Career Prep", description: "Mock interviews and career guidance until you're ready to apply." },
];

const GENERIC_FAQS = [
  {
    id: "faq-sessions",
    question: "How do 1:1 sessions work?",
    answer: "Sessions are conducted over video call. Book a free slot from the availability calendar above and your mentor will confirm the meeting link.",
  },
  {
    id: "faq-cancel",
    question: "Can I reschedule or cancel a session?",
    answer: "Yes - you can cancel a booked session from your dashboard at any time before it starts.",
  },
];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatMonthYear(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatDuration(startStr: string, endStr: string | null): string {
  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : new Date();
  if (Number.isNaN(start.getTime())) return "";
  let months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth());
  months = Math.max(months, 0);
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} Year${years > 1 ? "s" : ""}`);
  if (remMonths > 0 || years === 0) parts.push(`${remMonths} Month${remMonths !== 1 ? "s" : ""}`);
  return parts.join(" ");
}

function mapCourseLevel(level: string): string {
  switch (level) {
    case "beginner": return "Beginner";
    case "intermediate": return "Intermediate";
    case "advanced": return "Advanced";
    case "all_levels": return "All Levels";
    default: return level;
  }
}

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

async function resolveFileUrlOrEmpty(fileId: string | null | undefined): Promise<string> {
  return fileId ? (await resolveFileUrl(fileId)) ?? "" : "";
}

function buildCompanyLogoUrl(company: string): string {
  return `https://logo.clearbit.com/${company.toLowerCase().replace(/\s/g, "")}.com`;
}

/** Aggregates approved testimonial ratings per mentor, via each testimonial's course -> mentor lookup. Used by both `listCatalog` and `findRelated`, which otherwise duplicated this loop identically. */
function accumulateRatingsByMentor(
  testimonials: { course_id: string | null; rating: number | null }[],
  courseMentorMap: Map<string, string>
): Map<string, { sum: number; count: number }> {
  const map = new Map<string, { sum: number; count: number }>();
  for (const t of testimonials) {
    if (!t.course_id || t.rating == null) continue;
    const mentorId = courseMentorMap.get(t.course_id);
    if (!mentorId) continue;
    const cur = map.get(mentorId) ?? { sum: 0, count: 0 };
    cur.sum += t.rating;
    cur.count += 1;
    map.set(mentorId, cur);
  }
  return map;
}

function averageRating(acc: { sum: number; count: number } | undefined): number {
  if (!acc || acc.count === 0) return 0;
  return Math.round((acc.sum / acc.count) * 10) / 10;
}

export class MentorRepository {
  async findBySlug(slug: string): Promise<Mentor | null> {
    const supabase = getSupabaseClientOrThrow();

    // Slug is generated from profiles.full_name, not stored - must scan and match.
    const { data: mentorRows, error: mentorsError } = await supabase
      .from("mentor_profiles")
      .select("id, headline, bio, expertise, company, experience_years, years_of_experience, skills, linkedin_url, github_url, portfolio_url, twitter_url, is_verified");

    if (mentorsError || !mentorRows) return null;

    const profileIds = mentorRows.map((m) => m.id);
    if (profileIds.length === 0) return null;

    // profiles has no public SELECT policy (only auth.uid() = id OR admin) - a
    // direct .from("profiles") query here would return nothing for any real
    // anonymous visitor. Use the narrow public RPC instead (see BUG_REPORT.md
    // BUG-46) that exposes only name/city/country for genuine active mentors.
    const { data: profiles } = await supabase.rpc("get_public_mentor_profiles", { p_mentor_ids: profileIds });

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    let targetMentor: (typeof mentorRows)[number] | null = null;
    let targetProfile: NonNullable<typeof profiles>[number] | null = null;

    for (const mentor of mentorRows) {
      const profile = profileMap.get(mentor.id);
      if (!profile?.full_name) continue;
      if (createSlug(profile.full_name) === slug) {
        targetMentor = mentor;
        targetProfile = profile;
        break;
      }
    }

    if (!targetMentor || !targetProfile) return null;

    const mentorId = targetMentor.id;

    const [experienceRows, projectRows, certificationRows, achievementRows, coursesResult, availabilityResult] = await Promise.all([
      listMentorExperience(mentorId),
      listMentorProjects(mentorId),
      listMentorCertifications(mentorId),
      listMentorAchievements(mentorId),
      supabase
        .from("courses")
        .select("id, slug, title, duration, level, status")
        .eq("mentor_id", mentorId)
        .is("deleted_at", null),
      supabase
        .from("availability")
        .select("day_of_week, timezone")
        .eq("user_id", mentorId)
        .eq("is_active", true)
        .is("deleted_at", null),
    ]);

    const allCourses = coursesResult.data ?? [];
    const courseIds = allCourses.map((c) => c.id);
    const publishedCourses = allCourses.filter((c) => c.status === "published");

    let enrollmentCounts = new Map<string, number>();
    let testimonialsByCourse = new Map<string, { rating: number }[]>();
    let projectCounts = new Map<string, number>();
    let coursesWithCertificate = new Set<string>();

    if (courseIds.length > 0) {
      // enrollments/assignments/certificates have no public SELECT policy
      // (correctly - private student/mentor data); direct queries here always
      // returned nothing for anonymous visitors. Aggregate-only RPCs instead
      // (see BUG_REPORT.md BUG-46).
      const [enrollmentsResult, testimonialsResult, projectCountsResult, certAvailabilityResult] = await Promise.all([
        supabase.rpc("get_public_course_enrollment_counts", { p_course_ids: courseIds }),
        supabase.from("testimonials").select("course_id, rating").in("course_id", courseIds).eq("is_approved", true),
        supabase.rpc("get_public_course_project_counts", { p_course_ids: courseIds }),
        supabase.rpc("get_public_course_certificate_availability", { p_course_ids: courseIds }),
      ]);

      enrollmentCounts = (enrollmentsResult.data ?? []).reduce((map, row) => {
        map.set(row.course_id, Number(row.enrollment_count));
        return map;
      }, new Map<string, number>());

      testimonialsByCourse = (testimonialsResult.data ?? []).reduce((map, row) => {
        if (!row.course_id) return map;
        const list = map.get(row.course_id) ?? [];
        list.push({ rating: row.rating ?? 0 });
        map.set(row.course_id, list);
        return map;
      }, new Map<string, { rating: number }[]>());

      projectCounts = (projectCountsResult.data ?? []).reduce((map, row) => {
        map.set(row.course_id, Number(row.project_count));
        return map;
      }, new Map<string, number>());

      coursesWithCertificate = new Set((certAvailabilityResult.data ?? []).map((row) => row.course_id));
    }

    // Real student reviews - the actual `testimonials` table, joined through
    // courses.mentor_id (testimonials has no direct mentor_id column). No
    // salary/company-outcome fields exist on this table, so those are not
    // invented - only what's real is shown.
    let reviews: Mentor["reviews"] = [];
    if (courseIds.length > 0) {
      const { data: testimonialRows } = await supabase
        .from("testimonials")
        .select("id, content, rating, created_at, course_id, student_id, mentor_reply")
        .in("course_id", courseIds)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(12);

      if (testimonialRows?.length) {
        const studentIds = Array.from(new Set(testimonialRows.map((t) => t.student_id).filter((id): id is string => !!id)));
        const { data: studentProfiles } = await supabase.from("profiles").select("id, full_name").in("id", studentIds);
        const studentMap = new Map((studentProfiles ?? []).map((p) => [p.id, p]));
        const courseMap = new Map(allCourses.map((c) => [c.id, c]));

        reviews = testimonialRows.map((t) => ({
          id: t.id,
          studentName: (t.student_id && studentMap.get(t.student_id)?.full_name) || "Verified Student",
          studentAvatar: "",
          courseName: (t.course_id && courseMap.get(t.course_id)?.title) || "",
          rating: t.rating ?? 0,
          date: formatMonthYear(t.created_at),
          content: t.content,
          isVerified: true,
          mentorReply: t.mentor_reply ?? undefined,
        }));
      }
    }

    const experience: Mentor["experience"] = experienceRows.map((row) => ({
      id: row.id,
      company: row.company,
      companyLogo: row.company_logo_url ?? "",
      role: row.role,
      startDate: formatMonthYear(row.starts_on),
      endDate: row.is_current ? undefined : formatMonthYear(row.ends_on),
      duration: formatDuration(row.starts_on, row.is_current ? null : row.ends_on),
      responsibilities: row.responsibilities ?? [],
      achievements: row.achievements ?? [],
    }));

    const projects: Mentor["projects"] = await Promise.all(
      projectRows.map(async (row) => ({
        id: row.id,
        title: row.title,
        description: row.description ?? "",
        image: await resolveFileUrlOrEmpty(row.image_file_id),
        techStack: row.tech_stack ?? [],
        industry: row.industry ?? "",
        difficulty: (row.difficulty ?? "Beginner") as Mentor["projects"][number]["difficulty"],
        githubUrl: row.github_url ?? undefined,
        liveUrl: row.live_url ?? undefined,
      }))
    );

    const certifications: Mentor["certifications"] = await Promise.all(
      certificationRows.map(async (row) => ({
        id: row.id,
        name: row.name,
        issuer: row.issuer,
        issuerLogo: await resolveFileUrlOrEmpty(row.issuer_logo_file_id),
        issueDate: formatMonthYear(row.issue_date),
        credentialUrl: row.credential_url ?? undefined,
      }))
    );

    const achievements: Mentor["achievements"] = achievementRows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description ?? "",
      date: formatMonthYear(row.achieved_on),
      icon: row.icon ?? undefined,
    }));

    const coursesTaught: Mentor["coursesTaught"] = publishedCourses.map((c) => {
      const courseTestimonials = testimonialsByCourse.get(c.id) ?? [];
      const avgRating = courseTestimonials.length
        ? courseTestimonials.reduce((sum, t) => sum + t.rating, 0) / courseTestimonials.length
        : 0;
      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        thumbnail: "",
        duration: c.duration ?? "",
        studentsEnrolled: enrollmentCounts.get(c.id) ?? 0,
        rating: Math.round(avgRating * 10) / 10,
        difficulty: mapCourseLevel(c.level) as Mentor["coursesTaught"][number]["difficulty"],
        hasCertificate: coursesWithCertificate.has(c.id),
        projectsCount: projectCounts.get(c.id) ?? 0,
      };
    });

    const companiesWorkedWith: Mentor["companiesWorkedWith"] = Array.from(
      new Map(
        [
          ...(targetMentor.company ? [{ name: targetMentor.company, logo: "" }] : []),
          ...experience.map((e) => ({ name: e.company, logo: e.companyLogo })),
        ].map((c) => [c.name, c])
      ).values()
    ).map((c) => ({
      name: c.name,
      logo: c.logo || buildCompanyLogoUrl(c.name),
    }));

    const availabilityRows = availabilityResult.data ?? [];
    const activeDayNumbers = Array.from(new Set(availabilityRows.map((r) => r.day_of_week)));
    const status: Mentor["availability"]["status"] =
      activeDayNumbers.length === 0 ? "Unavailable" : activeDayNumbers.length <= 2 ? "Limited Slots" : "Available";

    const avatarUrl = await resolveFileUrlOrEmpty(targetProfile.avatar_file_id);

    return {
      id: mentorId,
      slug,
      name: targetProfile.full_name || "Mentor",
      avatar: avatarUrl,
      verified: targetMentor.is_verified,
      role: targetMentor.headline || "Mentor",
      company: targetMentor.company || "",
      companyLogo: targetMentor.company ? buildCompanyLogoUrl(targetMentor.company) : "",
      location: [targetProfile.city, targetProfile.country].filter(Boolean).join(", "),
      about: targetMentor.bio || "This mentor hasn't added a bio yet.",
      teachingPhilosophy: undefined,
      languages: ["English"],
      expertise: targetMentor.expertise ?? [],
      tools: [],
      companiesWorkedWith,
      mentorshipProcess: GENERIC_MENTORSHIP_PROCESS,
      socialLinks: {
        linkedin: targetMentor.linkedin_url ?? undefined,
        github: targetMentor.github_url ?? undefined,
        portfolio: targetMentor.portfolio_url ?? undefined,
        twitter: targetMentor.twitter_url ?? undefined,
      },
      stats: [
        { label: "Students", value: `${Array.from(enrollmentCounts.values()).reduce((a, b) => a + b, 0)}+`, icon: "Users" },
        { label: "Experience", value: `${targetMentor.experience_years ?? targetMentor.years_of_experience ?? 0} Years`, icon: "Briefcase" },
        { label: "Courses", value: publishedCourses.length, icon: "BookOpen" },
      ],
      experience,
      certifications,
      skills: (targetMentor.skills ?? []).map((name, i) => ({ id: `skill-${i}`, name })),
      coursesTaught,
      projects,
      achievements,
      reviews,
      faqs: GENERIC_FAQS,
      availability: {
        timezone: availabilityRows[0]?.timezone ?? "UTC",
        availableDays: activeDayNumbers.map((d) => WEEKDAY_NAMES[d]).filter((n): n is string => !!n),
        sessionDurationMinutes: 45,
        status,
      },
    };
  }

  /** Real public mentor catalog (MentorsPage) - every non-deleted mentor with real aggregate stats (students mentored via enrollments, rating via testimonials), not the hardcoded 4-entry `data/platform.ts` array this used to render from. */
  async listCatalog(): Promise<BaseMentor[]> {
    const supabase = getSupabaseClientOrThrow();

    // A real query failure must throw (not silently resolve to []) - otherwise
    // MentorsPage can't tell "no mentors yet" apart from "the catalog failed
    // to load" and never shows a retry.
    const { data: mentorRows, error: mentorRowsError } = await supabase
      .from("mentor_profiles")
      .select("id, headline, bio, expertise, company, experience_years, years_of_experience, is_verified")
      .is("deleted_at", null)
      .eq("status", "active");
    if (mentorRowsError) throw new Error("Failed to load mentor catalog: " + mentorRowsError.message);
    if (!mentorRows?.length) return [];

    const mentorIds = mentorRows.map((m) => m.id);
    const { data: profiles } = await supabase.rpc("get_public_mentor_profiles", { p_mentor_ids: mentorIds });
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const { data: courses } = await supabase.from("courses").select("id, mentor_id").in("mentor_id", mentorIds).is("deleted_at", null);
    const courseIds = (courses ?? []).map((c) => c.id);
    const courseMentorMap = new Map((courses ?? []).map((c) => [c.id, c.mentor_id]));

    const studentCountByMentor = new Map<string, number>();
    let ratingsByMentor = new Map<string, { sum: number; count: number }>();

    if (courseIds.length > 0) {
      // enrollments has no public SELECT policy (correctly - it's private
      // student data), so a direct .from("enrollments") query here would
      // always return empty for anonymous visitors. Use the aggregate-only
      // count RPC instead (see BUG_REPORT.md BUG-46) - it never exposes any
      // individual enrollment/student row, just a per-mentor total.
      const [{ data: studentCounts }, { data: testimonials }] = await Promise.all([
        supabase.rpc("get_public_mentor_student_counts", { p_mentor_ids: mentorIds }),
        supabase.from("testimonials").select("course_id, rating").in("course_id", courseIds).eq("is_approved", true),
      ]);
      for (const row of studentCounts ?? []) {
        studentCountByMentor.set(row.mentor_id, Number(row.student_count));
      }
      ratingsByMentor = accumulateRatingsByMentor(testimonials ?? [], courseMentorMap);
    }

    return Promise.all(
      mentorRows
        .filter((m) => profileMap.get(m.id)?.full_name)
        .map(async (m) => {
          const profile = profileMap.get(m.id)!;
          const avatarUrl = await resolveFileUrlOrEmpty(profile.avatar_file_id);
          return {
            slug: createSlug(profile.full_name),
            name: profile.full_name,
            role: m.headline || "Mentor",
            company: m.company || "",
            companyLogo: m.company ? buildCompanyLogoUrl(m.company) : "",
            avatar: avatarUrl,
            category: m.expertise?.[0] || "Mentorship",
            experience: `${m.experience_years ?? m.years_of_experience ?? 0} Years`,
            experienceYears: m.experience_years ?? m.years_of_experience ?? 0,
            studentsMentored: studentCountByMentor.get(m.id) ?? 0,
            rating: averageRating(ratingsByMentor.get(m.id)),
            location: [profile.city, profile.country].filter(Boolean).join(", "),
            language: "English",
            availability: "Available",
            bio: m.bio || "",
            expertise: m.expertise ?? [],
            workedWith: m.company ? [m.company] : [],
          };
        })
    );
  }

  /** Real "related mentors" - expertise overlap with the current mentor, excluding self. Returns the flat marketing-catalog shape MentorCard already renders. */
  async findRelated(currentMentorId: string, expertise: string[], limit = 3): Promise<BaseMentor[]> {
    const supabase = getSupabaseClientOrThrow();

    let query = supabase
      .from("mentor_profiles")
      .select("id, headline, company, experience_years, years_of_experience, expertise, is_verified")
      .neq("id", currentMentorId);

    if (expertise.length > 0) {
      query = query.overlaps("expertise", expertise);
    }

    const { data: candidates, error: candidatesError } = await query.order("is_verified", { ascending: false }).limit(limit * 3);
    if (candidatesError) throw new Error("Failed to load related mentors: " + candidatesError.message);
    if (!candidates?.length) return [];

    const candidateIds = candidates.map((c) => c.id);
    const { data: profiles } = await supabase.rpc("get_public_mentor_profiles", { p_mentor_ids: candidateIds });
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const shortlist = candidates.filter((c) => profileMap.get(c.id)?.full_name).slice(0, limit);
    const shortlistIds = shortlist.map((c) => c.id);

    let studentCountByMentor = new Map<string, number>();
    let ratingsByMentor = new Map<string, { sum: number; count: number }>();
    if (shortlistIds.length > 0) {
      const [{ data: studentCounts }, { data: courses }] = await Promise.all([
        supabase.rpc("get_public_mentor_student_counts", { p_mentor_ids: shortlistIds }),
        supabase.from("courses").select("id, mentor_id").in("mentor_id", shortlistIds).is("deleted_at", null),
      ]);
      studentCountByMentor = new Map((studentCounts ?? []).map((row) => [row.mentor_id, Number(row.student_count)]));

      const courseIds = (courses ?? []).map((c) => c.id);
      const courseMentorMap = new Map((courses ?? []).map((c) => [c.id, c.mentor_id]));
      if (courseIds.length > 0) {
        const { data: testimonials } = await supabase.from("testimonials").select("course_id, rating").in("course_id", courseIds).eq("is_approved", true);
        ratingsByMentor = accumulateRatingsByMentor(testimonials ?? [], courseMentorMap);
      }
    }

    return Promise.all(
      shortlist.map(async (c) => {
        const profile = profileMap.get(c.id)!;
        const avatarUrl = await resolveFileUrlOrEmpty(profile.avatar_file_id);
        return {
          slug: createSlug(profile.full_name),
          name: profile.full_name,
          role: c.headline || "Mentor",
          company: c.company || "",
          companyLogo: c.company ? buildCompanyLogoUrl(c.company) : "",
          avatar: avatarUrl,
          category: "Mentorship",
          experience: `${c.experience_years ?? c.years_of_experience ?? 0} Years`,
          experienceYears: c.experience_years ?? c.years_of_experience ?? 0,
          studentsMentored: studentCountByMentor.get(c.id) ?? 0,
          rating: averageRating(ratingsByMentor.get(c.id)),
          location: [profile.city, profile.country].filter(Boolean).join(", "),
          language: "English",
          availability: "Available",
          bio: "",
          expertise: c.expertise ?? [],
          workedWith: c.company ? [c.company] : [],
        };
      })
    );
  }
}

export const mentorRepository = new MentorRepository();
