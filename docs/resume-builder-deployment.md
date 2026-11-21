# AI Resume Builder: production deployment runbook

Status on 2026-11-21: **nothing deployed**. Every step below needs explicit owner approval. Read-only findings are listed first so each step starts from evidence.

## 0. Verified state (2026-11-21, read-only)

| Check | Result | Evidence |
| --- | --- | --- |
| Resume Builder code on GitHub | **Not pushed.** `feat/product-readiness` is 6 commits ahead of `origin`; no remote branch contains `a6f8270..c8059f7`. | `git branch -r --contains a6f8270` returned nothing |
| Code that reads `VITE_RESUME_BUILDER_V2` on any remote branch | **None** | `git grep VITE_RESUME_BUILDER_V2 origin/main` returned nothing |
| Live site (`skillguru-india.vercel.app`) | Serves the **classic** `ResumeBuilderPage` chunk. No V2 routes (`/resume-builder/new`, `/classic`) and no `student-resumes` / `resume_versions` references in the bundle. | public bundle `index-D98O-ALn.js`, `ResumeBuilderPage-CTwIF5R5.js` |
| Supabase project used by the live site | Same as the locally linked project (`eapv…ntm`) | public `client-*.js` chunk vs `supabase/.temp/project-ref` |
| Live migration status | **Unknown.** `supabase migration list --linked` returned 403 (the CLI account lacks the privileges), and a REST probe was blocked locally. Verify with §2. | |
| Vercel flag scope (Production/Preview/Development) | **Unknown.** The Vercel account connected to this machine has no projects; the site lives under another login. Check in the dashboard (§1). | |

**Conclusion:** the live site is safe today. The flag is inert because no deployed code reads it. The risk starts the moment `feat/product-readiness` is **pushed** (Preview builds) or **merged to main** (Production build) while the tables are missing. Do not push or merge before §3 is complete, or first set the flag to `false` for those environments.

## 1. Vercel flag check (dashboard, read-only)

Vercel → project → **Settings → Environment Variables** → `VITE_RESUME_BUILDER_V2`. Note which boxes are ticked: Production, Preview, Development.

- **Production:** must be off (unticked or `false`) until step 10 of the sequence.
- **Preview:** if ticked, every preview of this branch shows the new builder. Previews use the same Supabase project unless Preview has its own `VITE_SUPABASE_URL`, so the migration must exist first.
- Vite inlines `VITE_*` at **build** time. Changing the value affects only the next build; redeploy for it to take effect.

## 2. Supabase: confirm project and current schema (SQL editor, read-only)

Dashboard → confirm the project ref in the URL is the one the live site uses (`eapv…ntm`) → **SQL Editor** → run:

```sql
-- a) Do the new tables already exist? (expect 0 rows before the migration)
select table_name from information_schema.tables
 where table_schema = 'public'
   and table_name in ('resumes','resume_versions','resume_pdf_jobs','resume_ai_usage');

-- b) Migration history: latest applied versions
select version, name from supabase_migrations.schema_migrations order by version desc limit 15;

-- c) Required predecessors are present
select to_regclass('public.profiles') as profiles, to_regclass('public.student_profiles') as student_profiles,
       to_regclass('public.resume_experience') as classic_resume_experience;
select proname from pg_proc where proname in ('has_permission','get_current_permissions');  -- 2 rows = RBAC fix 20261116000003 applied

-- d) Name collisions (expect 0 rows)
select n.nspname, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname in ('get_my_resume_stats','duplicate_resume','create_resume_version',
   'restore_resume_version','prune_resume_versions','resume_version_retention','consume_resume_ai_quota',
   'resumes_before_write','resumes_enforce_limit');
select id from storage.buckets where id = 'student-resumes';

-- e) Baseline counts for the "existing data unchanged" check (save the output)
select (select count(*) from public.profiles) profiles,
       (select count(*) from public.student_profiles) student_profiles,
       (select count(*) from public.resume_experience) resume_experience;
```

Compare (b) with `supabase/migrations/` (89 files, newest `20261120000001`). If any earlier repo migration is missing on live, apply those first, in order, as a separate approved change. The live project has lagged before.

## 3. Database deployment checklist

1. [ ] Correct project confirmed (§2).
2. [ ] Current schema captured (§2 a–e outputs saved).
3. [ ] No conflicts (§2 d empty; predecessors present).
4. [ ] **Backup.** On Pro and higher, check that **Database → Backups** has a recent daily backup (PITR if enabled). On Free, take a manual dump: `supabase db dump --linked -f backup-schema.sql` and `supabase db dump --linked --data-only -f backup-data.sql`. Both need an account with project privileges; the current CLI login got 403. Keep the dump off-repo.
5. [ ] SQL reviewed: `supabase/migrations/20261120000001_resume_builder_multi_resume.sql`.
   - It only creates objects (`IF NOT EXISTS`).
   - Its `DROP … IF EXISTS` statements touch only its own triggers and policies.
   - It doesn't alter existing tables. The bucket insert is `ON CONFLICT DO NOTHING`.
   - Already proven on a full local chain, plus 17 PGlite tests and 23 local end-to-end checks.
6. [ ] **Apply (after approval)**, by either:
   - `supabase db push --linked` (pushes *all* pending repo migrations, so review §2 b first), or
   - pasting the file into the SQL editor and then recording it: `supabase migration repair --status applied 20261120000001`.
