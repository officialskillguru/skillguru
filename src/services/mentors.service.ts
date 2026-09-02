import { FunctionsHttpError } from "@supabase/supabase-js";

import type { Json, Tables, Updates } from "@/types/database";
import { AppError, type ErrorCode } from "@/lib/errors";

import {
  assertServiceResponse,
  getSupabaseClientOrThrow,
  normalizeSearchTerm,
  paginationRange,
  type ListParams,
  type PaginatedResult,
} from "./_shared";
import { resolveFileUrl } from "./storage.service";

// Maps the create-mentor Edge Function's response `code` to the shared
// AppError taxonomy so callers (mutation hooks, UI) can tell an expected
// business rejection (duplicate email, validation, permissions) apart from
// a genuine unexpected failure, instead of every non-2xx response looking
// like the same opaque Error.
const EDGE_FUNCTION_CODE_MAP: Record<string, ErrorCode> = {
  EMAIL_EXISTS: "CONFLICT",
  ARCHIVED_MENTOR_EXISTS: "CONFLICT",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
};

/** Extra detail carried on the CONFLICT AppError thrown by createMentor() when the
 *  Edge Function's `code` was ARCHIVED_MENTOR_EXISTS — lets the caller offer a
 *  "Restore existing mentor" action instead of a dead-end error. */
export interface ArchivedMentorConflictDetails {
  edgeFunctionCode: "ARCHIVED_MENTOR_EXISTS";
  mentorId: string;
}

export type Mentor = Tables<"mentor_profiles"> & {
  name?: string;
  avatar?: string;
  email?: string;
  username?: string | null;
};
export type MentorProfile = Mentor;

export type MentorListParams = ListParams & {
  status?: "active" | "suspended";
  /** Include soft-deleted mentors (needed to find candidates to restore). Default false. */
  includeDeleted?: boolean;
};

export async function listMentors(params: MentorListParams = {}): Promise<PaginatedResult<Mentor>> {
  const supabase = getSupabaseClientOrThrow();
  const { page, pageSize, from, to } = paginationRange(params);
  const search = normalizeSearchTerm(params.search);

  let query = supabase.from("mentor_profiles").select("*", { count: "exact" });

  if (search) {
    // mentor_profiles only has headline/bio text - name/email/username live on the
    // linked profiles row, so also match against those and OR the two id sets together.
    // normalizeSearchTerm() already wraps the term in %...% - don't wrap it again here.
    const { data: matchedProfiles } = await supabase
      .from("profiles")
      .select("id")
      .or(`full_name.ilike.${search},email.ilike.${search},username.ilike.${search}`);
    const matchedIds = (matchedProfiles ?? []).map((p) => p.id);

    const orParts = [`headline.ilike.${search}`, `bio.ilike.${search}`];
    if (matchedIds.length > 0) {
      orParts.push(`id.in.(${matchedIds.join(",")})`);
    }
    query = query.or(orParts.join(","));
  }
  if (params.status) {
    query = query.eq("status", params.status);
  }
  if (!params.includeDeleted) {
    query = query.is("deleted_at", null);
  }

  const { data, error, count } = await query
    .order(params.sortBy ?? "created_at", { ascending: params.sortDirection === "asc" })
    .range(from, to);
  assertServiceResponse(error);

  const mentors = data ?? [];
  const profileIds = mentors.map(m => m.id).filter(Boolean);

  const profiles: Record<string, Tables<"profiles">> = {};
  if (profileIds.length > 0) {
    const { data: profilesData } = await supabase.from("profiles").select("*").in("id", profileIds);
    if (profilesData) {
      profilesData.forEach(p => {
        profiles[p.id] = p;
      });
    }
  }

  const mappedMentors = await Promise.all(
    mentors.map(async (m) => {
      const p = m.id ? profiles[m.id] : null;
      const avatar = p?.avatar_file_id ? (await resolveFileUrl(p.avatar_file_id)) ?? "" : "";
      return {
        ...m,
        name: p?.full_name || "Unknown Mentor",
        avatar,
        email: p?.email || "",
        username: p?.username ?? null,
      };
    })
  );

  return { data: mappedMentors, count: count ?? 0, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) };
}

export async function getMentorProfile(id: string): Promise<MentorProfile> {
  const supabase = getSupabaseClientOrThrow();
  const mentor = await supabase.from("mentor_profiles").select("*").eq("id", id).single();

  assertServiceResponse(mentor.error);

  if (!mentor.data) {
    throw new Error("Mentor profile not found.");
  }

  return mentor.data;
}

