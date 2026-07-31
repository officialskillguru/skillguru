import { useState, useEffect } from "react";
import { Link, useSearchParams, Navigate } from "react-router-dom";
import { Mail, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { routes } from "@/lib/routes";
import { Logo } from "@/components/common/Logo";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");
  const { status, resendVerification } = useAuth();
  
  const [isResending, setIsResending] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(() => {
    try {
      const storedCooldown = sessionStorage.getItem("skillguru:auth:cooldown:resend");
      if (storedCooldown) {
        const until = Number(storedCooldown);
        if (Number.isFinite(until) && until > Date.now()) {
          return until - Date.now();
        }
      }
    } catch {
      // Ignore sessionStorage errors
    }
    return 0;
  });

  // Countdown timer
  useEffect(() => {
    let animationFrameId: number;
    let lastTick = performance.now();
    
    const tick = (now: number) => {
      const delta = now - lastTick;
      lastTick = now;
      
      setCooldownRemaining((prev) => {
        const next = Math.max(0, prev - delta);
        if (next === 0) return 0;
        return next;
      });
      
      if (cooldownRemaining > 0) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };
    
    if (cooldownRemaining > 0) {
      animationFrameId = requestAnimationFrame(tick);
    }
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [cooldownRemaining]);

  // If no email is provided and they aren't waiting for confirmation, send to login
  if (!email && status !== "WAITING_EMAIL_CONFIRMATION") {
    return <Navigate to={routes.login} replace />;
  }

  // If they are fully authenticated, send to dashboard
  if (status === "READY") {
    return <Navigate to={routes.dashboard} replace />;
  }

  const handleResend = async () => {
    if (!email || isResending || cooldownRemaining > 0) return;
    
    setIsResending(true);
    const result = await resendVerification(email);
    setIsResending(false);

    if (result.success) {
      toast.success("Verification email sent!");
      setCooldownRemaining(60000); // UI optimistic update (AuthService also sets it)
      return;
    }

    if (result.error.code === "RATE_LIMIT_ERROR") {
      const errorObj = result.error as unknown as Record<string, unknown>;
      const retryAfter = typeof errorObj.retryAfterMs === "number" ? errorObj.retryAfterMs : 60000;
      setCooldownRemaining(retryAfter);
      toast.error("Please wait before requesting another email.");
      return;
    }

    toast.error(result.error.message || "Failed to send email. Please try again later.");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="mb-8">
        <Logo className="justify-center" />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-primary/10">
          <Mail size={32} className="text-primary" aria-hidden="true" />
        </div>

        <h1 className="mb-2 text-2xl font-black text-foreground">Check your inbox</h1>

        <p className="mb-6 text-muted-foreground">
          We've sent a verification link to
          <br />
          <span className="font-semibold text-foreground">{email || "your email address"}</span>
        </p>

        <div className="mb-8 rounded-xl border border-primary/15 bg-primary/5 p-4 text-left text-sm text-foreground">
          <div className="flex gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <p>Click the link in the email to activate your account. If you don't see it, check your spam folder.</p>
          </div>
        </div>

        <button
          onClick={() => void handleResend()}
          disabled={isResending || cooldownRemaining > 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-input py-3.5 font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-busy={isResending}
        >
          {isResending ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Sending...
            </>
          ) : cooldownRemaining > 0 ? (
            `Resend Email (${Math.ceil(cooldownRemaining / 1000)}s)`
          ) : (
            "Resend Email"
          )}
        </button>

        <div className="mt-6 text-sm">
          <Link
            to={routes.login}
            className="inline-flex items-center gap-1.5 rounded font-medium text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
