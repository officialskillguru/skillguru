# SkillGuru — Development Roadmap

_Last analyzed: 2026-07-24. This is a prioritized punch list derived from PROJECT_ANALYSIS.md / BUG_REPORT.md / TECHNICAL_DEBT.md / FEATURE_STATUS.md, not a committed project plan — sequencing and timeframes should be agreed with stakeholders before treating this as a schedule._

## Vision 2026 (north star — not a sprint plan)

Captured 2026-07-24 from a stakeholder-provided product vision. This is a multi-quarter aspiration, not a task list to execute in one continuous run — it's recorded here so every subsequent phase below is chosen with this destination in mind, not because it's next in line to be built. Nothing in this section is scheduled; the phases below remain the actual execution order until re-prioritized.

- **Product shape**: a complete LMS + CRM + Career Platform, competitive in look/feel/functionality with Udemy/Coursera/Scaler/UpGrad/PhysicsWallah-tier EdTech products, with a design bar closer to Notion/Linear/Stripe/Framer/Vercel/Apple than a typical bootcamp site. No placeholder UI, no dead buttons, no "Coming Soon" states anywhere in the final product.
- **Admin Panel** → full enterprise CRM: every entity (Users, Mentors, Students, Organizations, Courses, Batches, Payments, Coupons, Certificates, Assessments, Jobs, Placements, Blogs, Events, Media Library, Support, Campaigns, AI Analytics, SEO, CMS, Audit Logs, System Settings, Roles/Permissions, Storage, API Keys, Feature Flags, Backups) supports full CRUD + search/filter/bulk-actions/export/import/activity history.
- **Mentor Panel** → premium dashboard covering course/curriculum/lesson/assignment/quiz/coding-problem authoring, video/resource upload, student progress/attendance, live classes, calendar, analytics, messaging, and a future-ready revenue dashboard.
- **Student Panel** → full learning + career suite: browse/search/wishlist/purchase/enroll, a learning dashboard with notes/bookmarks/downloads, assignments/quizzes/coding practice, certificates, and a Career Dashboard (resume builder, mock interviews, AI career guidance/skill-gap analysis/roadmaps, job/internship recommendations, achievements/leaderboard/badges), plus forum/support/notifications/settings.
- **Resume Builder**: structured profile data → LaTeX-compatible rendering → ATS-friendly single-page PDF, generated instantly; multiple templates is an explicit future extension, not v1 scope.
- **AI features**: an `AIProvider` abstraction (mirroring the payment-provider pattern already built) so career guidance, skill-gap analysis, resume review, interview prep, roadmap generation, course recommendation, and a learning assistant can be backed by OpenAI, Claude, Gemini, or a local model without frontend changes — never hardcode a specific AI vendor into a feature.
- **Notifications**: a `NotificationProvider` abstraction over Email/SMS/WhatsApp/Push/In-App, with n8n as the eventual automation layer (voice assistant, AI counselor, lead qualification, CRM/marketing automation, certificate generation, student follow-up, placement pipeline) — architected so those integrations plug in later without refactoring the core. **Update 2026-07-25**: the voice-assistant piece is no longer purely aspirational — Phase 2.1 (database + RAG foundation) is built and live; see `docs/AI_VOICE_AGENT.md` for the real phase-by-phase plan and what's still blocking each subsequent phase (no n8n instance connected yet, no payment/calendar/Twilio-number credentials provisioned).
- **Payments**: unchanged from the already-approved direction in `PAYMENT_ARCHITECTURE.md` — `MockPaymentProvider` now, `RazorpayProvider` later, frontend never coupled to a specific provider.
- **Cross-cutting bars**: enterprise-grade RBAC/RLS/JWT/rate-limiting/audit-logging security; Lighthouse >95 performance (lazy loading, code splitting, image optimization, caching, pagination, virtualization); WCAG AA accessibility; full test coverage (unit/integration/Playwright/regression) on every feature before it's considered done; continuously maintained documentation (this roadmap plus `PROJECT_ANALYSIS.md`/`ARCHITECTURE.md`/`DATABASE.md`/`FEATURE_STATUS.md`/`BUG_REPORT.md`/`TECHNICAL_DEBT.md`/`TASKS.md`/`PAYMENT_ARCHITECTURE.md`, and going forward `CHANGELOG.md`/`DECISIONS.md`/`IMPLEMENTATION_PROGRESS.md` as they're introduced).
- **How this gets built**: feature-by-feature, each one finished, verified (`tsc`/`eslint`/tests/build), and documented before moving to the next — never multiple half-finished modules in flight at once. The phased plan below is how that principle is currently being applied; as each phase completes, the next slice of this vision gets turned into a concrete phase rather than the whole vision being attempted at once.
- **UI/UX Constitution** (added 2026-07-24): the design bar named above (Linear/Stripe/Notion/Apple/Framer/Vercel) is not just aspirational copy — it's an explicit standing instruction to challenge and redesign any page that doesn't meet it, not merely "improve" it. Sequencing, per explicit direction: build a documented design system first (`docs/DESIGN_SYSTEM.md`), redesign the Admin Dashboard against it as the flagship, then migrate every other page to that same system rather than redesigning each in isolation. See `docs/DESIGN_SYSTEM.md` for the current state of that migration.