export interface CreateMentorInput {
  name?: string;
  email?: string;
  phone?: string;
  timezone?: string;
  onboardingMethod?: "manual" | "invite";
  password?: string;
}

export interface CreateMentorResult {
  id: string;
  email: string;
  fullName: string;
  onboardingMethod: "manual" | "invite";
  temporaryPassword: string;
}

interface CreateMentorResponse {
  success: boolean;
  message?: string;
  data?: CreateMentorResult;
}

export async function createMentor(input: CreateMentorInput) {
  const supabase = getSupabaseClientOrThrow();

  // Format the payload for the Edge Function
  const payload = {
    fullName: input.name,
    email: input.email,
    phone: input.phone,
    timezone: input.timezone || "UTC",
    onboardingMethod: input.onboardingMethod || "manual",
    password: input.password || undefined,
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- supabase-js's FunctionsError union resolves loosely here
  const { data, error } = await supabase.functions.invoke<CreateMentorResponse>("create-mentor", {
    body: payload,
  });

  if (error) {
    // supabase-js only surfaces a generic "Edge Function returned a non-2xx
    // status code" on `error` - the function's actual structured error body
    // (e.g. { code: "EMAIL_EXISTS", message: "..." }) lives on the raw HTTP
    // Response at FunctionsHttpError.context and is otherwise silently
    // discarded. Read it so the admin sees "Email is already registered"
    // instead of a meaningless generic message, and so the code survives as
    // a typed AppError instead of a plain Error the UI can't distinguish
    // from an unexpected failure.
    let parsedMessage: string | undefined;
    let parsedCode: string | undefined;
    let parsedMentorId: string | undefined;
    if (error instanceof FunctionsHttpError && error.context instanceof Response) {
      try {
        const body: unknown = await error.context.clone().json();
        if (body && typeof body === "object") {
          if ("message" in body && typeof body.message === "string") parsedMessage = body.message;
          if ("code" in body && typeof body.code === "string") parsedCode = body.code;
          if ("details" in body && body.details && typeof body.details === "object" && "mentorId" in body.details && typeof body.details.mentorId === "string") {
            parsedMentorId = body.details.mentorId;
          }
        }
      } catch {
        /* response body wasn't JSON - fall through to the generic error */
      }
    }
    const message = parsedMessage || (error instanceof Error ? error.message : "Failed to create mentor");
    const mappedCode = parsedCode ? EDGE_FUNCTION_CODE_MAP[parsedCode] : undefined;
    throw new AppError(message, mappedCode ?? "INTERNAL_ERROR", { edgeFunctionCode: parsedCode, mentorId: parsedMentorId });
  }

  if (!data?.success || !data.data) {
    throw new AppError(data?.message || "Failed to create mentor", "INTERNAL_ERROR");
  }

  return data.data;
}

async function updateMentor(id: string, input: Updates<"mentor_profiles">) {
  const supabase = getSupabaseClientOrThrow();
  const { data: old } = await supabase.from("mentor_profiles").select("*").eq("id", id).maybeSingle();
  const { data, error } = await supabase.from("mentor_profiles").update(input).eq("id", id).select("*").single();
  assertServiceResponse(error);
  await supabase.rpc("log_audit_event", {
    p_action: "mentor_profile_updated",
    p_entity_type: "mentor_profile",
    p_entity_id: id,
    p_old_values: (old ? Object.fromEntries(Object.keys(input).map((k) => [k, (old as Record<string, unknown>)[k]])) : null) as Json,
    p_new_values: input as Json,
  });
  return data;
}

/**
 * Full mentor-editor save: `MentorFormState` mixes identity fields that live on
 * `profiles` (name/phone — email is immutable for existing mentors, the form
 * disables it) with bio/headline-style fields that live on `mentor_profiles`.
 * A previous version sent the whole form straight to `mentor_profiles.update()`,
 * which silently failed on every save that touched Full Name or Phone (those
 * columns don't exist on that table) — see BUG_REPORT.md for the real
 * production bug this fixes. Splits the write across both tables instead.
 */
export interface MentorFullUpdateInput extends Updates<"mentor_profiles"> {
  name?: string;
  phone?: string;
  username?: string | null;
  /** Virtual/computed display fields from the `Mentor` type - never real mentor_profiles columns. */
  avatar?: string;
  email?: string;
}

export async function updateMentorFull(id: string, input: MentorFullUpdateInput) {
  const supabase = getSupabaseClientOrThrow();
  const { name, phone, username, avatar: _avatar, email: _email, ...mentorProfileFields } = input;

  if (name !== undefined || phone !== undefined || username !== undefined) {
    const profileUpdate: Updates<"profiles"> = {};
    if (name !== undefined) profileUpdate.full_name = name;
    if (phone !== undefined) profileUpdate.phone = phone;
    if (username !== undefined) profileUpdate.username = username || null;
    const { error: profileError } = await supabase.from("profiles").update(profileUpdate).eq("id", id);
    assertServiceResponse(profileError);
  }

  if (Object.keys(mentorProfileFields).length === 0) {
    return getMentorProfile(id);
  }
  return updateMentor(id, mentorProfileFields);
}

/** Real active/suspended toggle (BUG-06 fix - previously overwrote the mentor's bio field as a no-op). */
export async function setMentorStatus(id: string, status: "active" | "suspended") {
  return updateMentor(id, { status });
}

/**
 * Soft-delete: keeps the account/history intact (courses, enrollments, certificates)
 * so it can be restored. Goes through the admin_soft_delete_mentor() RPC (not a plain
 * table update) so deleted_at, login_disabled, and active-session revocation change
 * atomically — a mentor who is "deleted" must actually be unable to log in, not just
 * hidden from the admin list while their existing session/credentials still work.
 */
export async function softDeleteMentor(id: string) {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.rpc("admin_soft_delete_mentor", { p_mentor_id: id });
  assertServiceResponse(error);
  return getMentorProfile(id);
}

export async function restoreMentor(id: string) {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.rpc("admin_restore_mentor", { p_mentor_id: id });
  assertServiceResponse(error);
  return getMentorProfile(id);
}

// ─── Account Ownership & Security (Phase 1) ─────────────────────────────────
// All privileged operations go through the admin-mentor-account Edge Function
// (service-role auth.admin.* calls + audited RPCs) — never direct table writes
// from the client, same boundary create-mentor already established.

interface MentorAccountActionResponse {
  success: boolean;
  message?: string;
  data?: { mentorId: string };
}

async function invokeMentorAccountAction(body: Record<string, unknown>): Promise<{ mentorId: string }> {
  const supabase = getSupabaseClientOrThrow();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- supabase-js's FunctionsError union resolves loosely here
  const { data, error } = await supabase.functions.invoke<MentorAccountActionResponse>("admin-mentor-account", { body });
  if (error) throw error;
  if (!data?.success || !data.data) {
    throw new Error(data?.message || "Mentor account action failed");
  }
  return data.data;
}

/** Sets a mentor's password directly — no mentor approval, no reset email. Never returned/logged. */
export async function setMentorPassword(mentorId: string, password: string) {
  return invokeMentorAccountAction({ action: "set_password", mentorId, password });
}

/** Forces the mentor to change their password on next login (reuses user_settings.password_reset_required). */
export async function forceMentorPasswordChange(mentorId: string) {
  return invokeMentorAccountAction({ action: "force_password_change", mentorId });
}

/** Invalidates every active session for this mentor immediately (deletes their refresh tokens). */
export async function forceMentorLogout(mentorId: string) {
  return invokeMentorAccountAction({ action: "force_logout", mentorId });
}

/** Locks the account (blocks login) independent of the active/suspended status lifecycle. */
export async function lockMentor(mentorId: string, reason?: string) {
  return invokeMentorAccountAction({ action: "lock", mentorId, reason });
}

export async function unlockMentor(mentorId: string) {
  return invokeMentorAccountAction({ action: "unlock", mentorId });
}

/** Changes login email directly (service-role, auto-confirmed) — no confirmation email to the old or new address. Keeps profiles.email in sync. */
export async function changeMentorEmail(mentorId: string, newEmail: string) {
  const supabase = getSupabaseClientOrThrow();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- supabase-js's FunctionsError union resolves loosely here
  const { data, error } = await supabase.functions.invoke<{ success: boolean; message?: string; data?: { userId: string } }>(
    "admin-account-action",
    { body: { action: "change_email", userId: mentorId, newEmail } }
  );
  if (error) throw error;
  if (!data?.success || !data.data) {
    throw new Error(data?.message || "Failed to change email");
  }
  return data.data;
}

// ─── Read-only security views ───────────────────────────────────────────────

export async function listMentorLoginHistory(mentorId: string, limit = 20) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("login_history")
    .select("*")
    .eq("user_id", mentorId)
    .order("created_at", { ascending: false })
    .limit(limit);
  assertServiceResponse(error);
  return data ?? [];
}

