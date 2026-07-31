# SkillGuru — Project Analysis (Executive Summary)

_Analyzed: 2026-07-23. Branch: `recovery/enterprise-production`. Scope: full read-only review of the frontend codebase, Supabase database/RLS/advisors, and Edge Functions. GitHub PR/issue history was not reviewed — the GitHub MCP server required an interactive OAuth login this session didn't complete; local git history was used instead. This document is a snapshot; treat findings as of the date above and re-verify before acting on anything time-sensitive._

**Companion documents**: ARCHITECTURE.md, DATABASE.md, AUTH_FLOW.md, ROLE_FLOW.md, FEATURE_STATUS.md, BUG_REPORT.md, TECHNICAL_DEBT.md, DEVELOPMENT_ROADMAP.md, TASKS.md.

> **Update 2026-07-24**: Phase 0 (project stabilization) is now complete — see TASKS.md and DEVELOPMENT_ROADMAP.md for current status. Fixed: the public lead-capture bug (finding #2 below), the duplicate Supabase clients and "shadow copy" dead-code pattern (finding #4), the stale database types (finding #5), all TypeScript/ESLint errors, the `SECURITY DEFINER` view and RLS performance overlaps, and repo hygiene. **Still open and unaffected by this pass**: the payment pipeline (finding #1 below) and the decorative Admin Dashboard (finding #3) — both are Phase 1/5 work, not yet started. The rest of this document is the original analysis, left as-is for historical context; read BUG_REPORT.md/TECHNICAL_DEBT.md for current, up-to-date status on each specific finding.

## What SkillGuru is

A React 19 + TypeScript + Vite SPA backed entirely by Supabase (Postgres 17, Auth, Storage, Edge Functions), implementing a three-role LMS (Admin, Mentor, Student) plus a public marketing site, a CRM for lead/sales management, and Razorpay-based course payments. No custom backend server exists outside of Supabase Edge Functions.

## Overall assessment

The core scaffolding is genuinely solid: the auth state machine, RBAC data model, CRM service, notifications service, and course/mentor/student data hooks are production-quality work. However, the codebase shows clear signs of **rapid, iterative, possibly AI-assisted or high-churn development without enough closing-the-loop verification** — the dominant pattern found across this review is real, working features sitting right next to a duplicate, non-functional "shadow" implementation with the same or a very similar name, plus a handful of genuinely stale claims in code comments (e.g. a table "was removed" when it demonstrably wasn't). The single highest-leverage finding is that **the payment pipeline — arguably the most business-critical path in an LMS — is currently disconnected from its real backend at three separate points simultaneously** (wrong function names called by the frontend, correct functions not deployed, and even the deployed/correct functions targeting a stale schema), with an insecure client-side fallback quietly filling the gap.

## Top 5 findings, ranked by impact

1. **Payments don't work end-to-end today, and the fallback that "works" is insecure** (₹0 enrollment, no signature check). See BUG-02/03 in BUG_REPORT.md. This is Phase 0 in DEVELOPMENT_ROADMAP.md.
2. **Public lead-capture forms will fail at runtime** — the Edge Function writes columns that don't exist on the live `leads` table. Every marketing-site contact/enquiry/demo/counselling submission is at risk. BUG-01.
3. **The Admin Dashboard — the first thing an admin sees — is 100% decorative mock data**, including a "Payment Gateway: Healthy" indicator while payments are actually broken. BUG-07/08.
4. **A recurring "shadow copy" pattern**: at least 7 distinct real/fake duplicate pairs were found (audit logging, CRM leads hooks, success stories, admin accounts, Supabase clients, auth hooks, route guards) — see Technical Debt § 1. This is the pattern most likely to keep generating new bugs until it's deliberately cleaned up, because it's invisible from the UI layer; only reading the actual data-layer code reveals which twin is wired up.
5. **The TypeScript database types are stale** (24 of 78 live tables covered), which directly enabled several of the above bugs to go unnoticed by the compiler. Regenerating this is a small, mechanical fix with outsized downstream safety benefit.

## What's healthy and worth preserving as-is

- Auth state machine (`AuthContext`), `Result<T,E>`/`AppError` error-handling pattern, and `AuthErrorMapper` — well-designed, consistent, genuinely used everywhere in the live auth flow.
- `crm.service.ts` and `notifications.service.ts` — the two most mature services in the codebase; use these as the reference standard when rewriting the stubbed services identified in FEATURE_STATUS.md.
- The `BaseRepository<T>` abstraction and its ~9 real consumers (auth, courses, enrollments, lessons, learning, progress, quizzes, certificates, profiles).
- RBAC data model (`roles`/`user_roles`/`permissions`/`role_permissions`) — well-designed and more general-purpose than the app currently uses (supports 5 staff roles beyond admin/mentor/student), it's just not fully wired up yet (`role_permissions` has 0 rows).
- Route-guard-based authorization (`src/routes/guards.tsx`) as the single point of role enforcement, backed by real server-side RLS + independent Edge Function role checks — a sound defense-in-depth structure once the duplicate dead guard system is removed.

## Database snapshot

78 tables, RLS enabled on all of them, 23 applied migrations. Row counts are near-zero everywhere (a fresh/staging dataset — 9 profiles, 10 user_roles, no real courses/orders/payments yet), so this is very likely pre-launch or early-stage, which is the right time to fix the Phase 0/1 items in the roadmap before real users and real money are involved. Supabase's own advisors currently report 1 security ERROR (`SECURITY DEFINER` view), ~24 security WARNs (mostly anon-callable `SECURITY DEFINER` functions needing individual review), and 997 performance lints (dominated by 732 overlapping-RLS-policy findings) — see DATABASE.md for the full breakdown.

## Repository health

Only 1 of 10 Edge Functions in the repo (`create-mentor`) is actually deployed to the production Supabase project. No CI/CD pipeline exists. Current live `tsc`/`eslint`/`vitest` runs are healthier than the repo's own committed historical snapshots suggest (3 typecheck errors, 180 lint errors/146 warnings, 20/20 tests passing) — but test coverage is thin (2 of ~37 service files) and concentrated away from the domains with the most bugs (payments, CRM). The repo root also carries 30+ tracked one-off recovery scripts and stale build/lint output files from what appears to be a prior incident-recovery effort, consistent with the current branch name.

## How to use this document set

Start with BUG_REPORT.md if the immediate question is "what's broken right now." Start with FEATURE_STATUS.md if the question is "what can I actually demo/ship today." Start with TECHNICAL_DEBT.md if the question is "what will slow us down if we don't fix it." DEVELOPMENT_ROADMAP.md sequences all three into a prioritized plan. ARCHITECTURE.md / AUTH_FLOW.md / ROLE_FLOW.md / DATABASE.md are the reference material to read before making any non-trivial change to those respective areas, so new work builds on an accurate model of the system rather than the assumptions this analysis had to correct along the way.
