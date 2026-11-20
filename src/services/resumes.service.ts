// ============================================================================
// AI Resume Builder data access (multiple resumes per student).
// ============================================================================
// Talks to Supabase with the student's own session, so every query is bounded
// by the RLS policies in 20261120000001_resume_builder_multi_resume.sql:
// a student can only ever see or change rows where user_id = auth.uid().
// No function here accepts a user id for authorization purposes; the owner
// is always derived from the JWT on the database side.
// ============================================================================
import { FunctionsHttpError } from "@supabase/supabase-js";
import type { Tables } from "@/types/database";
import { RESUME_SCHEMA_VERSION, parseStoredResumeData, type ResumeData } from "@/features/resume-builder/domain/resume-schema";
import { assertServiceResponse, getSupabaseClientOrThrow, paginationRange, type PaginatedResult } from "./_shared";

export const RESUME_PDF_BUCKET = "student-resumes";

export type ResumeRow = Tables<"resumes">;
export type ResumeVersionRow = Tables<"resume_versions">;
export type ResumePdfJobRow = Tables<"resume_pdf_jobs">;

export type ResumeSummary = Pick<
  ResumeRow,
  "id" | "title" | "target_role" | "template_id" | "status" | "revision" | "created_at" | "updated_at" | "latest_generated_at" | "latest_generated_revision" | "latest_pdf_path"
>;

export type ResumeDetail = Omit<ResumeRow, "resume_data"> & { resume_data: ResumeData };

export type ResumeStats = {
  totalCount: number;
  completedCount: number;
  draftCount: number;
  lastUpdated: { id: string; title: string; updatedAt: string } | null;
};

const SUMMARY_COLUMNS =
  "id, title, target_role, template_id, status, revision, created_at, updated_at, latest_generated_at, latest_generated_revision, latest_pdf_path";

// ─── Errors ──────────────────────────────────────────────────────────────────

export class ResumeConflictError extends Error {
  constructor(public readonly latest: ResumeDetail) {
    super("This resume was changed in another tab or device. Reload the latest version or keep your changes.");
    this.name = "ResumeConflictError";
  }
}

export class ResumeNotFoundError extends Error {
  constructor() {
    super("This resume no longer exists. It may have been deleted.");
    this.name = "ResumeNotFoundError";
  }
}

const FRIENDLY_DB_ERRORS: Record<string, string> = {
  RESUME_LIMIT_REACHED: "You have reached the limit of 50 resumes. Delete an unused resume to create a new one.",
  RESUME_NOT_FOUND: "This resume could not be found.",
  RESUME_VERSION_NOT_FOUND: "This version could not be found.",
  RESUME_REVISION_CONFLICT: "This resume was changed elsewhere. Reload it and try again.",
};

/** Maps database error codes to student-friendly text; never surfaces raw SQL errors. */
export function toFriendlyResumeError(error: unknown, fallback = "Something went wrong. Please try again."): Error {
  if (error instanceof ResumeConflictError || error instanceof ResumeNotFoundError) return error;
  const message = typeof error === "object" && error && "message" in error ? String(error.message) : "";
  for (const [code, friendly] of Object.entries(FRIENDLY_DB_ERRORS)) {
    if (message.includes(code)) return new Error(friendly);
  }
  if (/Failed to fetch|NetworkError|network/i.test(message)) return new Error("You appear to be offline. Check your connection and try again.");
  if (/JWT|session|not authenticated/i.test(message)) return new Error("Your session has expired. Please sign in again.");
  return new Error(fallback);
}

function toDetail(row: ResumeRow): ResumeDetail {
  return { ...row, resume_data: parseStoredResumeData(row.resume_data) };
}

// ─── Resumes ─────────────────────────────────────────────────────────────────

