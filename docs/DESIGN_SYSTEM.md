# SkillGuru — Design System

_Originally written 2026-07-24 in response to the "UI/UX Constitution" direction (Linear/Stripe/Notion/Apple-tier polish, admin dashboard first). Rewritten 2026-07-27 as the foundation for the full **Phase 2 enterprise redesign**: every token, primitive, and convention a page redesign should draw on, so pages migrate to one system rather than being redesigned independently. Reference quality: **Stripe, Linear, Vercel, Notion, Clerk, Raycast.** Explicitly rejected: glassmorphism as a default surface treatment, decorative gradients outside the marketing site, and flashy/attention-seeking animation anywhere in the product surfaces (dashboards, admin, forms)._

**No pages are redesigned by this document.** This is the foundation pass only — tokens, primitives, and the roadmap. Page-by-page migration is tracked separately in `docs/REDESIGN_ROADMAP.md` and proceeds in the priority order defined there.

---

## 1. Foundation: tokens (`src/styles/globals.css`)

All colors are HSL CSS variables consumed through Tailwind's `@theme` layer (`--color-primary` → `hsl(var(--primary))`), so every primitive automatically respects both themes — never hardcode a raw hex/Tailwind color (`bg-slate-900`, `text-blue-600`) in a component; use the semantic token (`bg-foreground`, `text-primary`).

### Color tokens
| Token | Light | Purpose |
|---|---|---|
| `background` / `foreground` | `#F8FAFC` / `#0F172A` | Page canvas / default text |
| `card` / `card-foreground` | `#FFFFFF` | Elevated surfaces (cards, panels) |
| `popover` / `popover-foreground` | `#FFFFFF` | Dropdowns, dialogs, tooltips, popovers |
| `primary` / `primary-foreground` | `#2563EB` / white | Brand actions, active states, links |
| `secondary` / `secondary-foreground` | `#06B6D4` / white | Secondary accents |
| `muted` / `muted-foreground` | `#F1F5F9` / `#64748B` | Subdued backgrounds, secondary text |
| `accent` / `accent-foreground` | `#06B6D4` / white | Hover/highlight surfaces |
| `destructive` / `destructive-foreground` | `#EF4444` / white | Errors, delete actions |
| `success` / `success-foreground` | `#10B981` / white | Positive status |
| `warning` / `warning-foreground` | `#F59E0B` / white | Caution status |
| `border` / `input` / `ring` | `#E2E8F0` | Dividers, form borders, focus rings |

Dark mode has a full matching `.dark` block (tuned navy background `#0A0F1C`, card `#10192B`, brightened primary/secondary for contrast) — every token above has a real dark-mode value, not just the toggle.

**Sidebar/shell tokens.** `--sidebar`, `--sidebar-foreground`, `--sidebar-muted`, `--sidebar-border`, `--sidebar-accent(-foreground)`. The app chrome (sidebar/topbar) intentionally stays a dark navy in **both** themes — the same pattern Linear and Vercel use for their app shell, distinct from the page canvas which does switch with the theme.

**Chart tokens — new this pass.** `--chart-1` through `--chart-8`, a fixed-order categorical palette (see § Charts below) — light and dark values both defined, both independently validated against this app's real card surfaces (`#FFFFFF` light / `#10192B` dark) with the `dataviz` skill's `validate_palette.js`. Never invent a 9th chart color by generating a new hue — fold extra series into "Other," use small multiples, or cap the series count (see § Charts).

**Motion tokens — new this pass.** `--duration-fast` (120ms, hover/press micro-interactions), `--duration-base` (200ms, enter/exit transitions), `--duration-slow` (320ms, drawers/sheets/larger layout shifts), `--ease-standard` (`cubic-bezier(0.4,0,0.2,1)`, general-purpose), `--ease-emphasized` (`cubic-bezier(0.16,1,0.3,1)`, for anything that should feel like it "settles" — modals, drawers). Every new transition should reference one of these four values, not an ad-hoc duration/easing pair.

