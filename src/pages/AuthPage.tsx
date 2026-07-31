import { useState, useEffect, useId, useRef } from "react";
import { Navigate, useNavigate, useLocation, Link } from "react-router-dom";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { loginSchema, signupSchema, type LoginFormData, type SignupFormData } from "@/schemas/auth.schema";
import { routes } from "@/lib/routes";
import { RouteResolver } from "@/routes/RouteResolver";
import { RateLimitError } from "@/utils/result";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/common/Logo";
import { cn } from "@/lib/utils";

// ─── Shared Input Field ─────────────────────────────────────────────────────
interface InputFieldProps {
  id: string;
  label: string;
  type?: string;
  icon: React.ReactNode;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
  registration: UseFormRegisterReturn;
  rightElement?: React.ReactNode;
}

function InputField({ id, label, type = "text", icon, error, placeholder, autoComplete, registration, rightElement }: InputFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted-foreground">{icon}</span>
        <Input
          id={id}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "h-12 rounded-xl pl-10",
            rightElement && "pr-10",
            error && "border-destructive focus-visible:ring-destructive"
          )}
          {...registration}
        />
        {rightElement && <span className="absolute inset-y-0 right-3 flex items-center">{rightElement}</span>}
      </div>
      {error && (
        <p id={errorId} role="alert" className="flex items-center gap-1.5 text-xs font-semibold text-destructive-text">
          <AlertCircle size={12} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Login Form ────────────────────────────────────────────────────────────────
function LoginForm({ onSwitchToSignup }: { onSwitchToSignup: () => void }) {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const rememberId = useId();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const onSubmit = async (data: LoginFormData) => {
    const result = await login(data);
    if (!result.success) {
      toast.error(result.error.message || "Login failed. Please check your credentials.");
      return;
    }
    toast.success("Welcome back.");
    // Navigation is intentionally NOT done here — login() only starts the auth
    // state machine; the role-bearing identity (highestRole) isn't loaded yet
    // at this point. The top-level AuthPage component redirects once
    // status === "READY" with the freshly-loaded authUser, using
    // RouteResolver.getDashboard() so every role lands on its own dashboard.
  };

  return (
    <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }} className="space-y-5" noValidate>
      <InputField
        id="login-email"
        label="Email Address"
        type="email"
        icon={<Mail size={16} aria-hidden="true" />}
        placeholder="you@example.com"
        autoComplete="email"
        error={errors.email?.message}
        registration={register("email")}
      />
      <InputField
        id="login-password"
        label="Password"
        type={showPassword ? "text" : "password"}
        icon={<Lock size={16} aria-hidden="true" />}
        placeholder="Enter your password"
        autoComplete="current-password"
        error={errors.password?.message}
        registration={register("password")}
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        }
      />

      <div className="flex items-center justify-between">
        <label htmlFor={rememberId} className="flex cursor-pointer items-center gap-2">
          <input id={rememberId} type="checkbox" className="size-4 rounded border-input accent-primary" {...register("rememberMe")} />
          <span className="text-sm font-medium text-muted-foreground">Remember me</span>
        </label>
        <Link
          to="/forgot-password"
          className="rounded text-sm font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Forgot password?
        </Link>
      </div>

      <button
        id="login-submit-btn"
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold tracking-wide text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:scale-100 disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            Signing in…
          </>
        ) : (
          <>
            Sign In
            <ArrowRight size={16} aria-hidden="true" />
          </>
        )}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="rounded font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Create one free
        </button>
      </p>
    </form>
  );
}

