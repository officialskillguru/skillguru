# SkillGuru — Changelog

_Started 2026-07-27. This file tracks real, verified changes going forward — it does not reconstruct history prior to this date (see `TASKS.md`/`BUG_REPORT.md` for the fuller prior-work record)._

## 2026-07-29 (Mentor Module Production Complete — Final Audit Pass)

A second, deeper pass requested after the first "Production Complete" declaration, covering accessibility (a full audit found 4 critical + 9 major issues), remaining dead code/duplication, and a storage security gap the earlier pass hadn't reached.

### Fixed — Security
- **Storage bucket over-exposure**: the public `mentors` storage bucket had a broad `SELECT` RLS policy on `storage.objects` that let any client LIST every file in the bucket (not just fetch a known object). Public buckets don't need a SELECT policy for reads (Supabase serves them via a public-URL bypass); confirmed the app only ever calls `getPublicUrl()`, never `.list()`, and dropped the policy.
- Admin `listMentors()` avatar field was the raw, unresolved `avatar_file_id` (never passed through `resolveFileUrl`) unlike every public-facing mentor query — admin mentor avatars were always broken images.
- `admin-mentor-account` Edge Function error responses sanitized (session's earlier pass); re-verified still holding.

### Fixed — Accessibility (full audit: 4 critical, 9 major)
- **Critical**: `MentorBookingModal` had no focus trap (Tab escaped into the page behind it) and never returned focus to the triggering button on close — added a proper roving focus trap + focus restoration.
- **Critical**: star ratings on `MentorReviews` were conveyed only via icon fill color with no text alternative — added `role="img"`/`aria-label` with the numeric rating.
- **Critical**: every CRUD form field across the mentor's own Experience/Projects/Certifications/Achievements/Availability editors (`MentorProfileSections.tsx`) had a `<label>` with no `htmlFor`/`id` pairing — added a shared `LabeledField` helper and wired real ids via `useId()` throughout.
- **Critical**: `CourseBuilderTab`'s course-list ↔ curriculum-editor transitions dropped focus to `<body>` with no announcement — added focus movement + `role="region"`/`aria-label` on each view.
- **Major**: fixed incomplete tab/tabpanel ARIA (missing `id`/`aria-controls`/`aria-labelledby`, no arrow-key navigation) across `AdminMentorsPage`'s mentor editor drawer, `MentorCRMPanel`, `ProfileTab`, and `MentorsPage`'s category filter — added a shared `getNextTabIndex` keyboard-nav helper (`src/lib/a11y-tabs.ts`) reused by all four.
- **Major**: added `aria-live`/`role="status"`/`role="alert"` to previously-silent dynamic content: admin mentor table loading/pagination, booking widget success/error states, dashboard section switches, and every remaining loading skeleton across the module.
- **Major**: labeled the admin mentor search input and status filter (previously placeholder-only); fixed heading-hierarchy breaks (`MentorCompanies`/`MentorTools` used `<h3>` among `<h2>` siblings); added accessible names to the "Verified" badge/icon on both `MentorHero` and `MentorReviews`.
- Minor: added `sr-only` "(opens in a new tab)" hints to external project links; `MentorDashboardShell`'s `<h1>` now reads "Mentor Dashboard" instead of the user's email.

### Changed — Dead code & duplication
- Removed 3 duplicated implementations each of avatar-URL resolution, Clearbit company-logo URL construction, and per-mentor rating aggregation across `mentor.repository.ts` — extracted into shared `resolveFileUrlOrEmpty`, `buildCompanyLogoUrl`, and `accumulateRatingsByMentor`/`averageRating` helpers.
- `mentors.service.ts`'s `updateMentor` was exported but only ever called internally by this same file — unexported.

### Verified, not changed
- SEO: fixed `MentorProfilePage`'s `og:image` to fall back to the site logo instead of rendering an empty `content` attribute when a mentor has no avatar. Confirmed canonical links, JSON-LD, and unique per-mentor meta descriptions are all correct; confirmed `<Link>` (real anchors) are used everywhere, no crawlability issues. **Known gap, out of Mentor-module scope**: the repo has no `sitemap.xml`/generator at all (site-wide, not mentor-specific) — flagged as a remaining blocker below.
- Auth flows: re-confirmed the public signup schema can never submit `role=mentor` (not just UI-hidden), mentor login is unaffected by the earlier signup change, `AuthContext`/route guards have no mentor-signup coupling, and `create-mentor` Edge Function remains the sole admin-provisioning path.
- Full browser verification via Playwright: public `/mentors` and `/mentors/:slug` pages, mobile (390px) and desktop (1440px) viewports, booking modal focus trap/restoration, FAQ accordion, tablist ARIA — zero console errors. Signup page re-confirmed student-only with the SkillGuru logo present.

### Remaining blockers
- None within Mentor module scope. Site-wide gap noted above (no sitemap) is pre-existing and outside this module's boundary — flagged for a future site-wide SEO pass, not a Mentor-module blocker.

## 2026-07-29 (Mentor Module Production Complete)

Final production-readiness pass across the entire Mentor module (public pages, admin management, mentor dashboard, student-facing mentor interactions). Full verification suite (`tsc --noEmit`, `eslint .`, `vitest run` — 63/63 passing, `npm run build`) is clean, and Supabase security advisors show zero ERROR-level findings for every mentor-related table/function.

### Fixed
- **Critical security bug**: `certificates`' RLS SELECT policy contained `(true OR ...)`, always evaluating true — every certificate row (verification code, and via joins, student identity) was publicly readable by anyone, not just the owning student/mentor/admin. Replaced with correctly scoped RLS (admin, own enrollment, or course mentor), and added a narrow `verify_certificate_by_code` SECURITY DEFINER RPC so the public "verify a certificate" page keeps working for anonymous visitors without exposing the full table.
- `hasCertificate`/`projectsCount` on the public mentor profile's "Courses Taught" section were hardcoded (`true`/`0`) — now sourced from real data via new `get_public_course_certificate_availability`/`get_public_course_project_counts` RPCs.
- Two invalid Tailwind classes (`md:row`) on `MentorCourses`/`MentorExperience` meant those cards never actually went horizontal on desktop.
- `reassignMentorCourses` looped one select + one update + one audit-log call per course sequentially — now a single batched select, single batched update, and parallelized audit logging.
- All 8 admin mentor CRM/Courses/Performance/Documents panels only handled `isLoading`, silently showing an empty state on a real fetch failure — all now show a distinct retry-capable error state.
- `admin-mentor-account` Edge Function's catch-all error handler returned raw DB/driver error text (constraint names, column names) to the client — now logs full detail server-side only and returns a generic message.
- `MentorsPage`/`MentorProfilePage`/`RelatedMentors` all silently swallowed real query failures as "no results", via services (`listCatalog`/`findRelated`) that discarded Supabase errors instead of throwing — now genuine failures throw and surface a distinct, retry-capable error state (not-found/empty state is now honest).
- FAQ accordion trigger had `focus:outline-none` with no replacement, removing all keyboard focus indication. Booking widget's date/time-slot toggle buttons had no `aria-pressed`. `MentorMentorshipProcess`'s ordered steps rendered as plain `div`s instead of a semantic `<ol>`/`<li>`.
- DB perf/security cleanup: `mentor_achievements`/`certifications`/`experience`/`projects` each had an overlapping `FOR ALL` write policy stacked on a `FOR SELECT` read policy, causing every SELECT to needlessly evaluate both policies — narrowed to INSERT/UPDATE/DELETE-only. Added 7 missing covering indexes for unindexed foreign keys (`mentor_documents`, `mentor_invites`, `mentor_notes`, `mentor_profiles.locked_by`).

### Added
- Dead code removed: `useCreateMentorProfile` (an audit-only no-op stub that faked success without creating anything), `MentorAnalytics.ts` (unused class, unrelated to the real, in-use `useMentorAnalytics` hook), and a duplicate unused `src/lib/query-client.ts` (the real one is `src/config/queryClient.ts`).
- SEO: canonical links and basic JSON-LD (`ItemList` on `MentorsPage`, `Person` on `MentorProfilePage`) via a new `useJsonLd` hook and canonical-link support in `usePageMeta`.
- Mentor's own "Tasks" tab on the Mentor Dashboard (admin-assigned tasks, status updates) — the CRM `tasks` table was already RLS-scoped to `assignee_id = auth.uid()` but had no mentor-facing UI.
- Student-facing "My Upcoming Sessions" view (list + cancel) on `StudentMentorsPage` — `listMyUpcomingBookings`/`cancelBooking` existed and were RLS-safe but orphaned from any UI.

## 2026-07-29 (continued)

### Changed
- Public Create Account page is now student-only — the "Mentor" signup option has been removed. Mentor accounts are provisioned exclusively by an admin via the Admin Dashboard (`create-mentor` Edge Function). Note: the backend (`handle_new_user()` DB trigger) always assigned the `student` role regardless of the client-submitted role field, so this closes a misleading UI, not an actual privilege-escalation bypass — verified via direct inspection of the live trigger definition.
- Added the official SkillGuru logo (via the existing shared `Logo` component) to Sign In, Sign Up, Verify Email, Force Password Change, and the two new Forgot/Reset Password pages, replacing an ad-hoc icon+text lockup on the auth page.

### Added
- `ForgotPasswordPage` (`/forgot-password`) and `ResetPasswordPage` (`/reset-password`) — the login form's "Forgot password?" link previously pointed to a route that didn't exist (a pre-existing dead link); both pages are now real, using the already-existing `authService.resetPassword` backend flow (`supabase.auth.resetPasswordForEmail`/`updateUser`), not new backend logic.

## 2026-07-29

### Added
- Enterprise Mentor Management Phase 1 (Account Ownership & Security): admin can set a mentor's password directly, force a password change on next login, force logout everywhere (revokes real `auth.refresh_tokens`), and lock/unlock an account independent of active/suspended status — all through a new `admin-mentor-account` Edge Function, all audited. New "Security" tab on `AdminMentorsPage.tsx` (login history, active sessions included).
- `IdentityService` now enforces `mentor_profile.login_disabled` at every identity load, not just at the admin action boundary.
- Enterprise Mentor Management Phase 2 (CRM & Operations): mentor-scoped internal notes, tasks (with type presets, priority, due dates, comments), meetings (mentor/student/internal/interview, scheduling + completion with outcome notes), a real activity timeline (audit log filtered per mentor), course ownership transfer with per-course audit logging, and an 11-metric performance dashboard. New "CRM", "Courses", and "Performance" tabs on `AdminMentorsPage.tsx`.

- Enterprise Mentor Management Phase 3 (Documents, Bulk Actions, Export): mentor document management with real version history (resume/certificate/agreement/identity/portfolio), reusing the existing private `admins` storage bucket and `files` table. Bulk mentor actions (activate/suspend/restore/delete/notify) and a bulk course-reassignment modal on `AdminMentorsPage.tsx`. Excel and PDF export alongside the existing CSV export.
- Public `MentorsPage.tsx` rewritten to query real mentor data instead of a hardcoded 4-mentor marketing array; removed two dead buttons and a fabricated testimonial.
- Accessibility pass across all new admin mentor UI (real Radix dialogs, proper tab/tablist ARIA, labeled inputs, aria-hidden icons) and the public mentor profile page (real breadcrumb links, dialog semantics on the mobile booking sheet, FAQ aria-expanded, Link instead of raw `<a>`).

### Fixed
- **Real, pre-existing bug**: `log_audit_event()` had been silently failing (`42703 column "details" does not exist`) since it was written in `20260718000005_enterprise_features.sql` — nothing had ever called it until this pass exercised it live. Fixed with an additive `audit_logs.details` column migration.
- **Real, pre-existing bug**: `notificationsService.sendNotification()` has been silently failing (`42501`) for every admin-initiated notification to another user since it was written — `notifications` never had an admin SELECT policy, and Postgres RLS requires `INSERT ... RETURNING` to satisfy the SELECT policy too. Fixed via an additive RLS policy widening.
- **Critical, pre-existing bug**: the public mentor profile page has shown "Mentor Not Found" (or an empty catalog) to every real anonymous visitor since it was built in Phase 1.19 — `profiles` never had a public SELECT policy. Fixed with a narrow, PII-safe RPC rather than widening `profiles` RLS. Found only because this pass did a genuinely signed-out live browser test instead of trusting an admin-session verification.
- Two related bugs found the same way: mentor "Students Mentored" stats always read 0 for anonymous visitors (`enrollments` has no public policy, by design — fixed with an aggregate-only RPC), and the mentor booking widget 401'd for every logged-out visitor (`get_mentor_available_slots` had no `anon` grant).

## 2026-07-27

### Added
- Real mentor profile content: `mentor_experience`, `mentor_projects`, `mentor_certifications`, `mentor_achievements` tables, with full mentor-side CRUD (Mentor Dashboard) and real public-profile rendering. See TASKS.md Phase 1.19, BUG_REPORT.md BUG-41.
- Real mentor session booking: `get_mentor_available_slots()` RPC, `book-mentor-session` Edge Function, real weekly availability management, real upcoming-sessions list with cancel.
- Real mentor account lifecycle: `status` (active/suspended) and `deleted_at` (soft delete/restore) on `mentor_profiles`, with genuine enforcement in `MentorProtectedRoute` (not just an admin-side badge). See BUG_REPORT.md BUG-06.
- Real video/PDF playback on the student Course Learning page, plus a real lesson-resources list. See BUG_REPORT.md BUG-43.
- `resolveFileUrl()` in `storage.service.ts` — unified public/signed file URL resolution from a `files.id`.

### Fixed
- BUG-41: `MentorProfilePage` was ~90% fabricated content (hardcoded education/certifications/projects, fake reviews attributed to invented student names) behind a real-looking DB-backed shell; "Book Session" was a `console.log`/`setTimeout` mock.
- BUG-42: lesson video/PDF uploads were foldered by `moduleId` instead of `courseId`, silently breaking the storage RLS policy that gates enrolled-student/mentor read access — no real user could ever read their own course media.
- BUG-06: the admin "suspend mentor" action overwrote the mentor's bio field instead of changing any real status; no soft-delete/restore existed.
- `MentorCard.tsx` rendered a broken `<img src="">` when no avatar URL exists; now falls back to initials.
- `MentorAchievements.tsx` silently dropped any achievement with an unrecognized icon instead of showing a fallback.
- `MentorCourses.tsx`'s course link used a dead `#/courses/:slug` hash path instead of the real `/courses/:slug` route.
- `MentorHero.tsx`'s "Book Counselling" and "Share Profile" buttons had no `onClick` handler at all.

### Removed
- `mentorProfileFactory.ts`, `mockMentorData.ts`, `mentor.mapper.ts` (mentor-profile feature — dead/fabricating code, zero real importers or superseded by real data).
- `src/repositories/mentors.repository.ts` (`MentorsRepository`) — fully dead duplicate of `mentors.service.ts`, zero importers.
- The old hard `deleteMentor()` (irreversible; replaced by soft-delete + restore).

### Documentation reclassified (audited, no code changes needed)
- Chat, Support, Assignments, and the student-facing Mentors listing were marked "Unclear" in `FEATURE_STATUS.md` — confirmed genuinely real (Supabase reads/writes, no fake-success paths) and reclassified to "Complete".

### Added (continued)
- Real mentor "reply to reviews": `mentor_reply`/`mentor_replied_at` on `testimonials`, a `reply_to_testimonial()` RPC enforcing course ownership server-side, a new Mentor Dashboard "Reviews" tab, and the reply now shows on the public mentor profile.
- Real Wishlist: `useWishlist.ts` hooks, a working toggle on `CourseDetailsPage`, and a new `/dashboard/wishlist` page — the backend (`commerce.service.ts`) already existed but had no UI at all.

### Fixed (continued)
- BUG-44: "Continue Learning" always resumed at a course's first lesson regardless of real progress (a confirmed stub) — now resumes at the actual first-incomplete lesson using real `lesson_progress` data, with a real mentor name and real module-completion counts.
- BUG-45: Wishlist button was permanently disabled ("Coming Soon") despite a fully working backend.
- BUG-46: the dashboard sidebar's "Level 12 / 80% / 24 MB Storage / Daily Goal: Done" panel was entirely fabricated (no backing schema) — replaced with real enrolled-course/certificate counts.
- BUG-47: quiz/mock-test lessons had zero real UI on either side, a broken lesson linkage, a real enrollment-id bug, and an RLS leak exposing quiz answer keys to any authenticated user. Fixed all four; built real mentor authoring and student quiz-taking with server-side scoring.

### Added (continued, quiz feature)
- Real quiz/mock-test authoring (mentor) and taking (student): `quizzes.lesson_id`, tightened RLS, `submit_quiz_attempt()` server-side scoring RPC, `quiz-authoring.service.ts`, a "Manage Quiz" panel in the Course Builder, and a real quiz-taking flow on the Course Learning page.

### Fixed (continued)
- BUG-48: Student Profile avatar upload targeted a nonexistent `avatars` storage bucket (every real upload failed silently), rendered the avatar via a broken file-ID-as-storage-path URL, and showed a false "success" toast before the save mutation even ran. Fixed to reuse the canonical `storage.service.ts` upload pipeline and `resolveFileUrl()`, with real success/error handling.
- BUG-49: the Learning Analytics weekly study-hours chart was a permanent "coming in a future release" placeholder with a decorative, non-functional range dropdown, despite real per-lesson `lesson_progress.time_spent_seconds` data already existing. Built a real weekly/monthly aggregation and a genuinely functional range dropdown.

### Added (continued, Notes feature)
- Real student Notes — previously entirely unbuilt (no table/service/UI). New `lesson_notes` table (owner-only RLS, one note per student/lesson, soft-delete), an inline "My Notes" panel on the Course Learning page, and a new `/dashboard/notes` page listing every note across all courses with delete. Real sidebar nav entry (`My Notes`). Live-verified: owner-only read/write, non-owner sees zero rows and cannot forge an insert under another student's ID.

### Added (continued, Placement Module - enterprise rebuild)
- Full enterprise Placement Management System, previously entirely unbuilt (both the admin page and the student sidebar tab already honestly said so). Nine new tables (`hiring_partners`, `job_postings`, `placement_applications`, `application_documents`, `interview_rounds`, `interview_feedback`, `placement_offers`, `placement_status_history`, `saved_placements`) and 7 SECURITY DEFINER pipeline RPCs (`apply_to_job`, `withdraw_application`, `advance_application_stage`, `schedule_interview_round`, `record_interview_feedback`, `release_offer`, `mark_placement_joined`). Reuses `meetings` for interview scheduling, `notifications` for student alerts, and `storage.service.ts`/`files` for resumes and offer letters - no duplicate infrastructure.
- Rebuilt `AdminPlacementsPage.tsx`: Hiring Partners CRUD, Job Postings CRUD, and a full Applications pipeline view with a per-application action drawer (shortlist, reject, schedule interview, record feedback, release offer, mark joined) and a real status-history audit trail.
- New `pages/student/PlacementsPage.tsx` at `/dashboard/placement` (sidebar entry flipped from `disabled: true` to real): browse/search/filter/save/apply, application tracking + withdraw, upcoming interviews, and offer/placement history.
- Live-verified the entire pipeline (apply → shortlist → interview → feedback → select → offer → joined) in one rolled-back transaction, confirming strict per-student data isolation at every stage.

### Added (continued, Resume Builder)
- Real Resume Builder, previously entirely unbuilt. Reuses `profiles`/`student_profiles` for contact/summary/education/skills (their first real edit UI in the app) and adds new owner-scoped tables (`resume_experience`, `resume_projects`, `resume_certifications`, `resume_achievements`) for the genuinely list-shaped sections. New `/dashboard/resume-builder` page with Edit and Preview tabs; PDF export via the browser's native print-to-PDF, no new dependency.
- New `upsert_my_student_profile()` SECURITY DEFINER RPC, hardcoded to `auth.uid()`, fixing a real gap caught during live verification: `student_profiles` (like `mentor_profiles`) is admin-insert-only by RLS, so a student could never create their own row directly before this.

### Added (continued, AI Career Guidance)
- Real AI Career Guidance, previously entirely unbuilt for students. New `career-guidance` Edge Function reuses the AI Voice Agent's `AIProvider`/`GeminiProvider` abstraction and the existing `GEMINI_API_KEY` secret (no new credential). Grounds every output in real resume/enrollment/course data fetched server-side, and cross-checks recommended course IDs against the real catalog after generation - any invented ID is dropped before the report is ever saved.
- New `career_guidance_reports` table (owner-only SELECT RLS, no direct write policy - written only by the Edge Function's service-role client) and a new `/dashboard/career-guidance` page (generate + history).
- Live-verified the table's RLS (owner sees their reports, a different student sees none, direct client inserts rejected). The deployed Edge Function itself has not yet been exercised via a real authenticated browser session in this environment - flagged as the one remaining verification step before calling this fully production-validated.

### Added (continued, Phase 2 design system foundation)
- Extended the existing `docs/DESIGN_SYSTEM.md` (didn't rebuild it - it already had a solid tokens + primitives foundation from 2026-07-24): added motion tokens, a `dataviz`-skill-validated chart categorical palette (`--chart-1..8`), and new primitives (`Avatar`, `Tooltip`, `Popover`, `Switch`, `Separator`, a `Form` wrapper, a `Chart` wrapper for recharts).
- Extracted `Breadcrumbs` out of `AdminPage.tsx` into a reusable `src/components/common/Breadcrumbs.tsx`.
- New `docs/REDESIGN_ROADMAP.md` - full page inventory (Student/Mentor/Admin/Marketing/Auth) and the prioritized redesign order for Phase 2. No pages were redesigned in this pass - foundation and planning only.

### Added (continued, Phase 2 page redesign: Authentication + Dashboard Layout)
- Redesigned the Authentication group onto design tokens, with real keyboard/ARIA support for the tab switcher and role selector, and a `--destructive-text` token added after an independent accessibility review found a real contrast failure.
- Redesigned the Student and Admin dashboard shells: new shared `useTheme()` hook + anti-FOUC init script (fixes a real bug - dark mode never survived a page refresh), two previously-disabled Student topbar buttons wired to real features (dark mode, chat), an unbacked gamification block removed, "Skip to content" links added to both shells.
- Fixed a real cross-feature data bug: student onboarding (`ProfileCompletionPage`) wrote education/skills to a column nothing reads, instead of the columns the Resume Builder/AI Career Guidance actually use.

### Added (continued, Phase 2 page redesign: Student Dashboard)
- Redesigned every page in the Student Dashboard group onto design tokens with `focus-visible` rings and ARIA attributes (`aria-hidden`/`aria-label`/`aria-current`/`aria-expanded`) throughout, including the 5 features built earlier this session (Notes, Wishlist, Placements, Resume Builder, AI Career Guidance) that were previously styled inline per-feature rather than against the unified system.
- `CourseLearningPage.tsx`'s quiz result panel now announces pass/fail to screen readers (`role="status"` + focus move to heading) and its question groups use `<fieldset>`/`<legend>` instead of plain `<div>`s.

### Fixed (continued, Student Dashboard redesign)
- Three dead buttons with no click handler at all (`MissionControlHero`'s "Resume" button, `TodaysFocus`'s "Start" button, `ContinueLearning`'s "Continue Learning" button) now link to the real course; `MissionControlHero`'s unbacked "View Roadmap" button removed entirely.
- `MyCoursesPage` hardcoded every course's progress at 0% regardless of real completion — now merges real `course_progress` data via `useStudentCourses`.
- `MyCoursesPage` course thumbnails 404'd (hand-built URL against a private storage bucket) — now resolved via `resolveFileUrl()`.
- `PaymentHistoryPage`'s "Download" invoice button called `alert()` — the backing Edge Function is undeployed and references a nonexistent column (pre-existing gap); converted to an honestly-disabled state instead of building the full feature out of scope.
- `SupportPage` rendered internal-only ticket messages with `opacity-0` (invisible but still taking up layout space) — now filtered out before render.

### Added (continued, Phase 2 page redesign: Mentor Dashboard)
- Extracted `MentorDashboardShell` (`src/components/mentor/layout/`) out of `MentorDashboardPage.tsx`, mirroring the Student/Admin shell pattern — adds a skip-to-content link and the Mentor dashboard's first-ever dark-mode toggle (wired to the shared `useTheme()` hook).
- Split `MentorDashboardPage.tsx`'s 8 tabs (Overview, Assigned Courses, Course Builder, Students, Reviews, Analytics, Notifications, Profile) into 8 separate components under `src/components/mentor/dashboard/` — the page itself dropped from 624 lines to a thin composition.
- Migrated hand-rolled status-color spans (course/enrollment/review-approval badges, analytics stat colors) onto the shared `Badge` component and `text-success`/`text-warning` tokens; added `Skeleton` loading states in place of plain "Loading..." text.
- Accessibility: `role="tablist"`/`aria-selected` on the Profile sub-tab switcher, `aria-current="page"` on the active dashboard tab, `scope="col"` on the Students table, `<label htmlFor>` associations on the profile edit form, `aria-hidden` and `focus-visible` rings added throughout.

### Added (continued, Phase 2 page redesign: Admin Dashboard)
- Rebuilt `AdminAssignmentsPage`, `AdminAuditLogsPage`, and `AdminInvitationsPage` onto the shared `DataTable` component (column defs, sortable/filterable headers, CSV export) — closing the remaining migration gaps left from the 2026-07-24 Admin pass.
- `AdminCalendarPage`, `AdminChatPage`, and `AdminSupportPage` (not tabular, or a card list with a detail drawer) got the same token/Badge/accessibility treatment instead of a forced `DataTable` conversion.
- Removed `GsapReveal` from every Admin page that still had it — GSAP reveals are reserved for the marketing site; dashboard surfaces don't use marketing-style entrance animation.
- Replaced every hand-rolled status/priority/category color span with the shared `Badge` component across all 6 pages touched.
- Accessibility: `aria-label` on icon-only buttons, `<label htmlFor>` associations on previously-unassociated form inputs, `aria-current`/`aria-pressed` on active filters, modal backdrops migrated to the `bg-foreground/40` token.

### Added (continued, Phase 2 page redesign: Course Pages)
- Migrated `AdminCoursesPage.tsx`'s slide-out course editor drawer onto design tokens (the list view was already migrated 2026-07-24, but the drawer still had extensive hardcoded slate/cyan literals).
- `CoursesPage.tsx`/`CourseDetailsPage.tsx` kept their intentional public-marketing conventions (hex brand colors, `GsapReveal`) matching `HomePage.tsx`'s established precedent — no token migration applied there by design.

### Fixed (continued, Course Pages redesign)
- `CoursesPage.tsx`'s counselling lead-capture modal faked a success toast with zero backend call and unlabeled form inputs — wired to the real `submitLead()` service (matching `ContactPage.tsx`'s convention), with email and consent fields added to satisfy the real lead schema.
- `CoursesPage.tsx`'s expandable category header was a `<div onClick>` — unreachable by keyboard, invisible to screen readers as a control — converted to a real `<button aria-expanded>`.
- `CourseDetailsPage.tsx`'s hero thumbnail was built from a hand-rolled URL against a private/mismatched storage bucket — same class of bug already fixed once this session in `MyCoursesPage` — fixed via `resolveFileUrl()`.
- `CourseDetailsPage.tsx`'s "Play course preview" button had no `onClick` and no backing course-level video field exists — removed rather than left as fake chrome.
- `CourseDetailsPage.tsx`'s four "Share This Course" icons were inert `<span>`s — wired to a real native-share/clipboard handler (mirroring `MentorHero.tsx`) plus real Facebook/Twitter/LinkedIn share-intent links.
- Neither `CoursesPage.tsx`'s counselling modal nor `AdminCoursesPage.tsx`'s editor drawer had a real focus trap, initial focus on open, or working Escape-to-close (the `onKeyDown` handler was scoped to a subtree focus never actually entered) — rebuilt both onto real `@radix-ui/react-dialog` primitives.
- `AdminCoursesPage.tsx`'s row action menu (Edit/Duplicate/Publish/Archive/Delete) was a hand-rolled menu with no `role="menu"`, no arrow-key navigation, and a DOM-order bug putting an invisible full-screen button before the real menu items in tab order — replaced with the real `DropdownMenu` primitives already used correctly elsewhere in the same file's `DataTable`.
- `CoursesPage.tsx` used several custom Tailwind shade classes (`slate-450`/`-350`/`-850`/`-150`) that don't exist in this project's color scale and were silently compiling to no CSS at all — normalized to real scale steps.
