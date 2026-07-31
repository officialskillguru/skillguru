import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { routes } from "@/lib/routes";
import { Logo } from "@/components/common/Logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [sent, setSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    const result = await resetPassword(data.email);
    // Always show the same success state regardless of whether the email
    // exists — this prevents account enumeration via response differences.
    setSubmittedEmail(data.email);
    setSent(true);
    if (!result.success) {
      // Still shown as "sent" to the user; log for diagnostics only.
      console.error("resetPassword failed", result.error);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="mb-8">
        <Logo className="justify-center" />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        {sent ? (
          <div className="text-center">
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle size={32} className="text-primary" aria-hidden="true" />
            </div>
            <h1 className="mb-2 text-2xl font-black text-foreground">Check your inbox</h1>
            <p className="mb-6 text-muted-foreground">
              If an account exists for <span className="font-semibold text-foreground">{submittedEmail}</span>, we've sent a link to reset your password.
            </p>
            <Link
              to={routes.login}
              className="inline-flex items-center gap-1.5 rounded font-medium text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mb-2 text-2xl font-black text-foreground">Forgot your password?</h1>
            <p className="mb-6 text-muted-foreground">Enter your email address and we'll send you a link to reset your password.</p>

            <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }} className="space-y-5" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="forgot-email">Email Address</Label>
                <div className="relative">
                  <Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="pl-10.5"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "forgot-email-error" : undefined}
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p id="forgot-email-error" className="text-sm text-destructive" role="alert">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm">
              <Link
                to={routes.login}
                className="inline-flex items-center gap-1.5 rounded font-medium text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
