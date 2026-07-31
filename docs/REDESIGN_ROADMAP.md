# SkillGuru — Phase 2 Redesign Roadmap

_Written 2026-07-27. This is the page inventory and redesign sequencing for Phase 2 (Enterprise UI/UX redesign), per explicit direction: build the design system foundation first (`docs/DESIGN_SYSTEM.md`), audit and group every page, then redesign incrementally in the order below. **No page redesign has started yet** — this document is the plan, not a log of completed work. As each page/group is redesigned, its row moves from "Not started" to a dated "Migrated" status, following the same convention as `DESIGN_SYSTEM.md` § 8's existing migration log._

Every page redesign must follow `docs/DESIGN_SYSTEM.md` exactly (tokens, primitives, motion, chart, iconography rules) — no independent styling decisions per page, and **no redesign may change or regress existing functionality**: if a redesign pass finds a real bug or fake element, it gets its own `BUG-N` entry in `docs/BUG_REPORT.md` and is fixed as a data/logic fix, not folded silently into a "visual" changelog line.

---

## Full page inventory, grouped

### Authentication
| Page | File | Current state |
|---|---|---|
| Sign in / sign up | `src/pages/AuthPage.tsx` | Real, uses `react-hook-form` already (only page that does) |
| Admin login | `src/pages/AdminLoginPage.tsx` | Real |
| Force password change | `src/pages/ForcePasswordChangePage.tsx` | Real |
| Verify email | `src/pages/VerifyEmailPage.tsx` | Real |
| Profile completion (post-signup onboarding) | `src/pages/student/ProfileCompletionPage.tsx` | Real |

### Dashboard Layout (shells — not content pages)
| Shell | Files | Current state |
|---|---|---|
| Student shell | `src/components/dashboard/layout/{DashboardShell,DashboardSidebar,DashboardTopbar,NotificationBell}.tsx` | Real, already on design tokens from earlier phases |
| Admin shell | `src/pages/AdminPage.tsx` | Real, migrated to tokens 2026-07-24 (see `DESIGN_SYSTEM.md` § 7) |
| Mentor shell | Embedded inside `src/pages/MentorDashboardPage.tsx` (not a separate shell component) | **Real but structurally inconsistent** — the only one of the three shells not extracted into its own reusable layout component. Extracting a `MentorDashboardShell` (mirroring the student `DashboardShell` pattern) is part of this redesign step, not a new feature — same sidebar/topbar/breadcrumb composition as the other two shells, using the newly-extracted `Breadcrumbs` component. |

### Student
| Page | File | Current state |
|---|---|---|
| Dashboard home | `src/pages/DashboardPage.tsx` | Real (Phase 2.0, 2026-07-27) |
| My Courses | `src/pages/student/MyCoursesPage.tsx` | Real |
| Course Learning | `src/pages/student/CourseLearningPage.tsx` | Real, video/PDF player + quiz + notes panel all real |
| My Certificates / Certificate View | `src/pages/student/{MyCertificatesPage,CertificateViewPage}.tsx` | Real |
| Payment History | `src/pages/student/PaymentHistoryPage.tsx` | Real (mock payment provider) |
| Profile Settings | `src/pages/student/ProfileSettingsPage.tsx` | Real, fixed 2026-07-27 (BUG-48) |
| Chat / Support / Assignments | `src/pages/student/{ChatPage,SupportPage,AssignmentsPage}.tsx` | Real |
| Mentors (student-facing) | `src/pages/student/StudentMentorsPage.tsx` | Real |
| Wishlist | `src/pages/student/WishlistPage.tsx` | Real, new 2026-07-27 |
| My Notes | `src/pages/student/NotesPage.tsx` | Real, new 2026-07-27 |
| Placements | `src/pages/student/PlacementsPage.tsx` | Real, new enterprise feature 2026-07-27 |
| Resume Builder | `src/pages/student/ResumeBuilderPage.tsx` | Real, new 2026-07-27 |
| AI Career Guidance | `src/pages/student/CareerGuidancePage.tsx` | Real, new 2026-07-27 (Edge Function E2E click-through still pending, see `TASKS.md`) |

