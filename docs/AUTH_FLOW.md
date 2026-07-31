# SkillGuru — Authentication Flow

_Last analyzed: 2026-07-23._

## 1. Layers involved

```
AuthPage.tsx (UI)
   ↓ useAuth()                         src/hooks/useAuth.ts
   ↓ AuthContext (state machine)       src/context/AuthContext.tsx, AuthContextObj.ts
   ↓ AuthService (orchestration)       src/services/auth.service.ts
   ↓ AuthRepository (persistence)      src/repositories/auth.repository.ts
   ↓ Supabase client                   src/lib/supabase/client.ts
   ↓ Supabase GoTrue / Postgres
```

Identity/role data is a **separate** path, kicked off once a session exists:

```
IdentityService.loadCurrentUser()      src/services/IdentityService.ts
   ↓ supabase.rpc("get_current_identity")
   ↓ SECURITY DEFINER Postgres function (supabase/migrations/20260718074318_fix_identity_rpc.sql)
   ↓ returns { profile, organization, roles[], permissions[], mentor_profile, student_profile }
```

## 2. State machine (`AuthContext.tsx`)

States (`src/types/auth.types.ts`): `INITIALIZING → AUTHENTICATING → LOADING_PROFILE → READY`, plus `UNAUTHENTICATED`, `WAITING_EMAIL_CONFIRMATION`, `LOGOUT`, `SESSION_EXPIRED`, `ERROR`.

- **Bootstrap**: `supabase.auth.onAuthStateChange` is the single source of truth (`AuthContext.tsx:73-82`). Events `INITIAL_SESSION` (session restored from persisted storage on load), `SIGNED_IN`, `TOKEN_REFRESHED` all route through `processSession()` → `AUTH_SUCCESS` (session present) or `AUTH_FAIL` → `UNAUTHENTICATED` (no session). `SIGNED_OUT` → `LOGOUT`.
- **Token refresh** is entirely delegated to the Supabase client (`autoRefreshToken: true`); the app only reacts to `TOKEN_REFRESHED` to update state. No manual refresh logic exists anywhere in the app.
- **Identity load**: a second effect watches `status === "LOADING_PROFILE"`, calls `identityService.loadCurrentUser()`, and dispatches `IDENTITY_LOADED` (→ `READY`) or `ERROR`.
- **Login**: dispatches `START_AUTH`, calls `authService.login()`. On success it does **not** self-transition — it relies on the `onAuthStateChange` listener firing `SIGNED_IN` to drive the machine forward (this is a documented, intentional design in the code comments). On failure, dispatches `AUTH_FAIL`.
- **Signup**: same pattern, but on success dispatches `WAITING_EMAIL_CONFIRMATION`. If Supabase email confirmation is disabled, a subsequent `SIGNED_IN` event overrides this state — acknowledged as expected/acceptable in code comments, but it is a real race condition if you were to add UI that assumes `WAITING_EMAIL_CONFIRMATION` is always durable.
- **Logout**: dispatches `LOGOUT` immediately (optimistic reset to initial state), then calls `authService.logout()` → `supabase.auth.signOut()`, which also fires `SIGNED_OUT` from the listener — a harmless double-dispatch since the reducer already reset state.
- **Design rule enforced in code**: "Context delegates to AuthService. Context never navigates." Navigation after logout lives in `src/hooks/auth/useLogout.ts` (though that hook is unused in the live app — see § 5). Redirects for unauthenticated/unauthorized access are handled entirely by the route guards (`src/routes/guards.tsx`), not by `AuthContext`.

## 3. `AuthService` (`src/services/auth.service.ts`)

A pure orchestration class — explicitly documented to never import React, show toasts, navigate, or touch UI state. For every operation (`signup`, `login`, `resendVerificationEmail`, `logout`, `resetPassword`) it:

1. **Normalizes** input (`src/services/auth/normalizeAuthInput.ts`) — trims, lowercases email, strips zero-width Unicode, collapses whitespace.
2. **Validates** with Zod (`src/schemas/auth.schema.ts`).
3. **Checks cooldown** via `AuthCooldownStore` — sessionStorage-persisted per-operation timestamps (tab-scoped; not cross-tab coordinated by design — a documented future-improvement note mentions `BroadcastChannel`).
4. **Acquires a single-flight lock** via `SingleFlight` — an in-memory map preventing duplicate concurrent submissions of the same operation type.
5. **Executes** through `authRepository` (`IAuthRepository` interface), releasing the lock in a `finally`.
6. **Emits telemetry** at every stage via `AuthTelemetry` — structured logs plus a `window.dispatchEvent(new CustomEvent("skill-guru:auth-event", ...))` for analytics hooks; emails are hashed (non-cryptographic djb2) before logging, never logged raw.