### Typography
No new type scale — Tailwind's default scale (`text-xs` through `text-4xl`) covers everything, used consistently. **Weight carries hierarchy more than size does**: `font-black` for headings/key numbers, `font-bold`/`font-semibold` for labels, `font-medium` for body. Two fluid heading utilities exist for marketing hero sections only (`text-fluid-h1/h2/h3`, in `globals.css`) — dashboards/admin/forms should never use these, they're oversized for information-dense UI. Font family: `Inter`/`Plus Jakarta Sans` (`--font-sans`/`--font-display`), system-ui fallback.

### Spacing, radius, shadow
- Radius: `--radius: 1.5rem` (24px) base, with `--radius-md`/`--radius-sm` derived smaller steps. Cards/panels use `rounded-xl`/`rounded-2xl`; buttons/inputs use `rounded-md`/`rounded-xl` depending on size.
- Shadow: `--shadow-sm/md/lg` (standard elevation) plus `--shadow-premium` (a soft blue-tinted glow — marketing/hero surfaces only, never dashboard cards).
- Spacing: standard Tailwind spacing scale, no custom overrides — consistency comes from reusing established patterns (`p-5`/`gap-4`/`space-y-6`), not a new token layer.

### Iconography
**Lucide React**, exclusively — no other icon set anywhere in the app. Default size `size-4` (16px) inline with text/buttons, `size-5` for emphasis (section headers, empty-state icons scale up further, `size-10`). Stroke width is the Lucide default (2) everywhere; never mix a thinner/thicker icon set into the same view. Decorative icons get `aria-hidden="true"`; icons that are the only content of an interactive element (icon-only buttons) require an `aria-label` on the element, not the icon.

### Reference direction & anti-patterns
Target feel: **Stripe** (content density + restraint), **Linear** (dark app-shell, keyboard-first, motion economy), **Vercel** (typographic confidence, monochrome-first UI with color used sparingly for meaning), **Notion** (calm information density, generous whitespace in content-heavy views), **Clerk** (form/auth polish), **Raycast** (command palette, micro-interaction quality).

Explicitly avoid, anywhere outside the marketing site's hero sections:
- **Glassmorphism as a default surface** — no `backdrop-blur` + translucent-panel treatment on dashboard/admin cards, dialogs, or sidebars. (`.glass-dark` in `globals.css` is marketing-hero-only.)
- **Decorative gradients** — `.brand-gradient`/`.cyan-gradient`/`--shadow-premium` stay scoped to marketing hero/CTA sections. Dashboard and admin surfaces use flat `bg-card` with a hairline border, never a gradient background.
- **Flashy animation** — no bouncy/elastic easing, no attention-seeking looping animation, no parallax outside the marketing hero. Motion should be felt, not noticed: use the four motion tokens above, keep durations short, and prefer opacity/subtle-translate over scale/rotation for UI chrome.

---

## 2. Primitive components (`src/components/ui/`)

Radix-based, so keyboard nav / focus management / ARIA roles come for free. This is the actual inventory — never rebuild any of these from scratch in a page redesign.

