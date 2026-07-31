# SkillGuru — Architecture

_Last analyzed: 2026-07-23. Branch: `recovery/enterprise-production`. This document reflects the codebase and live Supabase project (`SkillGuru Production`, ref `thhivnrxthsvoxftblwg`) as observed on this date — re-verify before relying on it long-term._

## 1. Stack

- **Frontend**: React 19, TypeScript 5.7, Vite 8 (rolldown-flavored `vite@8`), React Router v7 (`createBrowserRouter` data router), Tailwind CSS v4, TanStack Query v5, TanStack Table v8, react-hook-form + Zod, Radix UI primitives, Framer Motion / GSAP / Three.js (marketing site visuals), Recharts (admin analytics), Vitest + Testing Library (unit), Playwright (e2e, config present).
- **Backend**: Supabase (Postgres 17, GoTrue auth, PostgREST, Storage, Edge Functions on Deno). No separate custom backend server — the SPA talks directly to Supabase via `@supabase/supabase-js`, with a handful of Deno Edge Functions for privileged operations (admin user creation, payments).
- **Payments**: Razorpay, integrated via Edge Functions (`create-order`, `verify-payment`, `payment-webhook`, `refund-payment`, `payment-status`).
- **Hosting**: static SPA build (`dist/`), no server-side rendering.

## 2. High-level layering

```
Pages (src/pages/**)
   ↓
Hooks (src/hooks/**, src/features/**/hooks)              — React Query wiring, UI-facing state
   ↓
Services (src/services/*.service.ts)                     — orchestration, validation, business rules
   ↓
Repositories (src/repositories/*)  [auth only]            — thin persistence wrapper, Result<T,E> mapping
   ↓
Supabase client (src/lib/supabase/*) → PostgREST / RPC / Storage / Auth
   ↓
Postgres (RLS-protected tables, SECURITY DEFINER functions) + Deno Edge Functions (privileged ops)
```

Domain modeling (`src/domain/auth`, `src/domain/courses`, `src/domain/enrollments`) provides DTOs/mappers/models/validators to convert raw snake_case Supabase rows into camelCase domain objects — but this pattern is **not applied uniformly**; only the `auth` domain is fully wired into the live app (see FEATURE_STATUS.md). The **repository pattern is only used for auth** (`src/repositories/auth.repository.ts` + `IAuthRepository`); every other service (courses, payments, CRM, mentors, notifications, dashboard) talks to Supabase directly inside the service file, without a repository abstraction. This is an inconsistency to be aware of when extending the codebase — new domains should either adopt the repository pattern everywhere or the project should consciously drop it for auth too.

## 3. Routing

Single `createBrowserRouter` tree (`src/routes/router.tsx`), all routes lazy-loaded via `React.lazy` + a shared `withSuspense()` helper (fallback: `PageLoader`). Route groups:

- **Marketing** (`/`, `/courses`, `/courses/:slug`, `/about`, `/placements(/:id)`, `/mentors(/:slug)`, `/guidance`, `/contact`, legal pages, `*` 404) — wrapped in `MarketingRoute` (`src/routes/layouts.tsx`).
- **Auth** — `/login` and `/signup` both render the same `AuthPage`, mode toggled by pathname.
- **Student dashboard** (`/dashboard/*`) — `ProtectedRoute` → `DashboardLayout` (thin wrapper around `DashboardShell`) → nested `Outlet` routes (`courses`, `courses/:id`, `certificates`, `payments`, `profile`, `chat`, `support`, `assignments`, `mentors`).
- **Mentor** (`/mentor/dashboard`) — `MentorProtectedRoute` → `MentorDashboardPage`, which builds its **own** shell inline (does not reuse `DashboardLayout`/`DashboardShell`).
- **Admin** (`/admin/*`) — `AdminProtectedRoute` → `AdminPage`, which also builds its **own** separate sidebar/topbar shell (~35 nested routes for users, courses, students, CRM, commerce, CMS, communication, calendar, analytics, operations).
- **Legacy redirects** — old marketing paths (`/faculty`, `/testimonials`, `/blog`, etc.) `<Navigate>` to canonical routes.

**Important correction to a common assumption**: there is **no single shared `DashboardLayout` that switches its content by role**. Each role (student/mentor/admin) has an entirely separate, hand-built top-level shell component. Role-based access control happens at the **routing layer** (which guard lets you into which route branch), not inside a shared layout.

Route guards (`src/routes/guards.tsx`): `ProtectedRoute` (any authenticated user; also enforces onboarding/profile-completion redirect for students), `AdminProtectedRoute` (role/permission check, super-admin bypass, `requiredPermission` prop exists but is never actually passed by any route today), `MentorProtectedRoute` (mentor or admin). All three duplicate the same auth-status branching (`WAITING_EMAIL_CONFIRMATION` / `UNAUTHENTICATED` / loading) rather than sharing a base — functionally fine, but duplicated.

`RouteResolver.getDashboard(user)` maps a user's collapsed `highestRole` to their home route, used to redirect authenticated-but-unauthorized users to *their own* dashboard rather than an error page.

**Update 2026-07-24**: the dead/legacy `src/components/common/RouteGuards.tsx` guard system described above (`AuthenticatedRoute`, `GuestRoute`, `StudentRoute`, `MentorRoute`, `AdminRoute`) has been **deleted** — it was confirmed to have zero importers anywhere. Its one behavioral difference from the live system (blocking an already-authenticated user from visiting `/login`) is a real gap that still exists in the live `guards.tsx` system if that behavior is ever wanted — worth a small dedicated addition if desired, not a revert of this deletion.

See `AUTH_FLOW.md` and `ROLE_FLOW.md` for full detail on authentication and role resolution.

## 4. Supabase client layer — **RESOLVED 2026-07-24**