// ─── Course Ownership (Phase 2) ─────────────────────────────────────────────

export interface MentorCourseSummary {
  id: string;
  title: string;
  status: string;
  enrollmentCount: number;
  avgRating: number;
  ratingCount: number;
  avgCompletion: number;
}

export async function listMentorCourses(mentorId: string): Promise<MentorCourseSummary[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data: courses, error } = await supabase.from("courses").select("id, title, status").eq("mentor_id", mentorId).is("deleted_at", null);
  assertServiceResponse(error);
  const list = courses ?? [];
  if (list.length === 0) return [];
  const courseIds = list.map((c) => c.id);

  const [{ data: enrollments }, { data: testimonials }, { data: progress }] = await Promise.all([
    supabase.from("enrollments").select("id, course_id").in("course_id", courseIds),
    supabase.from("testimonials").select("course_id, rating").in("course_id", courseIds).eq("is_approved", true),
    supabase.from("course_progress").select("enrollment_id, completion_percentage"),
  ]);

  const enrollmentsByCourse = new Map<string, string[]>();
  for (const e of enrollments ?? []) {
    const arr = enrollmentsByCourse.get(e.course_id) ?? [];
    arr.push(e.id);
    enrollmentsByCourse.set(e.course_id, arr);
  }
  const enrollmentToCourse = new Map((enrollments ?? []).map((e) => [e.id, e.course_id]));
  const ratingsByCourse = new Map<string, { sum: number; count: number }>();
  for (const t of (testimonials ?? []) as { course_id: string; rating: number | null }[]) {
    if (t.rating == null) continue;
    const cur = ratingsByCourse.get(t.course_id) ?? { sum: 0, count: 0 };
    cur.sum += t.rating;
    cur.count += 1;
    ratingsByCourse.set(t.course_id, cur);
  }
  const completionByCourse = new Map<string, { sum: number; count: number }>();
  for (const p of (progress ?? []) as { enrollment_id: string; completion_percentage: number | null }[]) {
    const courseId = enrollmentToCourse.get(p.enrollment_id);
    if (!courseId || p.completion_percentage == null) continue;
    const cur = completionByCourse.get(courseId) ?? { sum: 0, count: 0 };
    cur.sum += Number(p.completion_percentage);
    cur.count += 1;
    completionByCourse.set(courseId, cur);
  }

  return list.map((c) => {
    const rating = ratingsByCourse.get(c.id);
    const completion = completionByCourse.get(c.id);
    return {
      id: c.id,
      title: c.title,
      status: c.status,
      enrollmentCount: enrollmentsByCourse.get(c.id)?.length ?? 0,
      avgRating: rating ? rating.sum / rating.count : 0,
      ratingCount: rating?.count ?? 0,
      avgCompletion: completion ? completion.sum / completion.count : 0,
    };
  });
}