export async function listMyResumes(params: { page?: number; pageSize?: number } = {}): Promise<PaginatedResult<ResumeSummary>> {
  const supabase = getSupabaseClientOrThrow();
  const { page, pageSize, from, to } = paginationRange({ page: params.page, pageSize: params.pageSize ?? 12 });
  const { data, error, count } = await supabase
    .from("resumes")
    .select(SUMMARY_COLUMNS, { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, to);
  assertServiceResponse(error);
  const total = count ?? 0;
  return { data: data ?? [], count: total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getMyResumeStats(): Promise<ResumeStats> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.rpc("get_my_resume_stats");
  assertServiceResponse(error);
  const row = data?.[0];
  return {
    totalCount: row?.total_count ?? 0,
    completedCount: row?.completed_count ?? 0,
    draftCount: row?.draft_count ?? 0,
    lastUpdated:
      row?.last_updated_id && row.last_updated_title && row.last_updated_at
        ? { id: row.last_updated_id, title: row.last_updated_title, updatedAt: row.last_updated_at }
        : null,
  };
}

export async function getResume(id: string): Promise<ResumeDetail> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("resumes").select("*").eq("id", id).maybeSingle();
  assertServiceResponse(error);
  if (!data) throw new ResumeNotFoundError();
  return toDetail(data);
}

export type CreateResumeInput = { title: string; targetRole?: string | null; templateId?: string | null; data: ResumeData };

export async function createResume(input: CreateResumeInput): Promise<ResumeDetail> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("resumes")
    .insert({
      title: input.title.trim(),
      target_role: input.targetRole?.trim() || null,
      template_id: input.templateId ?? null,
      resume_data: input.data,
      schema_version: RESUME_SCHEMA_VERSION,
    })
    .select("*")
    .single();
  assertServiceResponse(error);
  return toDetail(data);
}

export type SaveResumePatch = { title?: string; targetRole?: string | null; templateId?: string | null; data?: ResumeData };

/**
 * Optimistic-concurrency save: only succeeds if the row is still at
 * `expectedRevision`. Throws ResumeConflictError (with the latest saved copy)
 * when another tab/device saved first, so newer data is never overwritten.
 */
export async function saveResume(id: string, expectedRevision: number, patch: SaveResumePatch): Promise<ResumeDetail> {
  const supabase = getSupabaseClientOrThrow();
  const update: { title?: string; target_role?: string | null; template_id?: string | null; resume_data?: ResumeData; schema_version?: number } = {};
  if (patch.title !== undefined) update.title = patch.title.trim();
  if (patch.targetRole !== undefined) update.target_role = patch.targetRole?.trim() || null;
  if (patch.templateId !== undefined) update.template_id = patch.templateId;
  if (patch.data !== undefined) {
    update.resume_data = patch.data;
    update.schema_version = RESUME_SCHEMA_VERSION;
  }

  const { data, error } = await supabase.from("resumes").update(update).eq("id", id).eq("revision", expectedRevision).select("*");
  assertServiceResponse(error);
  const saved = data?.[0];
  if (saved) return toDetail(saved);

  const latest = await getResume(id); // throws ResumeNotFoundError if deleted
  throw new ResumeConflictError(latest);
}

/** Title-only update from the dashboard (no revision check; it bumps the revision so open editors notice). */
export async function renameResume(id: string, title: string): Promise<ResumeSummary> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("resumes").update({ title: title.trim() }).eq("id", id).select(SUMMARY_COLUMNS).maybeSingle();
  assertServiceResponse(error);
  if (!data) throw new ResumeNotFoundError();
  return data;
}

export async function changeResumeTemplate(id: string, templateId: string): Promise<ResumeSummary> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("resumes").update({ template_id: templateId }).eq("id", id).select(SUMMARY_COLUMNS).maybeSingle();
  assertServiceResponse(error);
  if (!data) throw new ResumeNotFoundError();
  return data;
}

export async function duplicateResume(id: string, title?: string): Promise<ResumeSummary> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.rpc("duplicate_resume", { p_resume_id: id, p_title: title?.trim() || undefined });
  assertServiceResponse(error);
  return data;
}

/**
 * Deletes the resume's stored PDFs first, then the row (versions and jobs
 * cascade). If file cleanup fails the row is kept so the student can retry -
 * a resume is never left half-deleted with unreachable files.
 */
export async function deleteResume(id: string, ownerId: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const folder = `${ownerId}/${id}`;
  const { data: files, error: listError } = await supabase.storage.from(RESUME_PDF_BUCKET).list(folder, { limit: 1000 });
  if (listError && !/not found/i.test(listError.message)) throw new Error("Your resume files could not be removed. Please try again.");
  const paths = (files ?? []).filter((f) => f.name).map((f) => `${folder}/${f.name}`);
  if (paths.length > 0) {
    const { error: removeError } = await supabase.storage.from(RESUME_PDF_BUCKET).remove(paths);
    if (removeError) throw new Error("Your resume files could not be removed. Please try again.");
  }
  const { error } = await supabase.from("resumes").delete().eq("id", id);
  assertServiceResponse(error);
}

