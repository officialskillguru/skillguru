# SkillGuru — Role & Permission Flow

_Last analyzed: 2026-07-23._

## 1. Data model (Postgres, `supabase/migrations/004_rbac.sql`)

Multi-role, not single-role: a user can hold several roles simultaneously (e.g. mentor + student).

- `roles` — system role catalog.
- `user_roles` — junction table (`user_id`, `role_id`, `assigned_by`, `revoked_at`). A role is active while `revoked_at IS NULL`. This table currently has 10 rows for 9 profiles.
- `permissions` — 12 seeded permission codes (e.g. `canViewAdminDashboard`).
- `role_permissions` — join table mapping roles → permissions (currently 0 rows — see BUG_REPORT.md, this means no role currently has any permission actually granted via this table, so all permission checks in the app fall back to role-name checks, not real permission grants).
- Helper SQL functions used both by RLS policies and Edge Functions: `has_role(_role_code)`, `has_permission(_permission_code)`, `get_current_roles()`, `get_current_permissions()`, `current_user_permissions()`, `is_course_mentor(p_course_id)`.

The three "role types" referenced throughout the product are **admin, mentor, student** — but the RBAC schema is more general-purpose than that: `AdminProtectedRoute` (see below) also recognizes `counsellor`, `sales`, `content_manager`, `hr`, `finance` as roles with admin-dashboard access, suggesting the schema was designed for a broader internal-staff RBAC model beyond the three headline roles.

## 2. How the frontend resolves a user's role(s)

1. After a session is established, `IdentityService.loadCurrentUser()` (`src/services/IdentityService.ts`) calls the Postgres RPC `get_current_identity()` — a single `SECURITY DEFINER` function that returns one JSON payload containing `profile`, `organization`, `roles: string[]` (all active roles), `permissions: string[]` (union of permission codes across all active roles), `mentor_profile`, `student_profile`.
2. `IdentityService.resolveHighestRole()` collapses the multi-role array into one `highestRole` string, using a fixed client-side priority: **admin > mentor > student** (defaults to `"student"` if nothing matches).
3. Both representations are stored on `AuthContext`'s `authUser`: the full `roles`/`permissions` arrays (for genuine multi-role checks) and the derived `highestRole` (for "where's your home dashboard" logic).

## 3. Where role checks actually happen

Almost all role/permission gating in the live app happens in the **route guards** (`src/routes/guards.tsx`), not scattered through individual components/hooks:

- **`ProtectedRoute`** — any authenticated user; additionally force-redirects students with an incomplete profile (`!profile.fullName`) to `/onboarding`.
- **`AdminProtectedRoute`** — `isSuperAdmin = roles.includes("admin")` bypasses all checks. Otherwise: a `requiredPermission` prop *can* be checked against `authUser.permissions`, but **no route in `router.tsx` currently passes this prop** — every `/admin/*` route falls back to the coarse default (`permissions.includes("canViewAdminDashboard")` OR role in `["counsellor","sales","content_manager","hr","finance"]`). Combined with `role_permissions` currently having 0 rows in the database (see § 1), `canViewAdminDashboard` can never be granted via the permissions table today — in practice, **only `admin` role and the 5 hardcoded staff role names get into `/admin/*`** right now.
- **`MentorProtectedRoute`** — requires `roles.includes("mentor")` or `roles.includes("admin")`.
- Data hooks (`useAdminSystem.ts`, `useAdminData.ts`, `usePayment.ts`) do **not** perform their own role checks client-side — they assume the caller already passed a route guard, and rely on Postgres RLS to enforce real data-level authorization server-side. This is a reasonable "defense at the routing layer + defense at the data layer" split, though it does mean any future non-route entry point (e.g. a modal reachable from a lower-privileged page) would need its own explicit check.
- Server-side, several Edge Functions (`admin-users`, `create-mentor`, `payment-status`, `refund-payment`) perform their **own independent** role checks via the `current_user_roles`/`get_current_roles` RPCs — this is correct defense-in-depth, since Edge Functions must not trust client-supplied role claims.

## 4. Role propagation / staleness

`authUser` (profile + roles + permissions) lives only in `AuthContext`'s in-memory `useReducer` state — it is not cached in, or invalidated via, TanStack Query. **If an admin changes a user's role while that user has an active session, the change does not propagate to the already-open client** until the user reloads the page or signs in again. There is no `refetchIdentity()` exposed from `useAuth()`. Server-side RLS still enforces real data access regardless of the stale client-side role snapshot, so this is a UX/staleness issue (e.g. a demoted admin might still see admin nav links until reload) rather than a security bypass — but it should be fixed before the RBAC system is used for anything more security-sensitive than dashboard navigation.

## 5. Dead/legacy role code (do not use as reference for new work)

`src/components/common/RouteGuards.tsx` implements a second, unused role-gating system (`StudentRoute`, `MentorRoute`, `AdminRoute`, `GuestRoute`, `AuthenticatedRoute`) built around a `PortalRole` enum and single-role (`highestRole`)-only logic. It is not imported by the live router and should not be treated as documentation of current behavior — see ARCHITECTURE.md § 3 for why it exists and why it's dead.

## 6. Admin permission granularity — current status

The `AdminProtectedRoute` component supports per-route granular permissions (`requiredPermission` prop) and the database schema supports it (`permissions`/`role_permissions` tables), but **neither side is actually wired up today**: no route passes the prop, and `role_permissions` has zero rows. Effectively, admin access today is a **binary role check** (are you `admin`, or one of five hardcoded staff role names?), not the fine-grained permission system the schema was clearly designed to support. This is one of the highest-leverage gaps to close if different admin staff roles (counsellor/sales/finance/etc.) are meant to see different subsets of `/admin/*` — currently, any of those five roles gets the *entire* admin dashboard.