// ─── Signup Form ───────────────────────────────────────────────────────────────
function SignupForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { signupStudent } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    resolver: zodResolver(signupSchema) as any,
    // Public signup is student-only — mentor accounts are provisioned exclusively
    // by an admin via the Admin Dashboard (create-mentor Edge Function).
    defaultValues: { fullName: "", email: "", password: "", role: "student" as const },
  });

  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [rateLimitedEmail, setRateLimitedEmail] = useState<string | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (cooldownRemaining > 0) {
      interval = setInterval(() => {
        setCooldownRemaining((prev) => Math.max(0, prev - 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  const onSubmit = async (data: SignupFormData) => {
    setCooldownRemaining(0);
    setRateLimitedEmail(null);

    const result = await signupStudent(data);

    if (!result.success) {
      if (result.error.code === "RATE_LIMIT_ERROR") {
        const retryAfterMs = result.error instanceof RateLimitError ? result.error.retryAfterMs : 60000;
        setCooldownRemaining(retryAfterMs);
        setRateLimitedEmail(data.email);
        return;
      }

      if (result.error.code === "CONFLICT_ERROR") {
        toast.error("An account with this email already exists.", {
          action: { label: "Sign In Instead", onClick: onSwitchToLogin },
        });
        return;
      }

      toast.error(result.error.message || "Signup failed. Please try again.");
      return;
    }

    const params = new URLSearchParams();
    params.set("email", data.email);
    void navigate(`${routes.verifyEmail}?${params.toString()}`, { replace: true });
  };

  return (
    <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }} className="space-y-5" noValidate>
      {cooldownRemaining > 0 && (
        <div role="status" className="rounded-xl border border-warning/30 bg-warning/10 p-4">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 shrink-0 text-warning" size={18} aria-hidden="true" />
            <div>
              <h3 className="text-sm font-bold text-foreground">Please wait</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You've requested too many verification emails. Please wait {Math.ceil(cooldownRemaining / 1000)} seconds before trying again.
              </p>
              {rateLimitedEmail && (
                <Link
                  to={`${routes.verifyEmail}?email=${encodeURIComponent(rateLimitedEmail)}`}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
                >
                  Continue to Verify Email <ArrowRight size={14} aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <InputField
        id="signup-name"
        label="Full Name"
        icon={<User size={16} aria-hidden="true" />}
        placeholder="John Doe"
        autoComplete="name"
        error={errors.fullName?.message}
        registration={register("fullName")}
      />
      <InputField
        id="signup-email"
        label="Email Address"
        type="email"
        icon={<Mail size={16} aria-hidden="true" />}
        placeholder="you@example.com"
        autoComplete="email"
        error={errors.email?.message}
        registration={register("email")}
      />
      <InputField
        id="signup-password"
        label="Password"
        type={showPassword ? "text" : "password"}
        icon={<Lock size={16} aria-hidden="true" />}
        placeholder="At least 8 characters"
        autoComplete="new-password"
        error={errors.password?.message}
        registration={register("password")}
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        }
      />

      <button
        id="signup-submit-btn"
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold tracking-wide text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:scale-100 disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            Creating account…
          </>
        ) : (
          <>
            Create Account
            <ArrowRight size={16} aria-hidden="true" />
          </>
        )}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        By signing up you agree to our{" "}
        <Link to={routes.terms} className="rounded font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Terms</Link>{" "}
        and{" "}
        <Link to={routes.privacyPolicy} className="rounded font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Privacy Policy</Link>
      </p>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="rounded font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Sign in instead
        </button>
      </p>
    </form>
  );
}

// ─── Trust Badges ─────────────────────────────────────────────────────────────
const TRUST_ITEMS = [
  "10,000+ learners trust us",
  "Industry-expert mentors",
  "Placement assistance included",
];

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AuthPage() {
  const { session, isInitializing, status, authUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isSignupPath = location.pathname === routes.signup;
  const [mode, setMode] = useState<"login" | "signup">(isSignupPath ? "signup" : "login");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isFirstRender = useRef(true);

  const switchToSignup = () => {
    setMode("signup");
    void navigate(routes.signup, { replace: true });
  };
  const switchToLogin = () => {
    setMode("login");
    void navigate(routes.login, { replace: true });
  };

  // Move focus to the heading when the mode changes so screen reader users
  // are told the form/heading just changed, instead of focus silently
  // staying on the tab button they just activated.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [mode]);

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, tab: "login" | "signup") => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    // Only two tabs exist, so any arrow/Home/End press just targets the other one.
    const nextTab: "login" | "signup" = tab === "login" ? "signup" : "login";
    if (nextTab === "login") switchToLogin();
    else switchToSignup();
    document.getElementById(`auth-tab-${nextTab}`)?.focus();
  };

  if (session && status === "READY") {
    const from = (location.state as { from?: string } | null)?.from ?? RouteResolver.getDashboard(authUser);
    return <Navigate to={from} replace />;
  }

  if (isInitializing || status === "LOADING_PROFILE") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} aria-hidden="true" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Left Panel: Branding (desktop only) ─────────────── */}
      <aside className="relative hidden overflow-hidden bg-sidebar lg:flex lg:w-[45%] xl:w-[42%] flex-col" aria-hidden="true">
        <div className="relative z-10 flex h-full flex-col px-12 py-10">
          <Logo onDark imageClassName="h-9" />

          <div className="flex flex-1 flex-col justify-center">
            <p className="mb-4 text-sm font-bold uppercase tracking-widest text-secondary">Transform Your Career</p>
            <h2 className="mb-6 text-4xl font-black leading-[1.1] text-white xl:text-5xl">
              Learn from the <span className="brand-gradient bg-clip-text text-transparent">best minds</span> in the industry
            </h2>
            <p className="max-w-sm text-base leading-relaxed text-sidebar-foreground/70">
              Join thousands of professionals upgrading their skills with expert-led courses and guaranteed placement support.
            </p>

            <div className="mt-10 space-y-3">
              {TRUST_ITEMS.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle size={15} className="text-secondary" />
                  <span className="text-sm font-medium text-sidebar-foreground/80">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <blockquote className="border-l-2 border-secondary/50 pl-5">
            <p className="text-sm italic leading-relaxed text-sidebar-foreground/70">
              "SkillGuru helped me land my dream job within 3 months. The mentors are absolutely incredible."
            </p>
            <cite className="mt-2 block text-xs font-semibold not-italic text-secondary">— Priya S., Software Engineer at Google</cite>
          </blockquote>
        </div>
      </aside>

      {/* ── Right Panel: Auth Form ───────────────────────────── */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-10">
        <div className="mb-8 lg:hidden">
          <Logo imageClassName="h-9" />
        </div>

        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <div role="tablist" aria-label="Authentication mode" className="flex border-b border-border">
              {(["login", "signup"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  id={`auth-tab-${tab}`}
                  role="tab"
                  aria-selected={mode === tab}
                  aria-controls="auth-form-panel"
                  tabIndex={mode === tab ? 0 : -1}
                  onClick={() => (tab === "login" ? switchToLogin() : switchToSignup())}
                  onKeyDown={(e) => handleTabKeyDown(e, tab)}
                  className={cn(
                    "flex-1 py-4 text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    mode === tab ? "border-b-2 border-primary bg-primary/5 text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab === "login" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>

            <div id="auth-form-panel" role="tabpanel" aria-labelledby={`auth-tab-${mode}`} tabIndex={0} className="px-7 py-8">
              <div className="mb-6">
                <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-black text-foreground outline-none">
                  {mode === "login" ? "Welcome back" : "Get started free"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {mode === "login" ? "Sign in to access your courses and progress" : "Create your account and start learning today"}
                </p>
              </div>

              {mode === "login" ? <LoginForm onSwitchToSignup={switchToSignup} /> : <SignupForm onSwitchToLogin={switchToLogin} />}
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to={routes.home} className="rounded font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