## Phase 0 — Stop-the-bleeding (before any further feature work) — **mostly complete as of 2026-07-24**

These items represent either active user-facing breakage or a live security/financial-integrity gap.

1. ~~**Fix or disable public lead-capture forms** (BUG-01)~~ — **DONE**: rewritten against the real schema, deployed, live-tested with two real submissions.
2. **Remove or gate the client-side "dev fallback" payment path** (BUG-02) — **not yet done**, this is Phase 5 (Payment) scope now that a proper `PaymentService`/provider architecture is planned (Mock provider first, Razorpay behind the same interface) — see the "Payment System" note below.
3. **Deploy the real payment Edge Functions and fix their schema references** (BUG-02, BUG-03) — **not yet done**, same Phase 5 scope.
4. ~~**Recreate the `public.transactions` view without `SECURITY DEFINER`** (BUG-04)~~ — **DONE**: `ALTER VIEW ... SET (security_invoker = true)`.
5. **Implement real Razorpay refunds** (BUG-05) — **not yet done**, Phase 5 scope.

**New finding fixed during this pass, not originally on this list**: `calculate_profile_completion()` — the trigger function that runs on every `profiles` insert/update — referenced a nonexistent column and was **completely broken**, meaning new user signup and any profile update was failing. This was more urgent than everything else on this list and is now fixed; see BUG_REPORT.md "NEW-01".

## Phase 1 — Data-layer honesty pass

Goal: every screen either shows real data or is clearly labeled as not-yet-implemented — no more silent fabrication.

6. Replace the Admin Dashboard's hardcoded widgets with real queries (BUG-07/08) — **not yet done**.
7. Resolve every "shadow copy" pair (Technical Debt § 1) — **mostly done**: leads hooks, audit-logs hooks (the `useAdminSystem.ts` half), the dead `AuditService.ts`, the dead auth-hook layer, and the dead route-guard system have all been deleted. **Still open**: success stories service, admin accounts service, CMS settings service (`successStories.service.ts`, `admins.service.ts`, `cms.service.ts` are all still non-functional stubs — see BUG-12/13).
8. Fix the mentor-status toggle (BUG-06) so it stops overwriting mentor bios. — **not yet done**.
9. Fix the mentor-invite flow's wrong Edge Function name (`create-mentor-account` → `create-mentor`). — **not yet done**.
10. ~~Regenerate `src/types/database.types.ts` against the live schema and delete the orphaned type files~~ — **DONE**.

## Phase 2 — Consolidate duplicated architecture — **complete as of 2026-07-24**