| Component | File | Notes |
|---|---|---|
| Button | `button.tsx` + `button-variants.ts` | `default/secondary/outline/ghost/destructive/link` × `default/sm/lg/icon`. Hover-scale, focus ring, disabled state built in. |
| Badge | `badge.tsx` + `badge-variants.ts` | `default/secondary/outline/success/warning/destructive/info/muted`. |
| Card | `card.tsx` | Header/Content/Footer composition. |
| Input / Textarea / Label | `input.tsx` / `textarea.tsx` / `label.tsx` | Standard form primitives. |
| **Form** — new this pass | `form.tsx` | shadcn-style `Form`/`FormField`/`FormItem`/`FormLabel`/`FormControl`/`FormDescription`/`FormMessage`, wired to `react-hook-form` (already a dependency, previously used ad-hoc in one page only — `AuthPage.tsx`). Use this for every new form instead of hand-rolling label/error wiring per field. |
| Select / Checkbox / Radio Group / **Switch** (new) | `select.tsx` / `checkbox.tsx` / `radio-group.tsx` / `switch.tsx` | Radix-backed. Switch added this pass for boolean settings toggles (e.g. "Remote?", feature flags) — previously every boolean toggle was a hand-rolled checkbox-as-toggle. |
| **Avatar** — new this pass | `avatar.tsx` | Image + initials fallback, Radix-backed. Every hardcoded `<img>`-with-fallback-string pattern (mentor cards, admin user menus) should migrate to this during page redesign rather than reimplementing fallback logic per page. |
| **Tooltip** — new this pass | `tooltip.tsx` | `@radix-ui/react-tooltip` was already an installed dependency with zero consumers — this is its first real usage. Use for icon-only button labels, truncated-text-on-hover, and metric explanations. |
| **Popover** — new this pass | `popover.tsx` | For lightweight contextual panels that aren't a full Dialog (date pickers, filter panels, inline detail cards). |
| **Separator** — new this pass | `separator.tsx` | Replaces hand-rolled `<div className="border-t">` dividers. |
| Table | `table.tsx` | Raw table primitives — see DataTable below for the composed version. |
| Dialog / Sheet | `dialog.tsx` / `sheet.tsx` | Modal and drawer respectively. |
| Dropdown Menu | `dropdown-menu.tsx` | Full Radix menu kit (items, checkboxes, separators, labels). |
| Command | `command.tsx` | Command-palette primitive, wired up in `CommandPalette.tsx` (⌘K, already live). |
| Tabs / Accordion | `tabs.tsx` / `accordion.tsx` | Standard. |
| Toast | `toast.tsx` + `sonner` | Used everywhere via `toast.success/error(...)`. |
| Skeleton | `skeleton.tsx` | Loading placeholders — match the real content's shape, never a generic spinner-only state. |
| Empty State / Error State | `empty-state.tsx`, `src/components/common/ErrorState.tsx` | Consistent empty/error messaging. |
| Progress | `progress.tsx` | Linear progress bar. |
| Pagination | `pagination.tsx` | Standalone pagination controls (DataTable has its own built-in pager). |
| **Chart** — new this pass | `chart.tsx` | `ChartContainer`/`ChartTooltip(Content)`/`ChartLegend(Content)` wrapping `recharts`, colors driven entirely by the new `--chart-1..8` CSS variables via a `ChartConfig`. Replaces ad-hoc per-page recharts color configs (previously `LearningAnalytics.tsx` and `AdminAnalyticsPage.tsx` each invented their own colors). See § Charts. |

## 3. Composed components (`src/components/common/`, `src/components/dashboard/`)

- **DataTable** (`DataTable.tsx`) — sort, column filter, search, pagination, column visibility toggling, row selection, bulk actions, CSV export, sticky header option, `destructive` bulk-action variant. The one and only table component — every list page should use it, not a hand-rolled `<table>`.
- **Breadcrumbs** (`src/components/common/Breadcrumbs.tsx`) — **extracted this pass** from a copy that lived inline in `AdminPage.tsx`. Now takes `rootPath`/`rootLabel` props so the Mentor and Student dashboard shells can reuse the exact same component instead of each writing their own (which is what would have happened next, per the "Dashboard Layout" redesign step in the roadmap).
- **NotificationBell** (`src/components/dashboard/layout/NotificationBell.tsx`) — real dropdown, unread badge, realtime updates. Used in both the student and Admin topbars.
- **CommandPalette** (`src/components/common/CommandPalette.tsx`) — global ⌘K search, already live.

## 4. Component states checklist

Every interactive component in this system should have, at minimum:
- **Hover** — subtle elevation (`hover:-translate-y-0.5 hover:shadow-md`) for cards, background shift for list rows/menu items.
- **Focus-visible** — `focus-visible:ring-2 focus-visible:ring-ring` (never rely on hover-only affordance).
- **Disabled** — `disabled:opacity-50 disabled:pointer-events-none`, consistently applied via `buttonVariants`.
- **Loading** — skeleton placeholders matching the real content's shape, not a generic spinner-only state.
- **Empty** — `EmptyState`/inline empty messaging, never a silently blank panel.
- **Error** — `ErrorState`, or an inline destructive-toned message for smaller surfaces.

---

