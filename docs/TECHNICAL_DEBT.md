# SkillGuru — Technical Debt

_Last analyzed: 2026-07-24. Distinct from BUG_REPORT.md: these items aren't necessarily broken today, but they increase risk/cost of future changes, or represent cleanup that should happen before scaling the team or the codebase further._

## 1. "Shadow copy" pattern — duplicate implementations sharing a name, one real one fake — **MOSTLY RESOLVED 2026-07-24**

This was the single most recurring pattern found across the codebase. Resolved:

- ~~`AuditService`/`auditService`~~ — dead stub (`AuditService.ts`) deleted.
- ~~`useAuditLogs` (`useAdminSystem.ts`'s stub half)~~ — deleted. (`auditLogs.service.ts`'s stub, backing `useAdminData.ts`'s copy, is still open — see BUG-10 in BUG_REPORT.md.)
- ~~`useAdminLeads`/`useLeadMutations`~~ — dead stub (`src/hooks/admin/useAdminLeads.ts`) deleted.
- ~~Two Supabase client factories~~ — consolidated onto `lib/supabase/client.ts`; `browser.ts`, `admin.ts`, `server.ts`, `auth.ts` (a third, previously-unlisted legacy RBAC helper found during cleanup), and the unused `lib/supabase.ts`/`lib/supabase/index.ts` barrels all deleted. The two orphaned `database.types.ts.old`/`database.types.utf8.ts` files were deleted earlier in the same pass (see § 3).
- ~~Two auth-hook layers~~ — the entirely-unused `src/hooks/auth/{useLogin,useSignup,useLogout,useForgotPassword,useSession}.ts` + barrel deleted; `AuthContext`/`useAuth` remains the one live implementation.
- ~~Two route-guard systems~~ — the entirely-unused `src/components/common/RouteGuards.tsx` deleted; `src/routes/guards.tsx` remains the one live implementation.

**Still open**: `successStories.service.ts` (throws/empty) vs. the direct-Supabase writes in `useAdminMutations.ts` (real) — same feature, two contradictory code paths, not yet resolved. See BUG-12 in BUG_REPORT.md.

## 2. Stale/incorrect claims embedded in code comments

Several services contain comments asserting a table "was removed" or "is missing from the new schema" (`successStories.service.ts`, `cms.service.ts`, and similar language in `admins.service.ts`/`auditLogs.service.ts`) that are **demonstrably false** against the current migration history (`success_stories`, `system_settings` both exist and are populated by other code paths). These comments likely reflect a mid-migration snapshot that was never revisited after the schema stabilized. Anyone reading these comments today would be misled into thinking a rewrite is a bigger job than it is. Not yet fixed — still open.

## 3. Database type generation is stale and fragmented — **RESOLVED 2026-07-24**

`src/types/database.types.ts` previously covered only ~24 of 78 live tables. Regenerated against the live schema (now covers all 87 tables/functions); the 3 orphaned type files (`database.ts`'s stale predecessor state, `database.types.ts.old`, `database.types.utf8.ts`) and an additional undocumented `database-extended.types.ts`/`supabase.types.ts` pair (manually-maintained partial types for tables the old generated file was missing, plus an empty placeholder) were all deleted since the fresh generation supersedes them. `getExtendedSupabaseClient()` in `_shared.ts` is now a thin `@deprecated` alias for the properly-typed client rather than a genuinely untyped escape hatch; regenerating types surfaced 34 real, previously-invisible bugs across the service layer, all fixed in the same pass (see BUG_REPORT.md).

**Still open**: `database.types.ts` needs periodic regeneration whenever new migrations land — there's no automated check that it stays in sync (worth a pre-commit or CI step long-term, see § 8).

## 4. Repository pattern adopted inconsistently

`BaseRepository<T>` is a solid, reusable abstraction and is genuinely used for ~9 of 11 candidate domains (auth, courses, enrollments, lessons, learning, progress, quizzes, certificates, profiles, admin/students). But `mentors.repository.ts` and `payment.repository.ts` are both defined and **never imported** — the corresponding services (`mentors.service.ts`, `payment.service.ts`) bypass them and call Supabase directly. New contributors won't have a consistent rule to follow ("do I write a repository or not?") without this being resolved one way or the other. Not yet fixed — still open.

## 5. Domain validators are uniformly dead code

`ProfileValidator`, `CourseValidator`, `EnrollmentValidator` (`src/domain/{auth,courses,enrollments}/validators/*`) are fully implemented but never imported by anything except themselves, across all three domains equally. Whatever business-rule invariants they encode (e.g. required fields, format checks) are not actually enforced anywhere at runtime today — validation in practice happens only via Zod schemas at the UI-form layer (`src/schemas/*`), which is a materially different (and narrower) set of guarantees than domain-level invariant checking. Either wire these into the repository/service `create`/`update` paths, or delete them and rely explicitly on Zod-at-the-boundary as the documented validation strategy. Not yet fixed — still open.

## 6. RLS performance debt — **RESOLVED 2026-07-24**

Was: 732 `multiple_permissive_policies` findings (this count double-counted per default Postgres role — the real underlying issue was ~130 groups of genuinely overlapping permissive policies across ~65 tables) + 86 `auth_rls_initplan` findings.

**Fix applied**: every group of overlapping permissive policies for the same table+command was consolidated into a single policy whose condition is the literal OR of the originals (verified structurally against several tables' `pg_policy` definitions, and behaviorally by simulating a non-admin authenticated session and confirming row visibility was unchanged). `auth.uid()`/`auth.<fn>()` calls were wrapped in `(select ...)` throughout in the same pass. Zero overlapping permissive-policy groups remain (down from ~130).

**Still open**: `unused_index` (104) and `unindexed_foreign_keys` (75) advisor findings are informational only, given the near-zero current row counts — revisit once real production query patterns emerge rather than acting on them now.

## 7. Repository root is cluttered with one-off scripts and stale output snapshots — **RESOLVED 2026-07-24**

Was: 31+ tracked, committed Node scripts at the repo root plus stale `build_output*.txt`/`lint*.txt`/`typecheck*.txt`/`repo-forensics-*.txt` snapshots — artifacts of a prior recovery effort.

**Fix applied**: 35 stale `.cjs` scripts and 12 stale `.txt` snapshots deleted; `.gitignore` updated with `*_output*.txt`/`*_errors*.txt`/`lint*.txt`/`typecheck*.txt`/`repo-forensics-*.txt` patterns to prevent recurrence.

**Explicitly left alone**: `create_admin_pg.cjs`, `create_admin.cjs`, `check_roles.cjs` — new, untracked, and appear to be active work-in-progress (one was open in the developer's editor during this cleanup). Not evaluated further; revisit with the user before touching these.

## 8. No CI/CD pipeline

No `.github/workflows` directory exists. Lint, typecheck, and tests currently only run locally (and via the Husky pre-commit hook, which is narrower — lint-staged only touches changed files). There is no automated gate preventing a broken build, failing test, or new lint error from reaching `main`/`recovery/enterprise-production`. See DEVELOPMENT_ROADMAP.md for a suggested minimal pipeline. Not yet fixed — still open.

## 9. Thin test coverage

Only 2 of ~37 service files have any tests (`auth.service.test.ts`, `leads.test.ts`), concentrated in a narrow slice of the app (mostly auth + validation). None of the CRM, payments, notifications, or repository layers have test coverage. Given how many of the bugs in BUG_REPORT.md were exactly the kind that a basic integration test would have caught immediately, test coverage for the service layer — especially payments and CRM — should be treated as a priority alongside fixing the remaining bugs, not an afterthought. Not yet fixed — still open.

## 10. Minor/cosmetic debt

- `AuthErrorMapper` never produces the `NetworkError` class that exists in `result.ts` — still open.
- `AdminProtectedRoute`'s `requiredPermission` prop is fully implemented but never actually passed from any route — the granular permission system is half-built. Still open (see ROLE_FLOW.md § 6 — also blocked on `role_permissions` having 0 rows).
- `state.loadingState` in `AuthContext` is initialized but never updated by any reducer action — still open.
- ~~A stray root-level `test.ts` file~~ — deleted (was an untracked scratch file debugging a Supabase type-generation edge case, unrelated to the app; caused an ESLint parse error).
- ~~A stray root-level `crash.test.tsx` file~~ — deleted (untracked scratch React Testing Library debugging script; it matched Vitest's default test glob and was silently included in the "20 tests / 6 files" baseline reported in the original analysis).
- `health-check` Edge Function uses the older `https://deno.land/std@0.168.0/http/server.ts` `serve()` API instead of `Deno.serve` used by every other function — stylistically inconsistent, not broken. Still open.
