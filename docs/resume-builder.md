# AI Resume Builder: developer guide

Students can create several ATS-friendly resumes, improve their writing with Gemini, and (once templates and the worker are live) generate real LaTeX PDFs. The feature lives inside the student dashboard at `/dashboard/resume-builder`.

## 1. Architecture

```
Browser (React 19 + React Query)                 Supabase                               Google Cloud
──────────────────────────────────               ───────────────────────────            ─────────────
/dashboard/resume-builder        ──supabase-js──▶ Postgres (RLS)  resumes, resume_versions,
  MyResumesPage / NewResumePage                      resume_pdf_jobs, resume_ai_usage
  ResumeEditorPage (10-step wizard,                Storage  student-resumes (private PDFs)
    debounced autosave + revisions)
  ResumePreviewPage (signed-URL PDF) ─invoke──────▶ Edge fn resume-ai ──▶ Gemini (GeminiProvider)
                                     ─invoke──────▶ Edge fn resume-pdf ──HMAC──▶ Cloud Run worker
                                                                                  (TeX Live 2026, pdf.js)
```

Data flow for a PDF: `ResumeData JSON → validate → approved template → escape → render → compile (sandbox) → text-extraction check → private storage → version row`.

| Concern | Location |
| --- | --- |
| Structured data model (single source for every template) | `src/features/resume-builder/domain/resume-schema.ts` |
| Profile import, quality checker, template registry reader | `src/features/resume-builder/domain/` |
| Data access (RLS-bound) / React Query hooks | `src/services/resumes.service.ts`, `src/hooks/student/useResumes.ts` |
| Autosave with optimistic concurrency | `src/features/resume-builder/hooks/useResumeAutosave.ts` |
| UI components / pages | `src/features/resume-builder/components/`, `src/pages/student/resume-builder/` |
| AI prompts, guards, function | `supabase/functions/_shared/resume-ai-{prompts,guards}.ts`, `supabase/functions/resume-ai/` |
| PDF generation function / worker | `supabase/functions/resume-pdf/`, `services/resume-pdf-worker/` |
| Templates | `resume-templates/` (see its README) |

The new builder is behind **`VITE_RESUME_BUILDER_V2`**. While it is `false` (the default), `/dashboard/resume-builder` keeps serving the classic single-resume page. The classic page is also always available at `/dashboard/resume-builder/classic`.

## 2. Database (`supabase/migrations/20261120000001_resume_builder_multi_resume.sql`)

This migration is additive only. The classic tables (`resume_experience/projects/certifications/achievements`, `profiles`, `student_profiles`) are not modified.

| Table | Purpose / key rules |
| --- | --- |
| `resumes` | One row per resume. `user_id` defaults to `auth.uid()`. `resume_data` jsonb (≤256 KB), `status` draft/completed, `revision` (bumped by trigger), PDF columns. Max 50 per student. |
| `resume_versions` | Snapshots: manual saves, every generated PDF, and an automatic backup before a restore. Retention via `app.resume_version_retention` (default 20; generated PDFs: `RESUME_PDF_VERSIONS_KEPT`, default 5). |
| `resume_pdf_jobs` | Generation status pending/processing/completed/failed. A partial unique index allows **one active job per resume**, which handles double clicks. |
| `resume_ai_usage` | One row per accepted AI call, used for per-student rate limiting. Contains no resume content. |

Security:

- Owner-only RLS on every table.
- Column-level grants: clients may insert/update only `title, target_role, template_id, resume_data, schema_version`. Owner, status and PDF columns can't be written from the browser.
- `anon` has no access.
- Versions and jobs are read-only to students.
- RPCs:
  - `get_my_resume_stats`, `duplicate_resume`: invoker rights.
  - `create_resume_version`, `restore_resume_version`: definer rights, check `auth.uid()`; a stale restore raises `PT409`.
  - `consume_resume_ai_quota`, `prune_resume_versions`: service role only.

Storage: `student-resumes` is private, PDF-only, 5 MB. Paths are `<user_id>/<resume_id>/v<n>.pdf`. Students can read and delete only their own folder. Only the service role can upload.

**Applying it (not yet applied anywhere):**

1. Review the SQL.
2. Apply it to a staging/branch database first: `supabase db push` against the linked project, or paste it into the SQL editor.
3. Run the verification queries at the bottom of the migration.
4. Regenerate types with `supabase gen types typescript --linked > src/types/database.types.ts`. Hand-written entries for the new tables are already in that file and match the generated shape.
5. Only then set `VITE_RESUME_BUILDER_V2=true` in Vercel.

> The live project has fallen behind committed migrations before. Check that `20261116000003_restore_rbac_permission_functions.sql` is applied before debugging anything else.

## 3. Gemini (`resume-ai` Edge Function)

- **Key and model:** uses the existing platform `GEMINI_API_KEY` secret and `GeminiProvider` (the key is sent in a header and never reaches the browser). The model is `GEMINI_RESUME_MODEL`, falling back to `GEMINI_MODEL`, then `gemini-flash-latest`.
- **Operations:** `improve_summary`, `improve_objective` (can draft from saved facts), `improve_experience`, `improve_internship`, `improve_project`, `fix_grammar`, `shorten`, `professional_tone`, `suggest_keywords`, `improve_resume`, `analyze_resume`, `match_job`.
- **Safeguards:**
  - The caller's JWT is verified, and resumes are read through the student's RLS client.
  - Atomic quota (`RESUME_AI_PER_MINUTE`, default 8; `RESUME_AI_PER_DAY`, default 80) and a 48 KB body limit.
  - All prompts live in `resume-ai-prompts.ts`. Student text and job descriptions travel as JSON data and never enter the system instruction.
  - Structured output, strictly validated.
  - Outputs that add numbers, links or emails the student never wrote are rejected (one retry, then error `AI_UNSUPPORTED_CLAIMS`).
  - Keyword presence and job-match lists are recomputed from the real texts.
