// ============================================================================
// resume-pdf — generate a resume PDF via the isolated Cloud Run worker.
// ============================================================================
// POST { action: "generate", resumeId }
//
// 1. Authenticate the student's JWT.
// 2. Load the resume through the student's RLS-bound client (ownership).
// 3. Basic generation checks (template chosen, name/email/phone present).
// 4. Insert a job; the partial unique index allows ONE active job per resume,
//    so double clicks return the running job instead of compiling twice.
// 5. Call the worker (HMAC-signed). It renders the approved template with
//    escaped data, compiles in a sandbox and validates the PDF text layer.
// 6. Upload to the private `student-resumes` bucket at
//    <user_id>/<resume_id>/v<n>.pdf, record a version, mark the resume
//    completed. Any failure marks only the JOB failed; resume data is never
//    modified or lost by a failed generation.
// ============================================================================
import { callPdfWorker } from "../_shared/pdf-worker-client.ts";
import { authenticate, corsHeaders, fail, logEvent, ok, readJsonBody } from "../_shared/resume-http.ts";

const FN = "resume-pdf";
const BUCKET = "student-resumes";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STALE_JOB_MS = 5 * 60 * 1000;

const WORKER_ERRORS: Record<string, { status: number; message: string }> = {
  TEMPLATE_NOT_AVAILABLE: { status: 409, message: "This template is not available right now. Please choose another template." },
  UNSUPPORTED_CHARACTERS: { status: 422, message: "Your resume contains characters this template cannot print." },
  COMPILE_TIMEOUT: { status: 504, message: "PDF generation took too long. Please try again." },
  PDF_TOO_MANY_PAGES: { status: 422, message: "Your resume is longer than 4 pages. Shorten some descriptions and try again." },
};

