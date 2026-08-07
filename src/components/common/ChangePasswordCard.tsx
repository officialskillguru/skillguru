import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, AlertCircle, ShieldCheck } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Shared self-service "change my password" card - used by any authenticated
 * role's own profile/security settings (Admin, Mentor, Student). Routed
 * through the set-own-password edge function (service-role) rather than
 * auth.updateUser() directly: GoTrue's "Secure password change" setting
 * requires an emailed OTP nonce for self-service updateUser() calls on
 * sessions it doesn't consider "recent enough", which would make an
 * in-app password change depend on email delivery. The edge function only
 * ever acts on the caller's own account (derived from their JWT) - same
 * pattern ForcePasswordChangePage.tsx uses for the mandatory first-login reset.
 */
export function ChangePasswordCard({ idPrefix = "change-password" }: Readonly<{ idPrefix?: string }>) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldError, setFieldError] = useState<{ field: "new-password" | "confirm-password"; message: string } | null>(null);

  const newPasswordId = `${idPrefix}-new-password`;
  const confirmPasswordId = `${idPrefix}-confirm-password`;
  const headingId = `${idPrefix}-heading`;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      setFieldError({ field: "new-password", message: "Password must be at least 8 characters." });
      document.getElementById(newPasswordId)?.focus();
      return;
    }
    if (password !== confirmPassword) {
      setFieldError({ field: "confirm-password", message: "Passwords do not match." });
      document.getElementById(confirmPasswordId)?.focus();
      return;
    }
    setFieldError(null);
    setIsSaving(true);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- supabase-js's FunctionsError union resolves loosely here
    const { data, error: invokeError } = await supabase.functions.invoke<{ success: boolean; message?: string }>(
      "set-own-password",
      { body: { password } }
    );

    setIsSaving(false);

    if (invokeError || !data?.success) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- same loosely-typed FunctionsResponse as above
      toast.error(data?.message || invokeError?.message || "Failed to update password.");
      return;
    }

    toast.success("Password updated successfully.");
    setPassword("");
    setConfirmPassword("");
  };

  const newPasswordError = fieldError?.field === "new-password" ? fieldError.message : undefined;
  const confirmPasswordError = fieldError?.field === "confirm-password" ? fieldError.message : undefined;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2 border-b border-border pb-4">
        <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
        <h3 id={headingId} className="text-lg font-black text-foreground">Change Password</h3>
      </div>
      <form onSubmit={(e) => void handleSubmit(e)} aria-labelledby={headingId} className="mt-5 space-y-5" noValidate>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={newPasswordId}>New Password</Label>
            <div className="relative">
              <input
                id={newPasswordId}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                aria-invalid={!!newPasswordError}
                aria-describedby={newPasswordError ? `${newPasswordId}-error` : undefined}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (fieldError) setFieldError(null); }}
                placeholder="At least 8 characters"
                className={cn(
                  "h-11 w-full rounded-xl border border-border bg-muted/50 px-3.5 pr-10 text-sm font-medium outline-none focus:border-secondary focus:bg-card",
                  newPasswordError && "border-destructive focus:border-destructive"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-controls={`${newPasswordId} ${confirmPasswordId}`}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
            {newPasswordError && (
              <p id={`${newPasswordId}-error`} role="alert" className="flex items-center gap-1.5 text-xs font-semibold text-destructive-text">
                <AlertCircle size={12} aria-hidden="true" />
                {newPasswordError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={confirmPasswordId}>Confirm New Password</Label>
            <input
              id={confirmPasswordId}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              aria-invalid={!!confirmPasswordError}
              aria-describedby={confirmPasswordError ? `${confirmPasswordId}-error` : undefined}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); if (fieldError) setFieldError(null); }}
              placeholder="Re-enter your new password"
              className={cn(
                "h-11 w-full rounded-xl border border-border bg-muted/50 px-3.5 text-sm font-medium outline-none focus:border-secondary focus:bg-card",
                confirmPasswordError && "border-destructive focus:border-destructive"
              )}
            />
            {confirmPasswordError && (
              <p id={`${confirmPasswordId}-error`} role="alert" className="flex items-center gap-1.5 text-xs font-semibold text-destructive-text">
                <AlertCircle size={12} aria-hidden="true" />
                {confirmPasswordError}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isSaving}
            aria-busy={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {isSaving ? "Updating…" : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}
