import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { routes } from "@/lib/routes";
import { Logo } from "@/components/common/Logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Landing page for the "reset password" email link. Supabase establishes a
 * recovery session from the URL's token automatically (PASSWORD_RECOVERY
 * auth event) before this component mounts its interactive state; we only
 * need to confirm a session exists, then call auth.updateUser like the
 * force-password-change flow already does.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldError, setFieldError] = useState<{ field: "new-password" | "confirm-password"; message: string } | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setHasSession(true);
      else if (event === "SIGNED_IN" && session) setHasSession(true);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      setFieldError({ field: "new-password", message: "Password must be at least 8 characters." });
      document.getElementById("new-password")?.focus();
      return;
    }
    if (password !== confirmPassword) {
      setFieldError({ field: "confirm-password", message: "Passwords do not match." });
      document.getElementById("confirm-password")?.focus();
      return;
    }
    setFieldError(null);
    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      toast.error(error.message || "Failed to reset password. The link may have expired.");
      return;
    }

    toast.success("Password reset successfully! Please sign in with your new password.");
    await supabase.auth.signOut();
    void navigate(routes.login, { replace: true });
  };

  const newPasswordError = fieldError?.field === "new-password" ? fieldError.message : undefined;
  const confirmPasswordError = fieldError?.field === "confirm-password" ? fieldError.message : undefined;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-4 py-12">
      <div className="mb-8">
        <Logo className="justify-center" />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        {hasSession === false ? (
          <div className="text-center">
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle size={32} className="text-destructive" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">Link expired or invalid</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This password reset link is no longer valid. Request a new one from the sign-in page.
            </p>
            <Link
              to={routes.forgotPassword}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Request New Link
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-black tracking-tight text-foreground">Reset Your Password</h1>
              <p className="mt-2 text-sm text-muted-foreground">Choose a new password for your account.</p>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    aria-invalid={!!newPasswordError}
                    aria-describedby={newPasswordError ? "new-password-error" : undefined}
                    className={cn("h-11 rounded-xl pr-10", newPasswordError && "border-destructive focus-visible:ring-destructive")}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-controls="new-password confirm-password"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>
                {newPasswordError && (
                  <p id="new-password-error" role="alert" className="flex items-center gap-1.5 text-xs font-semibold text-destructive-text">
                    <AlertCircle size={12} aria-hidden="true" />
                    {newPasswordError}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  aria-invalid={!!confirmPasswordError}
                  aria-describedby={confirmPasswordError ? "confirm-password-error" : undefined}
                  className={cn("h-11 rounded-xl", confirmPasswordError && "border-destructive focus-visible:ring-destructive")}
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {confirmPasswordError && (
                  <p id="confirm-password-error" role="alert" className="flex items-center gap-1.5 text-xs font-semibold text-destructive-text">
                    <AlertCircle size={12} aria-hidden="true" />
                    {confirmPasswordError}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      Resetting…
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