/** Email of the reserved system mentor that owns courses with no real assigned mentor (see the
 *  `course_banner_and_unassigned_mentor` migration). Login is disabled and it's hidden from
 *  normal mentor listings via `deleted_at`. */
export const UNASSIGNED_MENTOR_EMAIL = "unassigned@system.internal";

/** Resolves the reserved placeholder mentor's id. Used as the "Remove" target / "Assign" source
 *  for courses, since `courses.mentor_id` is NOT NULL and can't simply be cleared. */
export async function getUnassignedMentorId(): Promise<string | null> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("profiles").select("id").eq("email", UNASSIGNED_MENTOR_EMAIL).maybeSingle();
  assertServiceResponse(error);
  return data?.id ?? null;
}

/** Transfers ownership of the given courses to another mentor. `courses.mentor_id` is NOT NULL, so a course can only be reassigned, never fully "removed" without a new owner. */
export async function reassignMentorCourses(courseIds: string[], toMentorId: string): Promise<void> {
  if (courseIds.length === 0) return;
  const supabase = getSupabaseClientOrThrow();

  const { data: oldRows } = await supabase.from("courses").select("id, mentor_id").in("id", courseIds);
  const oldMentorByCourse = new Map((oldRows ?? []).map((c) => [c.id, c.mentor_id]));

  const { error } = await supabase.from("courses").update({ mentor_id: toMentorId }).in("id", courseIds);
  assertServiceResponse(error);

  await Promise.all(
    courseIds.map((courseId) =>
      supabase.rpc("log_audit_event", {
        p_action: "course_reassigned",
        p_entity_type: "course",
        p_entity_id: courseId,
        p_old_values: { mentor_id: oldMentorByCourse.get(courseId) ?? null },
        p_new_values: { mentor_id: toMentorId },
      })
    )
  );
}