// ─── Versions ────────────────────────────────────────────────────────────────

export async function listResumeVersions(resumeId: string): Promise<ResumeVersionRow[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("resume_versions")
    .select("*")
    .eq("resume_id", resumeId)
    .order("version_number", { ascending: false })
    .limit(100);
  assertServiceResponse(error);
  return data ?? [];
}

export async function createResumeVersion(resumeId: string, label?: string): Promise<ResumeVersionRow> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.rpc("create_resume_version", { p_resume_id: resumeId, p_label: label?.trim() || undefined });
  assertServiceResponse(error);
  return data;
}

export async function restoreResumeVersion(versionId: string, expectedRevision: number): Promise<ResumeDetail> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.rpc("restore_resume_version", { p_version_id: versionId, p_expected_revision: expectedRevision });
  assertServiceResponse(error);
  return toDetail(data);
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

export async function getLatestPdfJob(resumeId: string): Promise<ResumePdfJobRow | null> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("resume_pdf_jobs")
    .select("*")
    .eq("resume_id", resumeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  assertServiceResponse(error);
  return data;
}

export class EdgeFunctionError extends Error {
  constructor(message: string, public readonly code: string, public readonly status: number, public readonly retryAfterSeconds?: number) {
    super(message);
    this.name = "EdgeFunctionError";
  }
}

type EdgeEnvelope<T> = { success: boolean; message: string; code?: string; data: T | null; retryAfterSeconds?: number };

/** Calls one of our Edge Functions and normalises its {success,message,code,data} envelope into a value or an EdgeFunctionError. */
export async function invokeResumeFunction<T>(name: "resume-ai" | "resume-pdf", body: Record<string, unknown>): Promise<T> {
  const supabase = getSupabaseClientOrThrow();
  const response = await supabase.functions.invoke<EdgeEnvelope<T>>(name, { body });
  const data: EdgeEnvelope<T> | null = response.data;
  const error: unknown = response.error;
  if (error) {
    if (error instanceof FunctionsHttpError && error.context instanceof Response) {
      const envelope = (await error.context.json().catch(() => null)) as EdgeEnvelope<T> | null;
      throw new EdgeFunctionError(
        envelope?.message || "The service is temporarily unavailable. Please try again.",
        envelope?.code ?? "UNKNOWN",
        error.context.status,
        envelope?.retryAfterSeconds,
      );
    }
    throw new EdgeFunctionError("Could not reach the server. Check your connection and try again.", "NETWORK", 0);
  }
  if (!data?.success || data.data === null) {
    throw new EdgeFunctionError(data?.message || "Unexpected response from the server.", data?.code ?? "UNKNOWN", 200);
  }
  return data.data;
}

export type GeneratePdfResult = { job: ResumePdfJobRow; alreadyRunning: boolean };

export function requestPdfGeneration(resumeId: string): Promise<GeneratePdfResult> {
  return invokeResumeFunction<GeneratePdfResult>("resume-pdf", { action: "generate", resumeId });
}

/** Short-lived (5 min) signed URL for a PDF in the student's own folder. RLS refuses other students' paths. */
export async function getResumePdfUrl(path: string, downloadFileName?: string): Promise<string> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.storage
    .from(RESUME_PDF_BUCKET)
    .createSignedUrl(path, 300, downloadFileName ? { download: downloadFileName } : undefined);
  if (error || !data?.signedUrl) throw new Error("The PDF could not be opened. Please try again.");
  return data.signedUrl;
}

/** "Aarav Sharma", "Software Developer" -> "Aarav_Sharma_Software_Developer_Resume.pdf" (safe characters only). */
export function buildResumeFileName(fullName: string, targetRole: string | null | undefined): string {
  const part = (s: string) =>
    s
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60);
  const pieces = [part(fullName), part(targetRole ?? "")].filter(Boolean);
  return `${pieces.length ? pieces.join("_") + "_" : ""}Resume.pdf`;
}