## 5. Charts

Recharts is the only charting library in the app. All chart color now goes through `ChartContainer`'s `ChartConfig` → the `--chart-1..8` CSS variables — never pass a raw hex/Tailwind color to a `<Bar fill="...">`/`<Line stroke="...">` directly.

**Categorical palette (fixed slot order, never cycled)** — validated with the `dataviz` skill's `scripts/validate_palette.js` against this app's actual card surfaces:

| Slot | Hue | Light | Dark |
|---|---|---|---|
| 1 | blue | `#2a78d6` | `#3987e5` |
| 2 | orange | `#eb6834` | `#d95926` |
| 3 | aqua/green | `#1baf7a` | `#199e70` |
| 4 | yellow | `#eda100` | `#c98500` |
| 5 | magenta | `#e87ba4` | `#d55181` |
| 6 | deep green | `#008300` | `#008300` |
| 7 | violet | `#4a3aa7` | `#9085e9` |
| 8 | red | `#e34948` | `#e66767` |

Validated against `#FFFFFF` (light) and `#10192B` (dark): CVD adjacent-pair ΔE ≥ 8.4 in both modes, normal-vision adjacent floor ≥ 19.3 in both modes — all pass. Three light-mode slots (aqua, yellow, magenta) sit below 3:1 contrast against the white card surface by design (documented palette, not a bug) — the **relief rule** applies: any chart using those slots needs visible direct labels or a table-view fallback, not color alone. Past 3 series in an all-pairs context (scatter/bubble/choropleth), fold extra series into "Other" or facet — the reference palette's own analysis found no ordering clears the all-pairs floor past the first 3 slots.