7. [ ] Verify tables and RLS:
   ```sql
   select relname, relrowsecurity from pg_class
    where relname in ('resumes','resume_versions','resume_pdf_jobs','resume_ai_usage');      -- 4 rows, all true
   select tablename, policyname, cmd from pg_policies
    where tablename in ('resumes','resume_versions','resume_pdf_jobs') or policyname like 'student_resumes_%';
   -- expect: resumes select/insert/update/delete_own, resume_versions_select_own, resume_pdf_jobs_select_own,
   --         student_resumes_select_own, student_resumes_delete_own (no insert policy: uploads are service-only)
   select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'student-resumes'; -- public = false
   ```
8. [ ] Verify privileges:
   ```sql
   select has_function_privilege('authenticated','public.consume_resume_ai_quota(uuid,text,int,int)','EXECUTE'); -- false
   select has_table_privilege('anon','public.resumes','SELECT');                                                 -- false
   select has_column_privilege('authenticated','public.resumes','status','UPDATE');                              -- false
   select has_column_privilege('authenticated','public.resumes','resume_data','UPDATE');                         -- true
   ```
9. [ ] Ownership check with two test student accounts. Student A creates a resume in the app. Student B's `select * from resumes` returns nothing of A's (the local end-to-end script automates this, against localhost only).
10. [ ] Existing data unchanged: re-run §2 e. The counts must match.
11. [ ] Regenerate types (optional, the hand-written ones match): `supabase gen types typescript --linked > src/types/database.types.ts`.

**Rollback:** the migration is additive, so leaving the tables in place is harmless. Turning the flag off restores the classic page. A full revert (drop the four tables, functions, bucket policies and the empty bucket) is a separate, approved destructive change, and it is never needed to recover the site.

## 4. Edge Functions

| Function | Needs | Without it |
| --- | --- | --- |
| `resume-ai` | `GEMINI_API_KEY` (existing platform secret, already used by `career-guidance`). Optional: `GEMINI_RESUME_MODEL`, `RESUME_AI_PER_MINUTE` (8), `RESUME_AI_PER_DAY` (80) | Returns `AI_NOT_CONFIGURED`; the builder still works without AI |
| `resume-pdf` | `RESUME_PDF_WORKER_URL`, `RESUME_PDF_WORKER_SECRET`. Optional: `RESUME_PDF_PER_DAY` (30), `RESUME_PDF_VERSIONS_KEPT` (5) | Returns `PDF_NOT_CONFIGURED`; the UI explains it. Safe to deploy before the worker exists |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected by Supabase. Both functions keep gateway `verify_jwt = true` (default; `config.toml` has no override) and also resolve the user in code, then read resumes through the caller's RLS client.

**Before deploying `resume-ai`:** it imports `_shared/gemini-provider.ts`. The working copy has an **uncommitted** change that sends the key in the `x-goog-api-key` header instead of `?key=` (a leak fix). `supabase functions deploy` bundles the working copy, so commit that change first, so that deployed code equals git.

```bash
supabase secrets list                                  # names only; confirm GEMINI_API_KEY exists
supabase functions deploy resume-ai resume-pdf         # after migration is verified
```

## 5. PDF worker (Cloud Run) — see `services/resume-pdf-worker/README.md`

In plain terms, Cloud Run runs a container (a sealed box holding TeX Live, Node and the approved templates) only when a request arrives, and bills per use. With `--min-instances 0` it costs nothing while idle.

1. Build the image in Google Cloud Build. The build fails automatically if any template stops compiling.
2. Store a random secret in Secret Manager.
3. Deploy with `--concurrency 1 --cpu 1 --memory 1Gi --timeout 60 --max-instances 5`.
4. Give the same secret and the service URL to Supabase (`supabase secrets set …`).
5. Test one PDF.

Only the `resume-pdf` function knows the secret. Every request is HMAC-signed with a 5-minute replay window, and anything unsigned gets 401. Needs owner approval: billing account, GCP project, region.

## 6. Activation sequence (adjusted to this repo)

1. **Hold the code**: don't push or merge `feat/product-readiness` yet. Optionally set the flag to `false` for Production (and Preview) now (§1).
2. Verify the production schema and migration history (§2).
3. Back up and review (§3.4–3.5).
4. Apply the migration (§3.6). This must happen **before** any build containing the new code goes live.
5. Verify tables, RLS, privileges and existing data (§3.7–3.10).
6. Commit the Gemini header fix, then deploy `resume-ai` **and** `resume-pdf` together. The PDF function is safe without a worker: it reports "not configured", so there's no reason to wait for Cloud Run.
7. Push the branch and test on the **Preview** deployment with authorized test students: create, autosave, two-tab conflict, duplicate, versions/restore, AI accept/reject, classic page at `/dashboard/resume-builder/classic`.
8. Approve and deploy the Cloud Run worker, then set the two secrets. Generate PDFs from Preview with both templates.
9. Merge to `main` with Production flag **off**. Confirm production is unchanged (classic page).
10. Turn the Production flag on and redeploy (controlled rollout). For a gradual rollout, use Vercel Rolling Releases on that deployment.
11. Smoke-test the existing dashboard: courses, profile, classic resume page, career guidance.
12. Monitor for 48 hours:
    - Supabase → Edge Functions → logs for `resume-ai`/`resume-pdf` (codes `AI_UNSUPPORTED_CLAIMS`, `PDF_WORKER_*`)
    - Cloud Run logs (TeX failures)
    - Vercel runtime errors
13. **Rollback** at any point:
    - Flag `false` plus redeploy (or instant rollback to the previous Vercel deployment) restores the classic page.
    - Unset `RESUME_PDF_WORKER_URL` to stop PDF generation.
    - `supabase functions delete <name>` removes a function.
    - Data and tables stay intact.

Why this order differs from a generic plan: the flag only matters once code that reads it is built, so "hold the code" is the real safety switch. The PDF function degrades gracefully, so it ships with the AI function, and the Cloud Run worker becomes an independent later step rather than a blocker.