### Mentor
| Page | File | Current state |
|---|---|---|
| Mentor Dashboard (all tabs: Overview, Courses, Students, Analytics, Profile, Reviews) | `src/pages/MentorDashboardPage.tsx` | Real, rebuilt 2026-07-24 through 2026-07-27 — a single large file covering every tab; splitting tab content into separate components is an in-scope cleanup for this redesign pass, not a new requirement |
| Public Mentor Profile | `src/pages/MentorProfilePage.tsx` | Real, full rebuild 2026-07-27 (was ~90% fabricated, see BUG-41) — grouped under Marketing below since it's public-facing, not behind mentor auth |

### Admin
| Page | File | Current state |
|---|---|---|
| Dashboard | `src/pages/AdminDashboardPage.tsx` | Real, migrated to tokens 2026-07-24 |
| Students | `src/pages/AdminStudentsPage.tsx` | Real, migrated 2026-07-24 (was 100% fabricated, BUG-29) |
| Mentors | `src/pages/AdminMentorsPage.tsx` | Real, migrated 2026-07-24, extended 2026-07-27 (suspend/delete/restore) |
| CRM | `src/pages/AdminCRMPage.tsx` | Real, partially migrated 2026-07-24 |
| Courses | `src/pages/AdminCoursesPage.tsx` | Real, migrated 2026-07-24 (BUG-31) |
| Payments / Coupons / Refunds | `src/pages/Admin{Payments,Coupons,Refunds}Page.tsx` | Real, Payments migrated 2026-07-24 |
| Certificates | `src/pages/AdminCertificatesPage.tsx` | Real, migrated 2026-07-24 |
| Notifications | `src/pages/AdminNotificationsPage.tsx` | Real, migrated 2026-07-24 (BUG-34) |
| Settings | `src/pages/AdminSettingsPage.tsx` | Real, migrated 2026-07-24 (BUG-34, was a full no-op) |
| CMS | `src/pages/AdminCMSPage.tsx` | Blogs tab is an honest stub (BUG-37) — real content elsewhere on the page |
| Role & Operators | `src/pages/AdminRolePage.tsx` | Real, migrated 2026-07-24 |
| System Health | `src/pages/AdminSystemHealthPage.tsx` | Real, migrated 2026-07-24 |
| Success Stories | `src/pages/AdminSuccessStoriesPage.tsx` | Real, rewritten 2026-07-24 (BUG-35) |
| Placements | `src/pages/AdminPlacementsPage.tsx` | Real, full enterprise rebuild 2026-07-27 |
| AI Guidance | `src/pages/AdminAIGuidancePage.tsx` | **Honest stub** (BUG-36) — no assessments table/n8n integration exists; out of scope until a business decision on what this admin surface should actually do |
| Analytics | `src/pages/AdminAnalyticsPage.tsx` | Real |
| Assignments | `src/pages/AdminAssignmentsPage.tsx` | Real |
| Audit Logs | `src/pages/AdminAuditLogsPage.tsx` | Real |
| Calendar | `src/pages/AdminCalendarPage.tsx` | Real |
| Chat | `src/pages/AdminChatPage.tsx` | Real |
| Invitations | `src/pages/AdminInvitationsPage.tsx` | Real |
| Knowledge Base | `src/pages/AdminKnowledgeBasePage.tsx` | Real (AI voice agent RAG source management) |
| Resource | `src/pages/AdminResourcePage.tsx` | Real |
| Support | `src/pages/AdminSupportPage.tsx` | Real |

### Marketing / Public
| Page | File | Current state |
|---|---|---|
| Home | `src/pages/HomePage.tsx` | Real, marketing hero conventions (GSAP reveals, gradients) intentionally scoped here per `DESIGN_SYSTEM.md` § 1 |
| About | `src/pages/AboutPage.tsx` | Real |
| Contact | `src/pages/ContactPage.tsx` | Real |
| Courses (public catalog) | `src/pages/CoursesPage.tsx` | Real |
| Course Details (public) | `src/pages/CourseDetailsPage.tsx` | Real, real wishlist toggle added 2026-07-27 |
| Mentors (public directory) | `src/pages/MentorsPage.tsx` | Real |
| Mentor Profile (public) | `src/pages/MentorProfilePage.tsx` | Real, full rebuild 2026-07-27 (BUG-41) |
| Placements (marketing lead-capture) | `src/pages/PlacementsPage.tsx` | Real — **distinct from** `src/pages/student/PlacementsPage.tsx` (the real student job-application feature); this one is success-story/lead-gen marketing content |
| Placement Story | `src/pages/PlacementStoryPage.tsx` | Real |
| Success Stories | `src/pages/SuccessStoriesPage.tsx` | Real |
| Blog / Blog Details | `src/pages/{BlogPage,BlogDetailsPage}.tsx` | Real |
| AI Career Guidance (marketing lead-capture) | `src/pages/GuidancePage.tsx` | Real — **distinct from** `src/pages/student/CareerGuidancePage.tsx` (the real authenticated student feature); this one is the public AI voice-agent lead-capture experience |
| Legal | `src/pages/LegalPage.tsx` | Real |
| 404 | `src/pages/NotFoundPage.tsx` | Real |
| Verify Certificate (public) | `src/pages/VerifyCertificatePage.tsx` | Real |
| Payment Success / Failed | `src/pages/Payment{Success,Failed}Page.tsx` | Real |

