/**
 * Snapshot of the URL the app was loaded with.
 *
 * supabase-js (`detectSessionInUrl: true`) consumes the tokens in an auth
 * redirect URL and then strips them from the address bar. On an error
 * redirect (expired / already-used link) the params are only informative,
 * and by the time a lazily-loaded page mounts they may already be gone.
 * This module is imported by the Supabase client *before* `createClient()`
 * runs, so it always sees the original URL.
 *
 * It contains no secrets beyond what is already in the address bar, and is
 * only ever read in-memory - never persisted or sent anywhere.
 */
export const initialAuthUrl: string | null =
  typeof window !== "undefined" ? window.location.href : null;