**Rules for every new chart:**
- One axis. Never a dual-axis (two y-scales) chart — two measures of different scale become two charts, small multiples, or an indexed-to-a-common-base single chart.
- Status colors (`success`/`warning`/`destructive`) are reserved for state (a metric that's good/bad/critical) — never reused as a plain series color, and always paired with an icon + label, never color alone.
- A legend is always present for ≥2 series; a single series needs no legend (the chart title names it).
- Sequential (magnitude) encoding = one hue, light→dark. Diverging (polarity) = two hues + a neutral gray midpoint. Never a rainbow gradient for either.

Before changing any `--chart-N` value, re-run `validate_palette.js` against both real surfaces — don't eyeball a hex swap.

---

## 6. Motion

Two motion systems coexist by design, scoped to different surfaces:
- **Framer Motion** — dashboard/admin micro-interactions (drawers, modals, hover states, list enter/exit). Already the dependency in use across `AdminMentorsPage.tsx` and others. Use the new `--duration-*`/`--ease-*` tokens for any new Framer Motion `transition` prop rather than inventing a new timing value.
- **GSAP** (`src/components/motion/gsap-*.tsx` — `GsapReveal`, `GsapPin`, `GsapMagnetic`, `GsapTextReveal`) — marketing/hero surfaces only (`HomePage`, `AboutPage`, etc.). Never import a GSAP reveal component into a dashboard/admin page — the two systems are intentionally not interchangeable; GSAP's scroll-triggered reveals are a marketing-site convention, not a dashboard one.

Respect `prefers-reduced-motion` — `globals.css` already disables marquee/video-loop animation under it; any new looping/auto-playing motion added during the redesign must do the same.

---

## 7. What changed in the 2026-07-24 pass (Admin shell + Dashboard)

The Admin shell (`src/pages/AdminPage.tsx`) had several elements that looked plausible but were fake:

| Before | After |
|---|---|
| Notification bell hardcoded to show "5" unread, no dropdown | Real `NotificationBell` — live unread count, real dropdown, realtime updates |
| "Messages" bell showing a hardcoded "2" badge, no backing feature | Removed — no real messaging system exists to back it |
| Avatar: external `pravatar.cc` placeholder image | Real initials avatar derived from the logged-in admin's actual name |
| Hardcoded "Admin User" / "Super Admin" text | Real name/email/role from `useAuth()` |
| "Collapse sidebar" button that only showed a toast and did nothing | Real collapse — sidebar shrinks to an icon rail, persisted in `localStorage` |
| Dark-mode toggle that flipped a class with no matching CSS | Real dark mode |
| Sidebar/topbar hardcoded color literals | Token-based |
| Dashboard header's date-range button — unclickable, hardcoded | Real "Refresh" button, live last-updated timestamp |
| Breadcrumb trail computed but never rendered — dead code | Real, rendered `Breadcrumbs` (now extracted to a shared component, § 3) |

---

## 8. Migration log (page-by-page, chronological)

_Superseded by `docs/REDESIGN_ROADMAP.md` going forward — this log is kept as history of what was already migrated/audited before the roadmap existed, so the roadmap doesn't re-audit these from scratch._

| Page | Status | Notes |
|---|---|---|
| Admin shell (`AdminPage.tsx`) + Dashboard | Migrated 2026-07-24 | See § 7. Breadcrumbs extracted to shared component 2026-07-27. |
| Users (`AdminStudentsPage.tsx`) | Migrated 2026-07-24 | Rebuilt onto `DataTable`; was also a real data fix (100% fabricated before), see BUG-29. |
| Mentors (`AdminMentorsPage.tsx`) | Migrated 2026-07-24 | Rebuilt onto `DataTable`, see BUG-30. |
| CRM (`AdminCRMPage.tsx`) | Migrated 2026-07-24 | Leads tab onto `DataTable`. Pipeline/Tasks/Dashboard tabs already real, not tabular. |
| Courses (`AdminCoursesPage.tsx`) | Migrated 2026-07-24 | Fixed 6 fake editor tabs + hardcoded Enrollments column (BUG-31); list table migrated onto `DataTable`. |
| Payments / Certificates (`AdminPaymentsPage.tsx` / `AdminCertificatesPage.tsx`) | Migrated 2026-07-24 | Both already fully real; migrated onto `DataTable`. |
| Notifications (`AdminNotificationsPage.tsx`) | Migrated 2026-07-24 | Fixed missing pagination controls (BUG-34). |
| Settings (`AdminSettingsPage.tsx`) | Migrated 2026-07-24 | `cms.service.ts` was a full no-op with a false "will persist" claim — rewritten for real. See BUG-34. |
| Role & Operators (`AdminRolePage.tsx`) | Migrated 2026-07-24 | All three tabs were fake, rebuilt against real data. |
| System Health (`AdminSystemHealthPage.tsx`) | Migrated 2026-07-24 | "External Services" panel previously hardcoded `ok: true` for all 5 rows. |
| Mentor Dashboard (`MentorDashboardPage.tsx`) | Migrated/rebuilt 2026-07-24 through 2026-07-27 | Fixed fakes (BUG-39), then a full real rebuild of mentor profile content, booking, and lifecycle (Phase 1.19/1.20). |
| Success Stories / Placements / AI Guidance / CMS | Audited 2026-07-24, **Placements fully rebuilt 2026-07-27** | Success Stories rewritten for real (BUG-35); AI Guidance/CMS Blogs converted to honest stubs (BUG-36/37) — **still stubs, not yet built**; **Placements is no longer a stub** — full enterprise Placement Management System built 2026-07-27 (see `TASKS.md`). |
| Student dashboard, Quiz, Notes, Wishlist, Learning Analytics, Student Profile, Resume Builder, AI Career Guidance | Built/fixed real 2026-07-27 (Phase 1) | All functionally real and using design tokens as they were built, but not yet visually migrated to the full redesign standard this document sets going forward — first candidates in `REDESIGN_ROADMAP.md`. |
| Admin: Assignments, Audit Logs, Calendar, Chat, Invitations, Knowledge Base, Support | Migrated 2026-07-27 | Assignments/Audit Logs/Invitations rebuilt onto `DataTable`; Calendar/Chat/Support (not tabular) got the same token/Badge/a11y pass. See `REDESIGN_ROADMAP.md` § 5. |
| Everything else (marketing site, Coupons, Refunds, public Mentor pages) | Functionally real, not yet visually migrated | Full inventory and priority order in `docs/REDESIGN_ROADMAP.md`. |