There used to be **two parallel Supabase client factories**, a real architectural inconsistency. This has been consolidated:

- `src/lib/supabase/client.ts` — the eager singleton, typed against the now-current `src/types/database.types.ts`. This is the **only** Supabase client factory in the codebase now; every consumer (auth flow, all repositories, services, and — since this pass — `src/services/leads.ts`/`_shared.ts`) uses it.
- `src/lib/supabase/browser.ts` (the old lazy/memoized factory typed against a smaller stub), `src/lib/supabase/admin.ts` (unused service-role client), `src/lib/supabase/server.ts` (empty placeholder), `src/lib/supabase/auth.ts` (a second, unused legacy RBAC helper based on `user.app_metadata.role`, distinct from the real `IdentityService`-based RBAC), and the unused `src/lib/supabase.ts` / `src/lib/supabase/index.ts` re-export barrels — all **deleted** (each confirmed to have zero real importers before removal).

`src/types/database.types.ts` is now the single, current `Database` type source (regenerated against the live schema — see DATABASE.md § 3); the other three orphaned type files that used to exist alongside it are also gone.

## 5. Service layer

See FEATURE_STATUS.md for a per-service completeness verdict. Structurally: `src/services/*.service.ts` (audit, crm, dashboard, mentor-portal, mentors, notifications, payment, successStories) each export a plain object/class calling `supabase.from(...)`/`supabase.rpc(...)` directly, generally wrapped by hooks in `src/hooks/` or `src/hooks/admin/` using TanStack Query for caching/invalidation. `src/services/_shared.ts` centralizes some cross-cutting helpers (pagination, error normalization).

## 6. Edge Functions (Deno, `supabase/functions/*`)

Functions present in the repo: `admin-users`, `create-mentor`, `create-order`, `health-check`, `invoice-download`, `leads`, `payment-status`, `payment-webhook`, `refund-payment`, `verify-payment`.

**Critical operational fact**: as of this analysis, the live Supabase project has **only `create-mentor` actually deployed** (`mcp__supabase__list_edge_functions` returns a single active function). The payment functions (`create-order`, `verify-payment`, `payment-webhook`, `refund-payment`, `payment-status`) and `admin-users`, `health-check`, `invoice-download`, `leads` exist as source in the repo but are **not deployed** to the production project — meaning checkout/payment verification, refunds, invoice download, and lead capture cannot currently function against this Supabase project regardless of frontend correctness. See BUG_REPORT.md.

Beyond the deployment gap, the payment functions also contain logic bugs (wrong table name `student_enrollments` instead of `enrollments`, mock/incomplete refund handling) — see BUG_REPORT.md for specifics.

## 7. Database

See DATABASE.md for the full schema summary, RLS status, and performance/security advisor findings. Headline (updated 2026-07-24): 78 tables, RLS enabled on all of them. The `SECURITY DEFINER` view, unrestricted insert policies, and RLS performance overlaps (~130 groups) that used to be flagged have been fixed — see BUG_REPORT.md and TECHNICAL_DEBT.md § 6 for what changed. Remaining: leaked-password-protection (Auth dashboard setting), 2 low-priority `extension_in_public` warnings, and a reviewed set of anon-callable `SECURITY DEFINER` functions judged safe-by-design.

## 8. Testing & tooling

- Vitest unit tests: 12 files / 63 tests, all passing as of 2026-07-27 (grew from the 5 files/18 tests recorded on 2026-07-24 via subsequent AI-voice-agent and mentor-profile-rebuild work; see TASKS.md for what added coverage).
- Playwright config present (`@playwright/test` in devDependencies, `test:e2e` script) — no dedicated investigation of e2e test coverage was done in this pass; treat as unverified.
- ESLint + Prettier + Husky/lint-staged configured; current `npx eslint .` run reports **0 errors / 64 warnings** (all pre-existing, none introduced by the 2026-07-27 mentor-profile rebuild).
- TypeScript: current `tsc --noEmit` run reports **0 errors**.
- `npm run build` succeeds (2026-07-27 check).
- No CI/CD pipeline is configured (`.github/workflows` does not exist) — lint/typecheck/tests only run locally today. Still open — see TECHNICAL_DEBT.md § 8.

## 9a. Mentor profile content + booking (added 2026-07-27)

The Mentor Profile feature (`src/features/mentor-profile/`) follows the standard layering (§2) end-to-end: `MentorProfilePage.tsx` → `useMentor`/Mentor Dashboard hooks (`useMentorPortal.ts`) → services (`mentor-profile-content.service.ts`, `mentor-availability.service.ts`, `mentor-booking.service.ts`) → `mentor.repository.ts` (real Supabase queries, no fabrication) → a `book-mentor-session` Edge Function (service-role, server-side slot re-validation) for the one write that needs privileged validation, mirroring the existing `enroll-free` pattern for the same class of problem (a table with no safe student-facing INSERT policy). See TASKS.md Phase 1.19 and BUG_REPORT.md BUG-41 for the full rebuild history — this replaced a prior implementation where a real-looking DB-backed page displayed ~90% fabricated content.

## 9. Repository hygiene note — **RESOLVED 2026-07-24**

The repository root used to contain ~30+ tracked one-off Node scripts and numerous stale build/lint/typecheck output snapshots (artifacts of a prior recovery/repair effort, consistent with the branch name `recovery/enterprise-production`). 47 confirmed-stale files (35 `.cjs` scripts, 12 `.txt` snapshots) have been deleted, and `.gitignore` updated to prevent recurrence. Three new, untracked, apparently-active-WIP scripts (`create_admin_pg.cjs`, `create_admin.cjs`, `check_roles.cjs`) were deliberately left untouched — see TECHNICAL_DEBT.md § 7.