11. ~~Pick one Supabase client factory and migrate `leads.ts`/`_shared.ts` off `lib/supabase/browser.ts`; delete `lib/supabase/admin.ts`/`server.ts`~~ — **DONE**. (Also found and deleted a second unused legacy RBAC helper, `lib/supabase/auth.ts`, and the unused `lib/supabase.ts`/`lib/supabase/index.ts` re-export barrels, during the same cleanup.)
12. ~~Delete the unused parallel auth-hook layer~~ — **DONE**: `src/hooks/auth/{useLogin,useSignup,useLogout,useForgotPassword,useSession}.ts` + barrel deleted (all confirmed zero importers).
13. ~~Delete the unused parallel route-guard system~~ — **DONE**: `src/components/common/RouteGuards.tsx` deleted (confirmed zero importers). The `GuestRoute`-style "block authenticated users from `/login`" behavior was not ported over — still a gap in the live `guards.tsx` system if that behavior is wanted (note this if it comes up as a bug report later; it isn't currently working).
14. Decide on the repository pattern's scope (`mentors`/`payment` repositories still unused) — **not yet done**.
15. Wire domain validators or delete them — **not yet done**.

## Phase 3 — Complete the stubbed feature surface

Roughly in order of user-facing visibility. **None of these have been started** — all still open:

16. Real video playback on the Course Learning page (currently a static placeholder).
17. Mentor Dashboard: real Course Builder (module/lesson CRUD), wire the Notifications tab to the real `notifications.service.ts`, real per-student progress percentages.
18. Real invoice PDF generation (`invoice-download` currently returns JSON; `useInvoice` hook is separately hardcoded and should be pointed at the real function once it's fixed).
19. Placements page and AI Guidance page — either build the real `placements`/`hiring_partners` schema and features, or keep the current honest "Feature Not Available" messaging (already done for Placements) rather than silently mocking data (as AI Guidance currently does).
20. Fill in the granular admin permission system (ROLE_FLOW.md § 6): populate `role_permissions`, start passing `requiredPermission` on sensitive `/admin/*` routes, so the five non-admin staff roles (`counsellor`, `sales`, `content_manager`, `hr`, `finance`) see only what they need rather than the entire dashboard.

## Phase 4 — Platform hardening — **mostly complete as of 2026-07-24**

21. Add a CI pipeline (GitHub Actions or equivalent) — **not yet done**. No pipeline exists today; this is the highest-value remaining item in this phase given everything else here is now fixed and there's nothing automatically preventing regression.
22. ~~RLS performance cleanup migration~~ — **DONE**: all ~130 groups of overlapping permissive policies consolidated (the original 732-count was inflated by per-role double-counting); `auth.uid()` wrapped in `(select ...)` throughout. Verified structurally and behaviorally (simulated non-admin session, confirmed unchanged row visibility).
23. Enable leaked-password protection in Supabase Auth settings — **not done via this pass**: this is an Auth dashboard setting, not reachable via the SQL/migration tooling available. One-click manual step in Supabase Dashboard → Authentication → Policies → Password Security.
24. ~~Review the RLS `WITH CHECK (true)` unrestricted-insert policies~~ — **DONE**: `login_history`, `payment_logs`, `webhooks` all scoped to `service_role` only.
25. ~~Review each `anon`-callable `SECURITY DEFINER` function~~ — **DONE**: two (`calculate_profile_completion`, `get_unread_notification_count`) had a real cross-user enumeration issue and were locked down; the remaining ~22 were reviewed and judged safe-by-design (see DATABASE.md § 4 for the full list and reasoning).
26. ~~Repository hygiene~~ — **DONE**: 47 stale files deleted, `.gitignore` updated. Three new untracked scripts (`create_admin_pg.cjs`, `create_admin.cjs`, `check_roles.cjs`) look like active work-in-progress and were deliberately left alone.
27. Grow test coverage for the service layer, prioritizing payments and CRM — **not yet done**. Still the single most valuable remaining testing investment, especially now that most of the schema-mismatch bugs those tests would have caught have already surfaced and been fixed manually.

## Payment System (Phase 5) — implemented 2026-07-24

No Razorpay credentials exist yet, so this runs on `MockPaymentProvider` in production today. Implemented per `docs/PAYMENT_ARCHITECTURE.md`: a `PaymentProvider` interface (`createOrder`/`verifyPayment`/`refund`) inside the payment Edge Functions, with `MockPaymentProvider` (simulates success/failure/cancelled/expired/timeout/verification-failed/refund success+failure) and a `RazorpayProvider` (real API calls, gated behind `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/`RAZORPAY_WEBHOOK_SECRET`). Provider selection via `PAYMENT_PROVIDER` env var only — the frontend never imports Razorpay-specific types or talks to a provider directly, only the Edge Functions. The old ad-hoc client-side "dev fallback" in `payment.service.ts` (BUG-02) has been fully removed, not patched. See BUG_REPORT.md BUG-02/03/05 and TASKS.md Phase 1.6 for what was fixed along the way.

## Explicitly out of scope for this roadmap

Marketing-site content/CMS wiring, cart/wishlist frontend integration, certificates end-to-end flow, and several student pages (Chat, Support, Assignments) were marked **Unclear** in FEATURE_STATUS.md rather than audited in depth — before scheduling work in those areas, run a follow-up analysis pass specifically on them rather than assuming this roadmap's priority order applies.