// ─── Performance Dashboard (Phase 2) ────────────────────────────────────────

export interface MentorPerformance {
  studentsAssigned: number;
  coursesCount: number;
  assignmentsReviewed: number;
  quizAttempts: number;
  certificatesIssued: number;
  avgRating: number;
  avgCompletionRate: number;
  upcomingMeetings: number;
  pendingTasks: number;
  completedTasks: number;
  avgTaskCompletionHours: number | null;
}

export async function getMentorPerformance(mentorId: string): Promise<MentorPerformance> {
  const supabase = getSupabaseClientOrThrow();

  const { data: courses } = await supabase.from("courses").select("id").eq("mentor_id", mentorId).is("deleted_at", null);
  const courseIds = (courses ?? []).map((c) => c.id);

  const [
    { count: assignmentsReviewed },
    { data: tasks },
    { count: upcomingMeetings },
  ] = await Promise.all([
    supabase.from("assignment_submissions").select("id", { count: "exact", head: true }).eq("graded_by", mentorId),
    supabase.from("tasks").select("status, created_at, completed_at").eq("assignee_id", mentorId).eq("entity_type", "mentor"),
    supabase.from("meetings").select("id", { count: "exact", head: true }).eq("host_id", mentorId).neq("status", "cancelled").gte("starts_at", new Date().toISOString()),
  ]);

  let studentsAssigned = 0;
  let quizAttempts = 0;
  let certificatesIssued = 0;
  let avgRating = 0;
  let avgCompletionRate = 0;

  if (courseIds.length > 0) {
    const [{ data: enrollments }, { data: quizzes }, { data: testimonials }, { data: progress }] = await Promise.all([
      supabase.from("enrollments").select("id, student_id").in("course_id", courseIds),
      supabase.from("quizzes").select("id").in("course_id", courseIds),
      supabase.from("testimonials").select("rating").in("course_id", courseIds).eq("is_approved", true),
      supabase.from("course_progress").select("completion_percentage, enrollment_id"),
    ]);

    studentsAssigned = new Set((enrollments ?? []).map((e) => e.student_id)).size;
    const enrollmentIds = new Set((enrollments ?? []).map((e) => e.id));
    const quizIds = (quizzes ?? []).map((q) => q.id);

    if (quizIds.length > 0) {
      const { count } = await supabase.from("quiz_attempts").select("id", { count: "exact", head: true }).in("quiz_id", quizIds);
      quizAttempts = count ?? 0;
    }

    const enrollmentRows = (enrollments ?? []).map((e) => e.id);
    if (enrollmentRows.length > 0) {
      const { count } = await supabase.from("certificates").select("id", { count: "exact", head: true }).in("enrollment_id", enrollmentRows);
      certificatesIssued = count ?? 0;
    }

    const ratings = (testimonials ?? []).map((t) => t.rating).filter((r): r is number => r != null);
    avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    const relevantProgress = (progress ?? []).filter((p) => enrollmentIds.has(p.enrollment_id) && p.completion_percentage != null);
    avgCompletionRate = relevantProgress.length > 0 ? relevantProgress.reduce((a, p) => a + Number(p.completion_percentage), 0) / relevantProgress.length : 0;
  }

  const taskRows = tasks ?? [];
  const pendingTasks = taskRows.filter((t) => t.status === "pending" || t.status === "in_progress").length;
  const completedTaskRows = taskRows.filter((t) => t.status === "completed" && t.completed_at);
  const avgTaskCompletionHours =
    completedTaskRows.length > 0
      ? completedTaskRows.reduce((a, t) => a + (new Date(t.completed_at!).getTime() - new Date(t.created_at).getTime()) / 3_600_000, 0) / completedTaskRows.length
      : null;

  return {
    studentsAssigned,
    coursesCount: courseIds.length,
    assignmentsReviewed: assignmentsReviewed ?? 0,
    quizAttempts,
    certificatesIssued,
    avgRating,
    avgCompletionRate,
    upcomingMeetings: upcomingMeetings ?? 0,
    pendingTasks,
    completedTasks: completedTaskRows.length,
    avgTaskCompletionHours,
  };
}

export async function listMentorActiveSessions(mentorId: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("user_sessions")
    .select("*")
    .eq("user_id", mentorId)
    .eq("is_active", true)
    .order("started_at", { ascending: false });
  assertServiceResponse(error);
  return data ?? [];
}
