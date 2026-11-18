import { clientEnv } from "@/lib/env";
import { routes } from "@/lib/routes";

/**
 * Origin that Supabase auth emails (confirm signup, resend, password reset)
 * should send users back to.
 *
 * - In the browser this is the origin actually serving the app, so production
 *   (https://skillguru-india.vercel.app), Vercel previews and local dev
 *   (http://localhost:5173, or whatever port Vite picks) each get links back
 *   to themselves. Nothing is hardcoded.
 * - Outside a browser (tests, scripts) it falls back to `VITE_SITE_URL`.
 *
 * This does not weaken security: Supabase only honours a `redirect_to` that
 * matches the project's "Redirect URLs" allow-list; anything else falls back
 * to the configured Site URL.
 */
export function getAuthRedirectOrigin(): string {
  if (typeof window !== "undefined" && /^https?:$/.test(window.location.protocol)) {
    return window.location.origin;
  }
  return new URL(clientEnv.VITE_SITE_URL).origin;
}

/** Where email-confirmation (signup / resend) links land. */
export function getEmailConfirmationRedirectUrl(): string {
  return new URL(routes.authCallback, getAuthRedirectOrigin()).toString();
}

/** Where password-recovery links land. */
export function getPasswordResetRedirectUrl(): string {
  return new URL(routes.resetPassword, getAuthRedirectOrigin()).toString();
}

export type AuthLinkError = {
  /** Supabase error code, e.g. "otp_expired", "access_denied". */
  code: string;
  description: string;
  expired: boolean;
};

export type AuthUrlParams = {
  error: AuthLinkError | null;
  /** Link type reported by Supabase: signup, recovery, invite, magiclink, email_change… */
  type: string | null;
  hasAccessToken: boolean;
  /** PKCE auth code (`?code=`), if the project ever switches to the PKCE flow. */
  code: string | null;
  /** Token hash (`?token_hash=`), used by custom email templates with verifyOtp. */
  tokenHash: string | null;
};

/**
 * Reads the auth parameters Supabase appends to a redirect URL. Supabase may
 * put them in the hash (implicit flow) or the query string (PKCE / errors), so
 * both are checked; the hash wins when a key appears in both.
 */
export function parseAuthUrl(href: string | null | undefined): AuthUrlParams {
  const empty: AuthUrlParams = { error: null, type: null, hasAccessToken: false, code: null, tokenHash: null };
  if (!href) return empty;

  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return empty;
  }

  const query = url.searchParams;
  const hash = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
  const get = (key: string) => hash.get(key) ?? query.get(key);

  const errorCode = get("error_code") ?? get("error");
  const errorDescription = get("error_description");

  let error: AuthLinkError | null = null;
  if (errorCode || errorDescription) {
    const code = errorCode ?? "unknown_error";
    const description = (errorDescription ?? "").replace(/\+/g, " ");
    error = {
      code,
      description,
      expired: code === "otp_expired" || /expired|invalid/i.test(description),
    };
  }

  return {
    error,
    type: get("type"),
    hasAccessToken: !!hash.get("access_token"),
    code: query.get("code"),
    tokenHash: get("token_hash"),
  };
}
