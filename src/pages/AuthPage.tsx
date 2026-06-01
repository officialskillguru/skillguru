import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3,
  BookOpenCheck,
  EyeOff,
  Github,
  GraduationCap,
  Linkedin,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import { Logo } from "@/components/common/Logo";
import { Footer } from "@/components/site/Footer";
import { Navbar } from "@/components/site/Navbar";
import { useAuth } from "@/context/AuthContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { assetUrl } from "@/lib/asset-url";
import { routes } from "@/lib/routes";

function getFormString(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

export default function AuthPage({ mode }: Readonly<{ mode: "login" | "signup" }>) {
  usePageMeta(mode === "login" ? "Login" : "Signup");
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);

    try {
      if (mode === "login") {
        await auth.signIn(getFormString(form, "email"), getFormString(form, "password"));
      } else {
        await auth.signUp(getFormString(form, "email"), getFormString(form, "password"), getFormString(form, "fullName"));
      }
      void navigate(routes.dashboard);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to continue.");
    }
  }

  const strength = Math.min(100, password.length * 10);

  return (
    <div className="min-h-svh bg-white">
      <Navbar />
      <main className="grid bg-white lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative min-h-170 overflow-hidden bg-[#061B5C] p-8 text-white sm:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_28%,rgba(25,217,255,0.25),transparent_28rem)]" />
          <div className="relative flex h-full flex-col">
            <Logo onDark imageClassName="h-12" />
            <div className="mt-20 max-w-xl">
              <h1 className="text-4xl font-black leading-tight sm:text-5xl">Welcome Back! <span className="block text-[#19D9FF]">Glad to see you again</span></h1>
              <p className="mt-6 text-base leading-8 text-white/76">
                Log in to access your learning dashboard, track your progress and continue your journey towards success.
              </p>
              <div className="mt-10 space-y-6">
                {[
                  { title: "Continue Learning", body: "Access your courses and learning materials", icon: GraduationCap },
                  { title: "Track Progress", body: "Monitor your learning progress and achievements", icon: BarChart3 },
                  { title: "Achieve Goals", body: "Stay motivated and achieve your career goals", icon: Trophy },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex gap-5">
                      <span className="grid size-14 shrink-0 place-items-center rounded-md bg-[#19D9FF]/12 text-[#19D9FF]">
                        <Icon className="size-7" />
                      </span>
                      <span>
                        <span className="block font-black">{item.title}</span>
                        <span className="mt-1 block max-w-xs text-sm leading-6 text-white/68">{item.body}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="relative mt-auto hidden min-h-64 lg:block">
              <img src={assetUrl("/assets/home/hero-career-roadmap-poster.jpg")} alt="" className="absolute inset-0 size-full rounded-3xl object-cover opacity-70" />
            </div>
          </div>
        </section>
        <section className="flex items-center justify-center bg-[#F8FAFF] px-4 py-12 sm:px-6 lg:px-8">
          <form onSubmit={(event) => void onSubmit(event)} className="w-full max-w-150 rounded-3xl border border-[#E5EAF5] bg-white p-7 shadow-[0_28px_90px_rgba(10,42,136,0.12)] sm:p-10">
            <div className="grid grid-cols-2 border-b border-[#E5EAF5] text-center text-xl font-black">
              <Link to={routes.login} className={mode === "login" ? "border-b-4 border-[#1147FF] px-4 pb-5 text-[#061B5C]" : "px-4 pb-5 text-[#64748B]"}>
                Login
              </Link>
              <Link to={routes.signup} className={mode === "signup" ? "border-b-4 border-[#1147FF] px-4 pb-5 text-[#061B5C]" : "px-4 pb-5 text-[#64748B]"}>
                Sign Up
              </Link>
            </div>
            <p className="mt-8 text-sm font-semibold text-[#64748B]">
              {mode === "login" ? "Welcome back! Please login to your account." : "Create your account and start your career journey."}
            </p>
            {mode === "signup" ? (
              <Field label="Full Name" icon={BookOpenCheck}>
                <input name="fullName" required placeholder="Enter your full name" className="w-full bg-transparent outline-none" />
              </Field>
            ) : null}
            <Field label="Email Address" icon={Mail}>
              <input name="email" required type="email" placeholder="Enter your email address" className="w-full bg-transparent outline-none" />
            </Field>
            <Field label="Password" icon={LockKeyhole} trailing={<EyeOff className="size-5 text-[#94A3B8]" />}>
              <input
                name="password"
                required
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-transparent outline-none"
              />
            </Field>
            {mode === "signup" ? (
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-[#E5EAF5]">
                  <div className="h-full rounded-full bg-[#1147FF]" style={{ width: `${strength}%` }} />
                </div>
                <p className="mt-2 text-xs font-semibold text-[#64748B]">Password strength</p>
              </div>
            ) : (
              <Link to={routes.contact} className="mt-5 block text-right text-sm font-black text-[#1147FF]">Forgot Password?</Link>
            )}
            <button type="submit" className="mt-7 inline-flex h-14 w-full items-center justify-center gap-3 rounded-md bg-[#1147FF] text-base font-black text-white shadow-[0_16px_42px_rgba(17,71,255,0.24)] transition hover:-translate-y-1 hover:bg-[#0A2A88]">
              {mode === "login" ? "Login" : "Create Account"} -&gt;
            </button>
            {error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p> : null}
            {!auth.configured ? <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-700">Supabase env is not configured, so auth actions are disabled.</p> : null}
            <div className="mt-10 flex items-center gap-5 text-sm text-[#64748B]">
              <span className="h-px flex-1 bg-[#E5EAF5]" />
              or {mode === "login" ? "login" : "sign up"} with
              <span className="h-px flex-1 bg-[#E5EAF5]" />
            </div>
            <div className="mt-8 grid grid-cols-4 gap-4">
              {[
                { label: "G" },
                { icon: Linkedin },
                { label: "M" },
                { icon: Github },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                <button key={index} type="button" className="grid h-16 place-items-center rounded-md border border-[#E5EAF5] bg-white text-2xl font-black text-[#061B5C] transition hover:-translate-y-1 hover:border-[#1147FF]">
                  {Icon ? <Icon className="size-6" /> : item.label}
                </button>
                );
              })}
            </div>
            <div className="mt-8 flex gap-4 rounded-2xl bg-[#F8FAFF] p-5">
              <ShieldCheck className="size-10 shrink-0 rounded-full bg-white p-2 text-[#1147FF]" />
              <div>
                <p className="font-black text-[#061B5C]">Your data is safe with us</p>
                <p className="mt-1 text-sm leading-6 text-[#64748B]">We use industry standard security measures to protect your information.</p>
              </div>
            </div>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  trailing,
  children,
}: Readonly<{
  label: string;
  icon: LucideIcon;
  trailing?: ReactNode;
  children: ReactNode;
}>) {
  return (
    <label className="mt-7 block">
      <span className="text-sm font-black text-[#061B5C]">{label}</span>
      <span className="mt-3 flex h-14 items-center gap-3 rounded-md border border-[#E5EAF5] px-4 text-sm text-[#061B5C] focus-within:border-[#1147FF]">
        <Icon className="size-5 shrink-0 text-[#64748B]" />
        {children}
        {trailing}
      </span>
    </label>
  );
}