---

## Progress

| Step | Status |
|---|---|
| 1. Authentication | **Migrated 2026-07-27** — see notes below |
| 2. Dashboard Layout | **Migrated 2026-07-27** (Student + Admin shells; Mentor shell extraction deferred to step 4 per original sequencing) |
| 3. Student Dashboard | **Migrated 2026-07-27** — every page in the Student group, see notes below |
| 4. Mentor Dashboard | **Migrated 2026-07-27** — shell extracted, tabs split into components, see notes below |
| 5. Admin Dashboard | **Migrated 2026-07-27** — remaining `DataTable`/token gaps closed, see notes below |
| 6. Course Pages | **Migrated 2026-07-27** — see notes below |
| 7-10 | Not started |

### 1. Authentication — what changed
- `AuthPage.tsx`: replaced every hardcoded hex color (`#111e79`, `#5b35f2`, `#19c7c8`, `#0c1660`, `#f8faff`, `#0f172a`) with design tokens; migrated hand-rolled inputs onto the `Input`/`Label` primitives; added a real `<h1>` (page previously had none); added `role="tablist"`/`role="tab"`/`aria-selected` with full roving-tabindex + arrow-key keyboard support for the Sign In/Create Account switcher; converted the student/mentor role selector from a manually-ARIA'd button pair to native `<input type="radio">` (gets keyboard behavior for free per ARIA APG, styled as cards via `has-[:focus-visible]`); moved focus to the heading on tab change so screen readers announce the mode switch; added `focus-visible` rings to every plain-text link/button that was missing one; removed decorative emoji from headings/toasts for a more restrained enterprise tone.
- `ForcePasswordChangePage.tsx` / `VerifyEmailPage.tsx`: same hex→token migration; added inline field-level error state with `aria-invalid`/`aria-describedby`/`role="alert"` (previously toast-only, easy for screen reader users to miss and impossible to associate with a specific field); added `noValidate` + `aria-controls` on the shared password-visibility toggle.
- `student/ProfileCompletionPage.tsx`: same hex→token migration onto `Input`/`Label`. **Real bug found and fixed**: the form wrote education/skills into `profiles.metadata` (a jsonb blob nothing in the app ever reads back from) instead of `student_profiles.education`/`skills` (what the Resume Builder and AI Career Guidance actually read) — a student who completed onboarding got none of that data reflected anywhere. Fixed to call the same `upsert_my_student_profile` RPC the Resume Builder uses.
- New shared `--destructive-text` token (`globals.css`) — a darker step for small destructive-colored *text* specifically. Live contrast check (per the accessibility review below) found `--destructive` (#EF4444) on the white card surface is ≈3.76:1 for `text-xs font-semibold`, under the 4.5:1 AA threshold for small text, even though it's fine for icon/border/fill use (3:1 UI-component threshold). Applied to `ui/form.tsx`'s `FormMessage`/`FormLabel` and every inline error message in the Auth group.
- **Independent accessibility review** (via the accessibility-lead agent) confirmed the ARIA wiring, then found the above contrast issue plus the missing keyboard model on the tab/radio widgets (now fixed) and several missing `focus-visible` rings on plain-text links (now fixed). One review finding intentionally not pursued as a full rebuild: `ProfileCompletionPage`'s and `ForcePasswordChangePage`'s single-required-field forms don't warrant the same depth of inline-error architecture as `AuthPage`'s multi-field forms — `ForcePasswordChangePage` did get inline errors since its validation logic already existed and just needed to move from toast to field-level; `ProfileCompletionPage` has no client-side validation to surface (a real gap, but a separate task from this redesign pass).

### 2. Dashboard Layout — what changed
- **Real bug found and fixed**: the Admin shell's dark-mode toggle set `localStorage.theme` but nothing ever read that key back on page load (no init script existed anywhere) — a hard refresh silently reverted to light mode despite the stored preference. Fixed at the root: added a tiny inline anti-FOUC script in `index.html` that applies the persisted (or OS-preferred) theme before first paint, and extracted a shared `useTheme()` hook (`src/hooks/useTheme.ts`) that both the Admin and Student shells now use — no more per-shell reimplementation.
- **Two disabled Student topbar buttons wired to real, already-existing features** instead of staying permanently fake: the Sun/Moon icon now toggles real dark mode (previously always disabled with a "Coming in a future release" tooltip, even though dark mode has been fully implemented since the 2026-07-24 Admin pass), and the message icon now navigates to the real `/dashboard/chat` page (previously disabled, even though student chat has been a real, working feature since Phase 1.20).
- **Removed the Streak/XP "Coming in a future release" block** from the Student topbar entirely, rather than leaving it as permanent decorative dead chrome — no real gamification system exists to back it, matching the exact precedent already set for the sidebar's similar fabricated panel (BUG-46).
- Added a "Skip to content" link (already existed on the marketing `Navbar`, previously absent from all three dashboard shells) to both the Student and Admin shells.
- `DashboardSidebar.tsx`: consolidated 6 separate `<nav>` elements (one per group) into a single `<nav aria-label="Dashboard">` wrapping all groups (multiple `<nav>` landmarks with no distinguishing labels was confusing for screen reader users navigating by landmark); added `aria-current="page"` to the active link; `aria-hidden="true"` on every decorative icon; `aria-disabled="true"` + a visually-hidden "(coming in a future release)" hint on disabled nav items.

### 3. Student Dashboard — what changed
- Full hex/slate→token migration and accessibility pass across every page in the Student group: `DashboardPage`, `MyCoursesPage`, `CourseLearningPage`, `MyCertificatesPage`/`CertificateViewPage`, `PaymentHistoryPage`, `ProfileSettingsPage`, `ChatPage`/`SupportPage`/`AssignmentsPage`, `StudentMentorsPage`, `WishlistPage`, `NotesPage`, `PlacementsPage`, `ResumeBuilderPage`, `CareerGuidancePage`. Print-output content (`ResumeBuilderPage`'s `#resume-preview`, `CertificateViewPage`) deliberately kept raw slate/white literals so printed output looks identical regardless of the viewer's current theme — a considered exception, not an oversight. Video/PDF player chrome in `CourseLearningPage` similarly kept a fixed dark background, matching how media players conventionally stay dark regardless of site theme.
- **Three dead buttons with zero click handlers fixed**, all wired to real course links instead: `MissionControlHero`'s "Resume: {title}" button, `TodaysFocus`'s "Start" button, `ContinueLearning`'s "Continue Learning" button. `MissionControlHero`'s "View Roadmap" button was removed entirely since no real destination exists for it.
- **`MyCoursesPage` hardcoded 0% progress on every course** regardless of real completion — fixed by extending `useStudentCourses` to also fetch and merge real `course_progress` rows.
- **`MyCoursesPage` course thumbnails 404'd** — built via a hand-rolled URL against the private `courses` storage bucket — fixed to use `resolveFileUrl()`, the established storage-resolution helper.
- **`PaymentHistoryPage`'s "Download" invoice button called `alert()`** — investigated the real backing Edge Function and found it references a nonexistent `invoices.user_id` column and isn't deployed (a pre-existing Phase 5 gap). Converted to an honestly-disabled state with an explanatory `title`, rather than faking it further or building the full feature out of scope for a redesign pass.
- **`SupportPage`'s internal-only ticket messages rendered with `opacity-0`** — invisible but still occupying layout space, producing unexplained gaps in the thread. Fixed by filtering them out before render.
- **`CourseLearningPage`**: migrated to tokens throughout; quiz result panel now uses `role="status"` and moves focus to its heading so screen readers announce pass/fail; quiz questions converted from plain `<div>`/label groups to `<fieldset>`/`<legend>` for correct grouping semantics; module expand/collapse now exposes `aria-expanded`/`aria-controls`; the sidebar progress bar and lesson list both carry proper `role="progressbar"`/`aria-current`; focus-visible rings added throughout (back link, module toggles, lesson buttons, resource links, notes controls).
- Admin dark-mode toggle, topbar buttons, and sidebar gamification block were already fixed in the Dashboard Layout step above and carried forward unchanged.
- Full verification suite (`tsc`/`eslint`/`vitest`/`build`) green after every batch in this step, per the non-negotiable per-page gate.

### 4. Mentor Dashboard — what changed
- **Extracted `MentorDashboardShell`** (`src/components/mentor/layout/MentorDashboardShell.tsx`), mirroring the Student/Admin shell pattern: the previous inline header + tab-sidebar in `MentorDashboardPage.tsx` is now a reusable shell component with a skip-to-content link and a real dark-mode toggle wired to the shared `useTheme()` hook — the Mentor dashboard previously had **no** dark-mode toggle at all, unlike the Student/Admin shells.
- **Split `MentorDashboardPage.tsx`'s 8 tabs into 8 separate components** (`src/components/mentor/dashboard/{Overview,Courses,CourseBuilder,Students,Reviews,Analytics,Notifications,Profile}Tab.tsx`) — the page itself dropped from 624 lines to a thin composition. No tab content changed, only file location.
- Raw color migration: course-status/enrollment-status/review-approval badges (previously hand-rolled `bg-emerald-100 text-emerald-800`/`bg-blue-100 text-blue-700`/`bg-amber-100 text-amber-700` spans) now use the shared `Badge` component with `success`/`warning`/`info` variants; analytics stat colors (`text-emerald-600`, `text-amber-500`) migrated to `text-success`/`text-warning`; loading-state text migrated off `text-slate-400` onto `text-muted-foreground`, and skeleton loading states (`Skeleton` component) replace plain "Loading..." text for Overview/Courses/Course Builder/Students/Reviews/Analytics/Profile.
- Accessibility: `aria-hidden="true"` added to all decorative icons across every tab; `StudentsTab`'s table now has `scope="col"` on headers and a horizontal-scroll wrapper; `ProfileTab`'s sub-tab switcher now uses `role="tablist"`/`role="tab"`/`aria-selected`; the shell's tab nav uses `aria-current="page"` on the active tab instead of styling-only state; `ProfileBasicInfo`'s form inputs got proper `<label htmlFor>` associations (previously unassociated `<label>` text); `focus-visible` rings added to every interactive element that was missing one (course-builder cards, reply/cancel buttons, back-to-list link).
- Full verification suite (`tsc`/`eslint`/`vitest`/`build`) green after the extraction, matching the non-negotiable per-group gate.

### 5. Admin Dashboard — what changed
- Closed the remaining `DataTable` migration gaps from `docs/DESIGN_SYSTEM.md` § 8: `AdminAssignmentsPage`, `AdminAuditLogsPage`, and `AdminInvitationsPage` were rebuilt onto the shared `DataTable` component (column defs, sortable/filterable headers, CSV export), matching the exact convention already established by `AdminStudentsPage`/`AdminMentorsPage`. `AdminCalendarPage` and `AdminChatPage` are not tabular (a month grid and a chat thread) and `AdminSupportPage`'s ticket list stays a card list (it opens into a detail drawer, not a row-drill-down) — all three instead got the same token/Badge/accessibility pass as the DataTable pages, matching the precedent already set for the student `SupportPage`.
- **Removed `GsapReveal` from every Admin page that had it** (`AdminAssignmentsPage`, `AdminAuditLogsPage`, `AdminCalendarPage`, `AdminInvitationsPage`, `AdminKnowledgeBasePage`, `AdminSupportPage`) — GSAP reveals are reserved for the marketing site per `DESIGN_SYSTEM.md`'s two-motion-system rule; dashboard surfaces use Framer Motion (for the modals/drawers, which already did) or no entrance animation at all.
- Replaced every hand-rolled status/priority/category color map (`STATUS_STYLES`, `PRIORITY_STYLES`, `ACTION_COLORS`, raw `bg-emerald-100 text-emerald-800`-style spans) with the shared `Badge` component across all 6 pages — same `success`/`warning`/`destructive`/`info`/`muted` variant vocabulary used everywhere else in the app.
- Headings migrated off `text-primary dark:text-cyan-200` (an inconsistent one-off not used anywhere else in the already-migrated Admin pages) onto the standard `text-foreground`.
- Accessibility: `aria-hidden` on decorative icons throughout; `aria-label` on every icon-only button (modal close buttons, calendar prev/next, send message); proper `<label htmlFor>` associations added to every previously-unassociated form input (Calendar event modal, Invitations invite modal, ticket status/reply controls); `role="group"`/`aria-pressed` on the calendar color-swatch picker; `aria-current`/`aria-pressed` on selected/active list items and filter chips; modal backdrops migrated from `bg-black/40`-`50` to the `bg-foreground/40` token.
- Full verification suite (`tsc`/`eslint`/`vitest`/`build`) green; ESLint warning count dropped from 61 to 49 (incidental unused-import cleanup while touching these files).

### 6. Course Pages — what changed
- **`AdminCoursesPage.tsx`**: closed a real gap left from the 2026-07-24 pass — the list/`DataTable` view was already migrated, but the slide-out course editor drawer (basic info/curriculum/pricing/SEO/mentors/media tabs, ~370 lines) still had extensive hardcoded `slate-*`/`cyan-*` hex-adjacent literals and explicit `dark:` overrides throughout. Migrated the entire drawer onto tokens (`border-border`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`) so it no longer needs manual dark-mode overrides at all; converted the status column and action-menu color-by-state text (Publish/Archive/Delete) onto `Badge`/token vocabulary; converted the drawer's section switcher to `role="tablist"`/`role="tab"`/`aria-selected`; added `<label htmlFor>` associations to every previously-unassociated form field; changed the thumbnail file input from `hidden` to `sr-only` (keyboard-reachable, matching the `ResumeBuilderPage` precedent) with a `has-[:focus-visible]:ring-2` wrapper.
- **`CoursesPage.tsx`** (public marketing course catalog): kept its established marketing-page conventions (hex brand colors, `GsapReveal`, gradients) since this page is public/marketing-facing, matching `HomePage.tsx`'s already-accepted pattern — token migration does not apply here, per `DESIGN_SYSTEM.md`'s marketing-hero exception. **Real bug found and fixed**: the "Book Free Counselling" modal's submit handler called `toast.success(...)` unconditionally with zero backend interaction — it never called the `submitLead()` service every other lead form in the app uses (`ContactPage`, `PlacementStoryPage`), and its inputs had no `name` attributes so no data could even be extracted. Added an email field and a consent checkbox (both required by the real lead schema), wired the form to `submitLead("contact", ...)` with real loading/error states, matching `ContactPage.tsx`'s exact convention. **Real accessibility bug found and fixed**: the expandable category header was a `<div onClick>` with `cursor-pointer` — completely unreachable by keyboard and invisible to screen readers as an interactive control. Converted to a real `<button aria-expanded>` with `aria-controls` pointing at the panel.
- **`CourseDetailsPage.tsx`**: **real bug found and fixed** — the hero thumbnail was built from a hand-rolled URL (`${VITE_SUPABASE_URL}/storage/v1/object/public/course-assets/${thumbnailFileId}`) against a bucket name that doesn't match the real upload bucket (`courses`, used by `AdminCoursesPage`'s `uploadFile("courses", ...)`) and isn't public — the exact broken-URL pattern already fixed once this session in `MyCoursesPage`. Fixed with the same `resolveFileUrl()` + `useQuery` pattern. **Real dead-button bugs found and fixed**: the "Play course preview" button had no `onClick` and no backing course-level trailer/preview field exists anywhere in the schema — removed entirely rather than left as fake chrome (no course-level video field exists; only per-lesson video). The four "Share This Course" icons (Share2/Facebook/Twitter/LinkedIn) were bare `<span>`s with zero interactivity — wired to a real native-share-or-clipboard-copy handler (mirroring the exact pattern already established in `MentorHero.tsx`) plus real platform share-intent URLs for Facebook/Twitter/LinkedIn.
- Accessibility pass across all three: breadcrumb and anchor-tab-nav wrapped in `<nav aria-label>`, `aria-current="page"` on the active breadcrumb crumb, `aria-hidden` added to every decorative icon, `focus-visible` rings added to every interactive element that was missing one, `aria-pressed` on the wishlist toggle, `role="img" aria-label` on the static 5-star rating (decorative, from static testimonial data).
- Full verification suite (`tsc`/`eslint`/`vitest`/`build`) green; ESLint warning count held at 49 (no regressions).
- **Independent accessibility review** (via the accessibility-lead agent) found and this pass fixed: neither the `CoursesPage.tsx` counselling modal nor the `AdminCoursesPage.tsx` editor drawer had a real focus trap, initial-focus-on-open, or document-level Escape handling — both were hand-rolled `role="dialog"` divs with an `onKeyDown` scoped to a subtree focus never actually entered. Rebuilt both onto the real `@radix-ui/react-dialog` primitives (`DialogPrimitive.Root/Portal/Overlay/Content/Title/Close`, composed via `asChild` with the existing Framer Motion `AnimatePresence` choreography kept intact via `forceMount`) — this gets a real focus trap, initial focus, Escape-to-close, and correct `aria-modal`/`aria-labelledby` wiring for free instead of hand-coded. The admin drawer's full-viewport overlay-click-to-close button also gained a real `aria-label` in the process. The `AdminCoursesPage.tsx` row action menu (Edit/Duplicate/Publish/Archive/Delete) was a hand-rolled `motion.div` with no `role="menu"`, no arrow-key navigation, and a DOM-order bug that put an invisible full-screen "close" button before the actual menu items in tab order — replaced with the same `DropdownMenu`/`DropdownMenuTrigger`/`DropdownMenuContent`/`DropdownMenuItem` primitives `DataTable.tsx`'s own column-visibility toggle already uses correctly, removing the now-redundant `activeActionMenu` state entirely. Also fixed: a set of custom Tailwind classes that don't exist in this project's scale (`slate-450`/`-350`/`-850`/`-150` — this project has no `tailwind.config.*`, only the default `@theme` scale) were silently compiling to no CSS at all in `CoursesPage.tsx`, meaning several "audited" text/border colors were never actually applying — normalized to the nearest real step (`slate-400`/`-800`/`-200`). Share links flagged as missing a "opens in new tab" warning in their accessible name — added.

## Redesign priority order (per explicit direction)

Each phase below is only marked complete when: every page in it is migrated to the tokens/primitives in `DESIGN_SYSTEM.md`, the full verification suite (`tsc`/`eslint`/`vitest`/`build`) is green, and any real bugs found along the way are fixed and logged in `BUG_REPORT.md` — matching the exact discipline already used for every feature built this session.

1. **Authentication** — `AuthPage`, `AdminLoginPage`, `ForcePasswordChangePage`, `VerifyEmailPage`, `ProfileCompletionPage`. Smallest surface, highest first-impression weight (Clerk-tier polish target), and already partially uses `react-hook-form` — first candidate for the new `Form` primitive (§ 2 of `DESIGN_SYSTEM.md`).
2. **Dashboard Layout** — the three shells. Extract a `MentorDashboardShell` to match the Student/Admin pattern; all three shells consume the same `Breadcrumbs`/`NotificationBell` components after this step.
3. **Student Dashboard** — every page in the Student group above, including the 5 features built this session (Notes, Wishlist, Placements, Resume Builder, Career Guidance) which are functionally real but were styled inline per-feature rather than against a unified redesign pass.
4. **Mentor Dashboard** — `MentorDashboardPage.tsx`'s tabs, split into separate components as part of the redesign (not a new feature — the tab content already exists, just co-located in one large file).
5. **Admin Dashboard** — the full Admin group; most pages already migrated 2026-07-24 (see `DESIGN_SYSTEM.md` § 8) — this step is closing the remaining gaps (Assignments/AuditLogs/Calendar/Chat/Invitations/KnowledgeBase/Resource/Support tables not yet on `DataTable`) rather than a first pass.
6. **Course Pages** — `CoursesPage`/`CourseDetailsPage` (public) + `MyCoursesPage`/`CourseLearningPage` (student) + the Course Builder inside `MentorDashboardPage`/`AdminCoursesPage`.
7. **CRM** — `AdminCRMPage.tsx` (Leads/Pipeline/Tasks/Dashboard tabs).
8. **Analytics** — `AdminAnalyticsPage.tsx` + the student `LearningAnalytics` section; both migrate their recharts usage onto the new `ChartContainer` (§ 5 of `DESIGN_SYSTEM.md`) as part of this step.
9. **Profile Pages** — `ProfileSettingsPage` (student), the Profile tab inside `MentorDashboardPage`, and admin user-detail views.
10. **Remaining pages** — the full Marketing/Public group, plus any Admin pages not closed out in step 5.

Steps 1-5 correspond to the exact order given in direction; steps 6-10 are the "remaining pages" continuation, grouped by the concern each one shares (course-related surfaces together, analytics surfaces together, etc.) rather than an arbitrary file-by-file order.
