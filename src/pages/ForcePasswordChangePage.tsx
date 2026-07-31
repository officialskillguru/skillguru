import { useState, type FormEvent } from "react";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RouteResolver } from "@/routes/RouteResolver";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/common/Logo";
import { cn } from "@/lib/utils";

export default function ForcePasswordChangePage() {
  const { authUser } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldError, setFieldError] = useState<{ field: "new-password" | "confirm-password"; message: string } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!authUser) return;

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

    // Routed through the set-own-password edge function (service-role) rather
    // than auth.updateUser() directly - GoTrue's "Secure password change"
    // setting requires an emailed OTP nonce for self-service updateUser() calls
    // on sessions it doesn't consider "recent enough", which would make this
    // forced first-login flow depend on email delivery. The edge function only
    // ever acts on the caller's own account (derived from their JWT).
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- supabase-js's FunctionsError union resolves loosely here
    const { data, error: invokeError } = await supabase.functions.invoke<{ success: boolean; message?: string }>(
      "set-own-password",
      { body: { password } }
    );

    setIsLoading(false);

    if (invokeError || !data?.success) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- same loosely-typed FunctionsResponse as above
      toast.error(data?.message || invokeError?.message || "Failed to update password.");
      return;
    }

    toast.success("Password updated successfully!");
    // Hard navigation, not react-router's navigate(): authUser in memory still
    // has passwordResetRequired:true (no onAuthStateChange event fires for this
    // update), so a client-side navigate would immediately bounce back here.
    // A full reload forces AuthContext to re-fetch identity from scratch.
    window.location.assign(RouteResolver.getDashboard(authUser));
  };

  const newPasswordError = fieldError?.field === "new-password" ? fieldError.message : undefined;
  const confirmPasswordError = fieldError?.field === "confirm-password" ? fieldError.message : undefined;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-4 py-12">
      <div className="mb-8">
        <Logo className="justify-center" />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black tracking-tight text-foreground">Set a New Password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account was created with a temporary password. Choose a new password to continue.
          </p>
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
                  Updating…
                </>
              ) : (
                "Set Password & Continue"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
