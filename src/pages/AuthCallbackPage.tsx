import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { initialAuthUrl } from "@/lib/auth/initialUrl";
import { parseAuthUrl, type AuthLinkError } from "@/lib/auth/redirects";
import { routes } from "@/lib/routes";
import { useAuth } from "@/hooks/useAuth";
import { RouteResolver } from "@/routes/RouteResolver";
import { Logo } from "@/components/common/Logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Outcome =
  | { kind: "verified" }
  | { kind: "recovery" }
  | { kind: "error"; error: AuthLinkError }
  | { kind: "no-session" };

const EMAIL_OTP_TYPES: readonly EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Resolves the auth redirect exactly once per page load. React StrictMode
 * mounts effects twice in dev, and a token_hash / PKCE code is single-use, so
 * a second exchange would fail and wrongly show "link expired".
 */
let resolution: Promise<Outcome> | null = null;

function resolveAuthRedirect(): Promise<Outcome> {
  resolution ??= (async (): Promise<Outcome> => {
    const params = parseAuthUrl(initialAuthUrl);

    if (params.error) return { kind: "error", error: params.error };

    // Custom email templates ({{ .TokenHash }}) - verify server-side.
    if (params.tokenHash && params.type && (EMAIL_OTP_TYPES as readonly string[]).includes(params.type)) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: params.tokenHash, type: params.type });
      if (error) {
        return { kind: "error", error: { code: error.code ?? "verify_failed", description: error.message, expired: true } };
      }
    } else if (params.code) {
      // PKCE flow (only if the client is ever switched to flowType: "pkce").
      const { error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (error) {
        return { kind: "error", error: { code: error.code ?? "exchange_failed", description: error.message, expired: true } };
      }
    }

    // Implicit flow: supabase-js (detectSessionInUrl) already stored the
    // session from the #access_token hash; getSession() waits for that.
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      return params.hasAccessToken
        ? { kind: "error", error: { code: error?.code ?? "invalid_token", description: error?.message ?? "", expired: true } }
        : { kind: "no-session" };
    }

    return params.type === "recovery" ? { kind: "recovery" } : { kind: "verified" };
  })();
  return resolution;
}

const CARD = "w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm";
const PRIMARY_BTN =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const SECONDARY_LINK =
  "rounded font-medium text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/**
 * Landing page for Supabase email links (signup confirmation, resend).
 * Shows a clear success message, or an actionable error for expired /
 * invalid / already-used links with a way to request a fresh email.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { status, authUser, resendVerification } = useAuth();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    let active = true;
    void resolveAuthRedirect().then((result) => {
      if (!active) return;
      if (result.kind === "recovery") {
        void navigate(routes.resetPassword, { replace: true });
        return;
      }
      setOutcome(result);
      // Never leave tokens or error details sitting in the address bar/history.
      window.history.replaceState(window.history.state, "", window.location.pathname);
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  // Move focus to the result heading so screen readers announce the outcome.
  useEffect(() => {
    if (outcome) headingRef.current?.focus();
  }, [outcome]);

  const handleResend = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Enter the email address you signed up with.");
      document.getElementById("resend-email")?.focus();
      return;
    }
    setEmailError(null);
    setIsResending(true);
    const result = await resendVerification(trimmed);
    setIsResending(false);

    if (result.success) {
      toast.success("A new verification email is on its way.");
      void navigate(`${routes.verifyEmail}?email=${encodeURIComponent(trimmed)}`, { replace: true });
      return;
    }
    toast.error(
      result.error.code === "RATE_LIMIT_ERROR"
        ? "Please wait a minute before requesting another email."
        : result.error.message || "We couldn't send the email. Please try again later.",
    );
  };

  const profileLoading = status === "INITIALIZING" || status === "LOADING_PROFILE" || status === "AUTHENTICATING";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted p-4 py-12">
      <div className="mb-8">
        <Logo className="justify-center" />
      </div>

      {outcome === null && (
        <div className={CARD} role="status" aria-live="polite">
          <Loader2 className="mx-auto mb-4 size-8 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm font-medium text-muted-foreground">Verifying your link…</p>
        </div>
      )}

      {outcome?.kind === "verified" && (
        <div className={CARD}>
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 size={32} className="text-success" aria-hidden="true" />
          </div>
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-black tracking-tight text-foreground focus:outline-none">
            Email verified
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Thank you for confirming your email address. Your SkillGuru account is now active and you&apos;re signed in.
          </p>
          <div className="mt-6">
            {profileLoading ? (
              <button type="button" disabled className={PRIMARY_BTN} aria-busy="true">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Preparing your dashboard…
              </button>
            ) : status === "READY" ? (
              <Link to={RouteResolver.getDashboard(authUser)} replace className={PRIMARY_BTN}>
                Continue to your dashboard
              </Link>
            ) : (
              <Link to={routes.login} replace className={PRIMARY_BTN}>
                Continue to sign in
              </Link>
            )}
          </div>
        </div>
      )}

      {(outcome?.kind === "error" || outcome?.kind === "no-session") && (
        <div className={CARD}>
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle size={32} className="text-destructive" aria-hidden="true" />
          </div>
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-black tracking-tight text-foreground focus:outline-none">
            {outcome.kind === "error" && outcome.error.expired ? "This link has expired" : "We couldn't verify this link"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {outcome.kind === "error" && outcome.error.expired
              ? "Verification links can only be used once and expire after a while. If you've already verified your email, just sign in. Otherwise, request a new link below."
              : "The link is incomplete or invalid. If you've already verified your email, sign in. Otherwise, request a new verification link below."}
          </p>

          <form onSubmit={(e) => void handleResend(e)} className="mt-6 space-y-3 text-left" noValidate>
            <div className="space-y-2">
              <Label htmlFor="resend-email">Email address</Label>
              <Input
                id="resend-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                className="h-11 rounded-xl"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "resend-email-error" : undefined}
              />
              {emailError && (
                <p id="resend-email-error" role="alert" className="flex items-center gap-1.5 text-xs font-semibold text-destructive-text">
                  <AlertCircle size={12} aria-hidden="true" />
                  {emailError}
                </p>
              )}
            </div>
            <button type="submit" disabled={isResending} className={PRIMARY_BTN} aria-busy={isResending}>
              {isResending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Sending…
                </>
              ) : (
                "Send a new verification link"
              )}
            </button>
          </form>

          <p className="mt-6 text-sm">
            <Link to={routes.login} className={SECONDARY_LINK}>
              Back to sign in
            </Link>
          </p>
        </div>
      )}
    </main>
  );
}