- **Nothing is written by AI.** The UI shows Original vs Improved, and the field changes only on **Accept**. A one-time privacy notice appears before the first AI request, and the builder works fully without AI.

## 4. PDF generation

`resume-pdf` (Edge Function):

1. Checks ownership and the minimum fields.
2. Expires stale jobs.
3. Inserts a job (dedupe), applying the daily cap `RESUME_PDF_PER_DAY` (default 30).
4. Calls the worker.
5. Uploads the PDF, inserts a `generated` version, marks the resume `completed`, and prunes old PDFs.

A failure marks only the job as failed; resume data is never touched. Without `RESUME_PDF_WORKER_URL`, the function returns `PDF_NOT_CONFIGURED` and the UI explains that. Worker details and the Cloud Run runbook are in `services/resume-pdf-worker/README.md`.

The UI never fakes a PDF. With no active templates, Generate is replaced by an explanation. The preview page embeds the actual stored PDF through a 5-minute signed URL, and Download uses `Name_Role_Resume.pdf`.

## 5. Environment variables

| Where | Variable | Notes |
| --- | --- | --- |
| Vercel | `VITE_RESUME_BUILDER_V2` | `true` only after the migration is applied |
| Supabase secrets | `GEMINI_API_KEY` | existing |
| | `GEMINI_RESUME_MODEL` | optional |
| | `RESUME_AI_PER_MINUTE`, `RESUME_AI_PER_DAY` | optional |
| | `RESUME_PDF_WORKER_URL`, `RESUME_PDF_WORKER_SECRET` | unset = PDF disabled |
| | `RESUME_PDF_PER_DAY`, `RESUME_PDF_VERSIONS_KEPT` | optional |
| Cloud Run | `RESUME_PDF_WORKER_SECRET` (Secret Manager), `RESUME_COMPILE_TIMEOUT_MS`, `RESUME_MAX_PAGES` | |

## 6. Deployment order

1. Apply the migration (staging, then production) and verify.
2. `supabase functions deploy resume-ai resume-pdf`. JWT verification stays on; see `supabase/config.toml`.
3. Set `VITE_RESUME_BUILDER_V2=true` in Vercel and redeploy. Students can now create, edit, autosave, duplicate, version and use AI.
4. When templates are integrated and Cloud Run is approved:
   - Build and deploy the worker.
   - Set `RESUME_PDF_WORKER_URL` and `RESUME_PDF_WORKER_SECRET`.
   - Activate the tested templates in `registry.json` and redeploy the web app.

## 7. Tests

```bash
npm test                    # everything below
npx vitest run tests/db     # migration on real Postgres (PGlite): RLS, grants, triggers, RPCs, storage policies
npx vitest run src/features/resume-builder supabase/functions/_shared/resume-ai-guards.test.ts services/resume-pdf-worker
npm run typecheck && npm run lint && npm run build
cd supabase/functions && deno check --config resume-ai/deno.json resume-ai/index.ts   # same for resume-pdf
```

The PGlite tests stub Supabase's `auth.uid()`, roles and storage schema. They prove the SQL logic, not that the migration applies cleanly to the live project.

**Against a real (local) Supabase stack** (verified 2026-11-21; the full migration chain applied cleanly and all 23 checks passed):

```bash
npx supabase start && npx supabase migration up --local
eval "$(npx supabase status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=')"
API_URL=$API_URL ANON_KEY=$ANON_KEY SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY node tests/manual/verify-resume-builder-local.ts
```

What it covers:

- Real auth, PostgREST, RLS and Storage, with two throwaway students.
- Ownership isolation, column grants and optimistic concurrency.
- Stats, duplicate, version and restore RPCs; the quota RPC is not callable by students.
- The private PDF-only bucket: owner signed URLs, no student uploads.
- Cascading delete.

It refuses to run against anything but localhost.

**PDF worker (real TeX):**

1. `docker build -f services/resume-pdf-worker/Dockerfile -t resume-pdf-worker .` This compiles every template with three fixtures as a build gate.
2. Run the container, then `node services/resume-pdf-worker/scripts/verify-templates.ts` (see the script header) to exercise the signed HTTP path.

## 8. Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Resume Builder shows the classic page | `VITE_RESUME_BUILDER_V2` is not `true` at build time |
| `relation "resumes" does not exist` / 404 from PostgREST | migration not applied |
| "AI improvement is not available right now" | `GEMINI_API_KEY` missing (`AI_NOT_CONFIGURED`) |
| "added details you didn't provide" | the model invented a number or link; ask the student to regenerate or edit manually |
| "PDF generation is not yet configured" | worker URL or secret not set |
| `TEMPLATE_NOT_AVAILABLE` | template not `active`, or the worker image was built without the template |
| "changed in another tab or device" | a revision conflict; the student chooses Load latest or Keep my changes |
| Old PDF after edits | the card or preview shows "PDF outdated"; generate an updated PDF |