`authService` is exported as a module-level singleton and is what `AuthContext` actually uses.

## 4. Error handling — `Result<T,E>` + `AppError` + `AuthErrorMapper`

- `src/utils/result.ts` defines a discriminated union `{success:true,data} | {success:false,error}` used pervasively instead of thrown exceptions for expected failure paths, plus an `AppError` class hierarchy: `AuthenticationError`, `AuthorizationError`, `ProfileMissingError`, `TriggerFailureError`, `DatabaseError`, `ValidationError`, `NetworkError`, `ConflictError`, `RateLimitError`, `UnexpectedError`. Each carries a user-facing `message`, machine-readable `code`, `developerMessage`, optional `recoveryAction`, and the raw `originalError` for logging.
- `src/utils/AuthErrorMapper.ts` classifies raw Supabase/Postgres errors into these subclasses by inspecting status codes, Supabase error codes, and message substrings — e.g. `over_email_send_rate_limit`/429 → `RateLimitError`; `"User already registered"` → `ConflictError`; `weak_password` → `ValidationError`; `"Invalid login credentials"` / `"Email not confirmed"` → `AuthenticationError`; Postgres `42P01` → `UnexpectedError`; `23505` (unique violation) → `ConflictError`; unmatched → generic `UnexpectedError("UNKNOWN_AUTH_ERROR")`.
- **Known inconsistency**: network-failure messages (`"Failed to fetch"`, `"NetworkError"`) are mapped to `UnexpectedError`, even though a dedicated `NetworkError` class exists and is never actually produced by the mapper. Not a functional bug (both classes are handled the same way by most callers today), but worth fixing if `NetworkError` is ever pattern-matched on specifically.

## 5. Duplicate / dead auth code (flagged for cleanup, not fixed as part of this analysis)

- `src/hooks/auth/{useLogin,useSignup,useLogout,useForgotPassword}.ts` each construct their **own** `AuthService`/`AuthRepository` instance and wrap it in a TanStack Query `useMutation`. Grepping the codebase shows these are **not imported anywhere** in live pages — `AuthPage.tsx` calls `useAuth().login(...)` / `useAuth().signupStudent(...)` from `AuthContext` directly instead. Only `useSession.ts` in this folder is used, and only by the also-dead `RouteGuards.tsx` (see ARCHITECTURE.md § 3). This is a fully-built parallel implementation that never executes in production.
- `state.loadingState` in `AuthContext` is initialized to `"IDLE"` but no reducer action ever updates it, despite an `AuthLoadingState` type defining values like `LOGIN_LOADING`/`SIGNUP_LOADING` — dead state field.
- `SESSION_EXPIRED` is only ever *checked* defensively in route guards; nothing in the traced code ever *dispatches* it.
- `ProfileValidator.validate` (`src/domain/auth/validators/profile.validator.ts`) exists but was not found wired into the live identity-loading path — needs a closer look if profile-integrity validation is assumed to be enforced.

## 6. Session → role propagation gap

`authUser` (profile + roles + permissions) lives purely in the `AuthContext` `useReducer` state — it is **not** cached in TanStack Query. Practical implication: if an admin changes a user's role server-side while that user has an open session, the change will **not** be reflected client-side until the user does a full page reload or signs in again. No `refetchIdentity()`/`invalidateAuthUser()` method is exposed from `useAuth()` today. This is worth flagging as a product/security consideration — e.g. a revoked mentor/admin role won't immediately restrict UI (though server-side RLS still enforces data access regardless of stale client state).

## 7. Supabase auth configuration

- Client: `createClient<Database>(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })` (`src/lib/supabase/client.ts`).
- Signup passes `full_name`/`role` via `options.data` (→ `raw_user_meta_data`), consumed by the `handle_new_user()` Postgres trigger (`SECURITY DEFINER`) to seed `profiles` + `user_roles` automatically.
- Supabase Auth advisor flags **leaked-password-protection is currently disabled** (HaveIBeenPwned check) — see DATABASE.md / BUG_REPORT.md.