function intEnv(name: string, fallback: number): number {
  const n = Number(Deno.env.get(name));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const requestId = crypto.randomUUID();
  if (req.method !== "POST") return fail(405, "METHOD_NOT_ALLOWED", "Method not allowed", requestId);

  let jobId: string | null = null;
  let auth: Awaited<ReturnType<typeof authenticate>> = null;
  try {
    auth = await authenticate(req);
    if (!auth) return fail(401, "UNAUTHORIZED", "Your session has expired. Please sign in again.", requestId);

    let body: { action?: unknown; resumeId?: unknown };
    try {
      body = (await readJsonBody(req, 4096)) as typeof body;
    } catch {
      return fail(400, "VALIDATION", "Invalid request", requestId);
    }
    if (body.action !== "generate" || typeof body.resumeId !== "string" || !UUID.test(body.resumeId)) {
      return fail(400, "VALIDATION", "Invalid request", requestId);
    }

    const workerUrl = Deno.env.get("RESUME_PDF_WORKER_URL");
    const workerSecret = Deno.env.get("RESUME_PDF_WORKER_SECRET");
    if (!workerUrl || !workerSecret) {
      return fail(503, "PDF_NOT_CONFIGURED", "PDF generation is not yet configured. Your resume is saved and you can keep editing.", requestId);
    }

    // Ownership: the student's own client can only see their own rows.
    const { data: resume, error: resumeError } = await auth.userClient
      .from("resumes")
      .select("id, user_id, template_id, resume_data, revision, title, target_role")
      .eq("id", body.resumeId)
      .maybeSingle();
    if (resumeError) throw new Error(`resume lookup failed: ${resumeError.code ?? ""}`);
    if (!resume || resume.user_id !== auth.userId) return fail(404, "NOT_FOUND", "This resume could not be found.", requestId);

    const personal = (resume.resume_data as { personal?: Record<string, string> } | null)?.personal ?? {};
    if (!resume.template_id) return fail(400, "TEMPLATE_REQUIRED", "Choose a resume template before generating a PDF.", requestId);
    if (!personal.fullName?.trim() || !personal.email?.trim() || !personal.phone?.trim()) {
      return fail(400, "INCOMPLETE", "Add your full name, email and phone number before generating a PDF.", requestId);
    }

    const svc = auth.serviceClient;
    // Expire jobs orphaned by a crashed invocation so they don't block forever.
    await svc
      .from("resume_pdf_jobs")
      .update({ status: "failed", error_code: "STALE_JOB", completed_at: new Date().toISOString() })
      .eq("resume_id", resume.id)
      .in("status", ["pending", "processing"])
      .lt("created_at", new Date(Date.now() - STALE_JOB_MS).toISOString());

    const { data: job, error: jobError } = await svc
      .from("resume_pdf_jobs")
      .insert({ resume_id: resume.id, user_id: auth.userId, requested_revision: resume.revision, template_id: resume.template_id, status: "processing", attempt_count: 1, started_at: new Date().toISOString() })
      .select("*")
      .single();
    if (jobError) {
      if (jobError.code === "23505") {
        const { data: running } = await svc.from("resume_pdf_jobs").select("*").eq("resume_id", resume.id).in("status", ["pending", "processing"]).maybeSingle();
        return ok({ job: running, alreadyRunning: true }, requestId, 202);
      }
      throw new Error(`job insert failed: ${jobError.code ?? ""}`);
    }
    jobId = job.id;

    // Per-student daily cap on compilations (cost control).
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await svc.from("resume_pdf_jobs").select("id", { count: "exact", head: true }).eq("user_id", auth.userId).gte("created_at", since);
    if ((count ?? 0) > intEnv("RESUME_PDF_PER_DAY", 30)) {
      await svc.from("resume_pdf_jobs").update({ status: "failed", error_code: "RATE_LIMITED", completed_at: new Date().toISOString() }).eq("id", job.id);
      return fail(429, "RATE_LIMITED", "You've generated many PDFs today. Please try again tomorrow.", requestId, 3600);
    }

    const result = await callPdfWorker(workerUrl, workerSecret, { requestId, templateId: resume.template_id, resumeData: resume.resume_data });
    if (!result.ok) {
      logEvent(FN, requestId, "worker_failed", { code: result.code, status: result.status, missing: result.missing?.join(",") });
      const code = result.code.replace(/[^A-Z_]/g, "").slice(0, 64) || "WORKER_ERROR";
      await svc.from("resume_pdf_jobs").update({ status: "failed", error_code: code, completed_at: new Date().toISOString() }).eq("id", job.id);
      const known = WORKER_ERRORS[code];
      const extra = code === "UNSUPPORTED_CHARACTERS" && result.characters?.length ? ` Remove or replace: ${result.characters.join(" ")}` : "";
      return fail(known?.status ?? 502, code, (known?.message ?? "We couldn't generate your PDF right now. Your resume is saved; please try again.") + extra, requestId);
    }

    // Version number = next number for this resume (serialised by the unique constraint).
    const { data: last } = await svc.from("resume_versions").select("version_number").eq("resume_id", resume.id).order("version_number", { ascending: false }).limit(1).maybeSingle();
    const versionNumber = (last?.version_number ?? 0) + 1;
    const path = `${auth.userId}/${resume.id}/v${versionNumber}.pdf`;

    const { error: uploadError } = await svc.storage.from(BUCKET).upload(path, result.pdf, { contentType: "application/pdf", upsert: false });
    if (uploadError) throw new Error(`upload failed: ${uploadError.message}`);

    const { data: version, error: versionError } = await svc
      .from("resume_versions")
      .insert({
        resume_id: resume.id,
        user_id: auth.userId,
        version_number: versionNumber,
        source: "generated",
        label: `Generated PDF (${resume.template_id})`,
        template_id: resume.template_id,
        title: resume.title,
        target_role: resume.target_role,
        resume_data_snapshot: resume.resume_data,
        schema_version: 1,
        resume_revision: resume.revision,
        pdf_storage_path: path,
      })
      .select("id")
      .single();
    if (versionError) {
      await svc.storage.from(BUCKET).remove([path]);
      throw new Error(`version insert failed: ${versionError.code ?? ""}`);
    }

    const now = new Date().toISOString();
    const { error: updateError } = await svc
      .from("resumes")
      .update({ status: "completed", latest_pdf_path: path, latest_generated_at: now, latest_generated_revision: resume.revision, current_version: versionNumber })
      .eq("id", resume.id)
      .eq("user_id", auth.userId);
    if (updateError) throw new Error(`resume update failed: ${updateError.code ?? ""}`);

    await svc.from("resume_pdf_jobs").update({ status: "completed", version_id: version.id, completed_at: now }).eq("id", job.id);
    await pruneGeneratedVersions(svc, resume.id, path, requestId);

    const { data: finalJob } = await svc.from("resume_pdf_jobs").select("*").eq("id", job.id).single();
    logEvent(FN, requestId, "generated", { pages: result.pages, bytes: result.pdf.length, versionNumber });
    return ok({ job: finalJob, alreadyRunning: false }, requestId, 201);
  } catch (error) {
    logEvent(FN, requestId, "error", { message: error instanceof Error ? error.message : String(error) });
    if (jobId && auth) {
      await auth.serviceClient.from("resume_pdf_jobs").update({ status: "failed", error_code: "INTERNAL", completed_at: new Date().toISOString() }).eq("id", jobId);
    }
    return fail(500, "INTERNAL", "We couldn't generate your PDF right now. Your resume is saved; please try again.", requestId);
  }
});

/**
 * Retention for generated PDFs: keep the newest RESUME_PDF_VERSIONS_KEPT
 * generated versions (default 5) and always the current one; delete older
 * storage objects first, then their version rows.
 */
async function pruneGeneratedVersions(
  svc: NonNullable<Awaited<ReturnType<typeof authenticate>>>["serviceClient"],
  resumeId: string,
  currentPath: string,
  requestId: string,
) {
  try {
    const keep = intEnv("RESUME_PDF_VERSIONS_KEPT", 5);
    const { data: generated } = await svc
      .from("resume_versions")
      .select("id, pdf_storage_path")
      .eq("resume_id", resumeId)
      .not("pdf_storage_path", "is", null)
      .order("version_number", { ascending: false });
    const old = (generated ?? []).slice(keep).filter((v) => v.pdf_storage_path && v.pdf_storage_path !== currentPath);
    if (old.length === 0) return;
    const { error } = await svc.storage.from(BUCKET).remove(old.map((v) => v.pdf_storage_path as string));
    if (error) return logEvent(FN, requestId, "prune_storage_failed", { message: error.message });
    await svc.from("resume_versions").delete().in("id", old.map((v) => v.id));
    await svc.rpc("prune_resume_versions", { p_resume_id: resumeId });
  } catch (error) {
    logEvent(FN, requestId, "prune_failed", { message: error instanceof Error ? error.message : String(error) });
  }
}
