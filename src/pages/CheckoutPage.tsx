import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ChevronLeft, Clock, CreditCard, Landmark, Loader2, Lock, ShieldCheck, Smartphone } from "lucide-react";

import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuth } from "@/hooks/useAuth";
import { useCourseBySlug } from "@/hooks/student/useCourseBySlug";
import { useCheckEnrollment } from "@/hooks/student/useCheckEnrollment";
import { useCourseSchedule } from "@/hooks/useLiveClasses";
import { paymentService, CheckoutError, type CheckoutSession } from "@/services/payment.service";
import {
  checkoutDetailsSchema,
  effectiveCoursePrice,
  formatInr,
  isCheckoutField,
  UPI_ID_PATTERN,
  type CheckoutDetails,
  type CheckoutDetailsInput,
  type CheckoutField,
  type PaymentMethod,
} from "@/features/checkout/checkout-schema";
import { ScheduleList } from "@/components/live-classes/CourseSchedule";
import { PageLoader } from "@/components/common/PageLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { routes } from "@/lib/routes";

type Step = "details" | "review" | "payment";
type Outcome = "success" | "declined" | "pending";
type Phase =
  | { kind: "form" }
  | { kind: "processing"; label: string }
  | { kind: "success"; orderId: string; invoiceNumber: string | null; duplicateNote?: string }
  | { kind: "declined"; orderId: string; message: string }
  | { kind: "pending"; orderId: string };

/** Specific guidance for fields the server rejected (create-order returns field codes only). */
const SERVER_FIELD_MESSAGES: Record<"fullName" | "email" | "phone" | "city", string> = {
  fullName: "Enter your full name as it should appear on the receipt.",
  email: "Enter a valid email address, for example name@example.com.",
  phone: "Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9.",
  city: "Enter your city.",
};

const STEPS: Array<{ key: Step; label: string }> = [
  { key: "details", label: "Your details" },
  { key: "review", label: "Review order" },
  { key: "payment", label: "Payment" },
];

const METHODS: Array<{ key: PaymentMethod; label: string; hint: string; Icon: typeof Smartphone }> = [
  { key: "upi", label: "UPI", hint: "Pay with any UPI app", Icon: Smartphone },
  { key: "card", label: "Debit / Credit card", hint: "Simulated test card •••• 4242", Icon: CreditCard },
  { key: "netbanking", label: "Net banking", hint: "Simulated bank: SkillGuru Demo Bank", Icon: Landmark },
];

const OUTCOMES: Array<{ key: Outcome; label: string; hint: string }> = [
  { key: "success", label: "Approve", hint: "Bank approves the payment" },
  { key: "declined", label: "Decline", hint: "Issuing bank declines it" },
  { key: "pending", label: "Bank pending", hint: "Bank confirms later via callback" },
];

function shortRef(id: string) {
  return id.replace(/-/g, "").slice(0, 10).toUpperCase();
}

function StepIndicator({ step }: Readonly<{ step: Step }>) {
  const current = STEPS.findIndex((s) => s.key === step);
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs font-bold" aria-label="Checkout progress">
      {STEPS.map((s, i) => (
        <li key={s.key} aria-current={i === current ? "step" : undefined} className="flex items-center gap-2">
          <span
            className={[
              "flex size-6 items-center justify-center rounded-full border text-[11px]",
              i < current ? "border-success bg-success text-success-foreground" : i === current ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
            ].join(" ")}
            aria-hidden="true"
          >
            {i < current ? "✓" : i + 1}
          </span>
          <span className={i === current ? "text-foreground" : "text-muted-foreground"}>
            {s.label}
            {i < current ? <span className="sr-only"> (completed)</span> : null}
          </span>
          {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}

function FieldError({ id, message }: Readonly<{ id: string; message?: string }>) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs font-semibold text-destructive-text">
      {message}
    </p>
  );
}

export default function CheckoutPage() {
  usePageMeta("Checkout");
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, authUser } = useAuth();
  const { data: course, isLoading: courseLoading } = useCourseBySlug(slug);
  const { data: enrollment, isLoading: enrollmentLoading } = useCheckEnrollment(slug ?? "");
  const { data: schedule } = useCourseSchedule(course?.id);

  const [step, setStep] = useState<Step>("details");
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [details, setDetails] = useState<CheckoutDetails | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [upiId, setUpiId] = useState("riya.sharma@okdemo");
  const [upiError, setUpiError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome>("success");
  const [startError, setStartError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const ids = { name: useId(), email: useId(), phone: useId(), city: useId(), upi: useId() };

  const form = useForm<CheckoutDetailsInput, unknown, CheckoutDetails>({
    resolver: zodResolver(checkoutDetailsSchema),
    // Validate on submit, then live on change: no error text appears on blur, so the
    // Continue button never shifts under the pointer mid-click.
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { fullName: "", email: "", phone: "", city: "" },
  });
  const { register, handleSubmit, formState, reset, setError } = form;
  // Read formState fields unconditionally so react-hook-form subscribes to them.
  const { submitCount } = formState;
  const errorCount = Object.keys(formState.errors).length;

  // Prefill once from the signed-in student's profile (fields stay editable).
  const [prefilled, setPrefilled] = useState(false);
  if (!prefilled && authUser) {
    setPrefilled(true);
    reset({
      fullName: authUser.profile.fullName ?? "",
      email: authUser.profile.email ?? user?.email ?? "",
      phone: authUser.profile.phone ?? "",
      city: authUser.profile.city ?? "",
    });
  }

  // Move focus to the step heading on every step/result change for screen reader and keyboard users.
  const focusKey = phase.kind === "processing" ? null : `${step}:${phase.kind}`;
  useEffect(() => {
    // Skip the transient processing phase so focus stays on the button that was pressed.
    if (focusKey) headingRef.current?.focus();
  }, [focusKey]);

  // After a server 422 sends the student back to "Your details", focus the first
  // rejected field once that step has mounted (runs after the heading focus above).
  const pendingFieldFocus = useRef<CheckoutField | null>(null);
  useEffect(() => {
    if (pendingFieldFocus.current && focusKey === "details:form") {
      form.setFocus(pendingFieldFocus.current);
      pendingFieldFocus.current = null;
    }
  }, [focusKey, form]);

  if (courseLoading || enrollmentLoading) return <PageLoader />;

  if (!course || course.status !== "published") {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-black text-foreground">This course is not available</h1>
        <p className="mt-2 text-sm text-muted-foreground">It may have been unpublished or the link is incorrect.</p>
        <Link to={routes.courses} className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          Browse courses
        </Link>
      </main>
    );
  }

  const price = effectiveCoursePrice(course.price, course.discountPrice);
  const learnUrl = `${routes.dashboard}/courses/${course.id}`;
  const upcoming = (schedule ?? []).filter((s) => s.status !== "completed");

  if (enrollment?.isEnrolled && phase.kind !== "success") {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <CheckCircle2 className="size-10 text-success" aria-hidden="true" />
        <h1 className="mt-3 text-2xl font-black text-foreground">You&apos;re already enrolled</h1>
        <p className="mt-2 text-sm text-muted-foreground">{course.title} is in your learning dashboard.</p>
        <Link to={learnUrl} className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          Go to course
        </Link>
      </main>
    );
  }

  if (!price) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-black text-foreground">This course is free</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enroll directly from the course page.</p>
        <Link to={`/courses/${course.slug}`} className="mt-6 text-sm font-bold text-primary underline">Back to course</Link>
      </main>
    );
  }

  const invalidateLearning = () => {
    void queryClient.invalidateQueries({ queryKey: ["student-courses"] });
    void queryClient.invalidateQueries({ queryKey: ["check-enrollment-by-slug"] });
    void queryClient.invalidateQueries({ queryKey: ["student-live-classes"] });
    void queryClient.invalidateQueries({ queryKey: ["my-orders"] });
  };

  const applyServerFieldErrors = (err: unknown): boolean => {
    if (err instanceof CheckoutError && err.status === 422 && err.fields.some(isCheckoutField)) {
      setStep("details");
      const rejected = err.fields.filter(isCheckoutField);
      for (const f of rejected) setError(f, { type: "server", message: SERVER_FIELD_MESSAGES[f] });
      pendingFieldFocus.current = rejected[0] ?? null;
      return true;
    }
    return false;
  };

  /** Creates (or resumes) the pending order for the current details and moves to payment. */
  const startPayment = async (forDetails: CheckoutDetails) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setStartError(null);
    setPhase({ kind: "processing", label: "Preparing secure payment…" });
    try {
      const res = await paymentService.createOrder(course.id, forDetails);
      if (!res.success) {
        if (!applyServerFieldErrors(res.error)) setStartError(res.error.message);
        setPhase({ kind: "form" });
        return;
      }
      setSession(res.data);
      setPhase({ kind: "form" });
      setStep("payment");
    } finally {
      inFlight.current = false;
    }
  };

  const onDetailsSubmit = (values: CheckoutDetails) => {
    setDetails(values);
    setStep("review");
  };

  const pay = async () => {
    if (!session || inFlight.current) return;
    if (method === "upi" && !UPI_ID_PATTERN.test(upiId.trim())) {
      setUpiError("Enter a UPI ID in the form name@bank (simulated — no real UPI request is sent).");
      requestAnimationFrame(() => document.getElementById(ids.upi)?.focus());
      return;
    }
    setUpiError(null);
    inFlight.current = true;
    setPhase({ kind: "processing", label: "Processing payment…" });
    try {
      if (session.provider !== "mock") {
        // Real provider: the Razorpay widget drives the outcome.
        await paymentService.openCheckout(
          session,
          { name: details?.fullName, email: details?.email, phone: details?.phone },
          (paymentId, providerOrderId, signature) => {
            void paymentService.verifyPayment(session.orderId, providerOrderId, paymentId, signature, method).then((r) => {
              if (r.success) {
                invalidateLearning();
                setPhase({ kind: "success", orderId: session.orderId, invoiceNumber: r.data.invoiceNumber ?? null });
              } else {
                setPhase({ kind: "declined", orderId: session.orderId, message: r.error.message });
              }
            });
          },
          () => setPhase({ kind: "form" }),
        );
        return;
      }

      if (outcome === "success" && session.mockPayment) {
        const r = await paymentService.verifyPayment(session.orderId, session.providerOrderId, session.mockPayment.providerPaymentId, session.mockPayment.signature, method);
        if (!r.success) {
          setPhase({ kind: "declined", orderId: session.orderId, message: r.error.message });
          return;
        }
        invalidateLearning();
        setPhase({ kind: "success", orderId: session.orderId, invoiceNumber: r.data.invoiceNumber ?? null });
        return;
      }

      const r = await paymentService.simulateOutcome(session.orderId, outcome === "declined" ? "declined" : "pending", method);
      if (!r.success) {
        setPhase({ kind: "declined", orderId: session.orderId, message: r.error.message });
        return;
      }
      if (outcome === "declined") {
        void queryClient.invalidateQueries({ queryKey: ["my-orders"] });
        setPhase({ kind: "declined", orderId: session.orderId, message: "Your bank declined this payment. You have not been charged." });
      } else {
        setPhase({ kind: "pending", orderId: session.orderId });
      }
    } finally {
      inFlight.current = false;
    }
  };

  const confirmPending = async (orderId: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPhase({ kind: "processing", label: "Receiving bank confirmation…" });
    try {
      const r = await paymentService.simulateOutcome(orderId, "confirm");
      if (!r.success) {
        setPhase({ kind: "pending", orderId });
        setStartError(r.error.message);
        return;
      }
      invalidateLearning();
      setPhase({ kind: "success", orderId, invoiceNumber: r.data.invoiceNumber ?? null });
    } finally {
      inFlight.current = false;
    }
  };

  const checkPendingStatus = async (orderId: string) => {
    setStartError(null);
    const r = await paymentService.getMyOrders();
    const order = r.success ? r.data.find((o) => o.id === orderId) : undefined;
    if (order?.status === "completed") {
      invalidateLearning();
      setPhase({ kind: "success", orderId, invoiceNumber: order.invoiceNumber });
    } else if (order?.status === "failed") {
      setPhase({ kind: "declined", orderId, message: order.failureReason ?? "The payment failed." });
    } else {
      setStartError("Still waiting for the bank. Course access unlocks automatically once the payment is confirmed.");
    }
  };

  /** Demo check: replay the success confirmation and the bank callback for an already-paid order. */
  const replayConfirmation = async (orderId: string, invoiceNumber: string | null) => {
    if (!session?.mockPayment || inFlight.current) return;
    inFlight.current = true;
    try {
      const [verify, callback] = await Promise.all([
        paymentService.verifyPayment(orderId, session.providerOrderId, session.mockPayment.providerPaymentId, session.mockPayment.signature, method),
        paymentService.simulateOutcome(orderId, "confirm"),
      ]);
      const duplicates = [verify.success && verify.data.alreadyCompleted, callback.success && callback.data.alreadyCompleted].filter(Boolean).length;
      setPhase({
        kind: "success",
        orderId,
        invoiceNumber,
        duplicateNote:
          duplicates === 2
            ? `Both duplicate confirmations were recognised and ignored. Still one paid order, one enrollment and receipt ${invoiceNumber ?? ""}.`
            : "Duplicate check could not complete; refresh Payments & Receipts to confirm.",
      });
    } finally {
      inFlight.current = false;
    }
  };

  const retryAfterDecline = () => {
    setSession(null);
    if (details) void startPayment(details);
  };

  const processing = phase.kind === "processing";

  // ── Result screens ──────────────────────────────────────────────────────
  if (phase.kind === "success") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <CheckCircle2 className="size-10 text-success" aria-hidden="true" />
          <h1 ref={headingRef} tabIndex={-1} className="mt-3 text-2xl font-black text-foreground focus:outline-none">
            Payment successful — you&apos;re enrolled
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{course.title} is now in My Learning with its lessons and live class schedule.</p>
          <dl className="mt-6 grid gap-3 rounded-xl bg-muted/40 p-4 text-sm sm:grid-cols-2">
            <div><dt className="text-xs font-bold uppercase text-muted-foreground">Order reference</dt><dd className="font-mono font-bold text-foreground">{shortRef(phase.orderId)}</dd></div>
            <div><dt className="text-xs font-bold uppercase text-muted-foreground">Receipt</dt><dd className="font-mono font-bold text-foreground">{phase.invoiceNumber ?? "Generating…"}</dd></div>
            <div><dt className="text-xs font-bold uppercase text-muted-foreground">Amount paid</dt><dd className="font-bold text-foreground">{formatInr(price)}</dd></div>
            <div><dt className="text-xs font-bold uppercase text-muted-foreground">Method</dt><dd className="font-bold capitalize text-foreground">{METHODS.find((m) => m.key === method)?.label}</dd></div>
          </dl>
          <p className="mt-4 text-xs font-semibold text-muted-foreground">
            A confirmation is in your notifications (bell icon) and the receipt is saved under Payments &amp; Receipts. Class updates arrive in the same notifications.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" onClick={() => void navigate(learnUrl)}>Go to My Learning</Button>
            <Button type="button" variant="outline" onClick={() => void navigate(`${routes.dashboard}/live-classes`)}>View class schedule</Button>
            <Button type="button" variant="outline" onClick={() => void navigate(`${routes.dashboard}/payments`)}>View receipt</Button>
          </div>
          {session?.provider === "mock" && (
            <div className="mt-8 rounded-xl border border-dashed border-warning/60 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Presenter check (simulation)</p>
              <p className="mt-1 text-xs text-muted-foreground">Re-send the success confirmation and the bank callback for this order to show duplicates create nothing new.</p>
              <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => void replayConfirmation(phase.orderId, phase.invoiceNumber)}>
                Resend payment confirmation
              </Button>
              <p role="status" className="mt-2 text-xs font-semibold text-foreground empty:hidden">{phase.duplicateNote ?? ""}</p>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <Link to={`/courses/${course.slug}`} className="inline-flex items-center gap-1 rounded text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ChevronLeft className="size-4" aria-hidden="true" /> Back to course
      </Link>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-black uppercase tracking-wider text-muted-foreground">Checkout</p>
        <StepIndicator step={step} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7" aria-labelledby="checkout-step-heading">
          {phase.kind === "declined" ? (
            <div>
              <AlertTriangle className="size-9 text-destructive" aria-hidden="true" />
              <h1 id="checkout-step-heading" ref={headingRef} tabIndex={-1} className="mt-3 text-xl font-black text-foreground focus:outline-none">Payment declined</h1>
              <p className="mt-2 text-sm text-muted-foreground">{phase.message}</p>
              <p className="mt-1 text-sm text-muted-foreground">Course lessons and live classes stay locked until a payment succeeds. Your details are kept.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button type="button" onClick={retryAfterDecline} disabled={processing}>Retry payment</Button>
                <Button type="button" variant="outline" onClick={() => { setPhase({ kind: "form" }); setStep("details"); }}>Edit details</Button>
              </div>
            </div>
          ) : phase.kind === "pending" ? (
            <div>
              <Clock className="size-9 text-warning" aria-hidden="true" />
              <h1 id="checkout-step-heading" ref={headingRef} tabIndex={-1} className="mt-3 text-xl font-black text-foreground focus:outline-none">Waiting for bank confirmation</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your bank accepted the request but has not confirmed it yet. You will not be charged twice. Course access unlocks automatically when the bank confirms — you can leave this page and resume from Payments &amp; Receipts.
              </p>
              <p role="status" className="mt-3 text-sm font-semibold text-foreground empty:hidden">{startError ?? ""}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button type="button" variant="outline" onClick={() => void checkPendingStatus(phase.orderId)}>Check payment status</Button>
                <Button type="button" onClick={() => void confirmPending(phase.orderId)}>Simulate bank confirmation</Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">“Simulate bank confirmation” stands in for the payment provider’s callback in this simulation.</p>
            </div>
          ) : step === "details" ? (
            <form onSubmit={(e) => void handleSubmit(onDetailsSubmit)(e)} noValidate>
              <h1 id="checkout-step-heading" ref={headingRef} tabIndex={-1} className="text-xl font-black text-foreground focus:outline-none">Your details</h1>
              <p className="mt-1 text-sm text-muted-foreground">Used for your receipt and class updates. Prefilled from your profile.</p>
              {errorCount > 0 && submitCount > 0 && (
                <p role="alert" className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm font-semibold text-destructive-text">
                  Please fix the highlighted fields to continue.
                </p>
              )}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={ids.name}>Full name</Label>
                  <Input id={ids.name} autoComplete="name" aria-invalid={!!formState.errors.fullName} aria-describedby={formState.errors.fullName ? `${ids.name}-err` : undefined} {...register("fullName")} />
                  <FieldError id={`${ids.name}-err`} message={formState.errors.fullName?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={ids.email}>Email</Label>
                  <Input id={ids.email} type="email" autoComplete="email" aria-invalid={!!formState.errors.email} aria-describedby={formState.errors.email ? `${ids.email}-err` : undefined} {...register("email")} />
                  <FieldError id={`${ids.email}-err`} message={formState.errors.email?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={ids.phone}>Mobile number</Label>
                  <Input id={ids.phone} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" aria-invalid={!!formState.errors.phone} aria-describedby={`${ids.phone}-hint${formState.errors.phone ? ` ${ids.phone}-err` : ""}`} {...register("phone")} />
                  <p id={`${ids.phone}-hint`} className="text-xs text-muted-foreground">10-digit Indian mobile number.</p>
                  <FieldError id={`${ids.phone}-err`} message={formState.errors.phone?.message} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={ids.city}>City</Label>
                  <Input id={ids.city} autoComplete="address-level2" aria-invalid={!!formState.errors.city} aria-describedby={formState.errors.city ? `${ids.city}-err` : undefined} {...register("city")} />
                  <FieldError id={`${ids.city}-err`} message={formState.errors.city?.message} />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button type="submit">Continue to review</Button>
              </div>
            </form>
          ) : step === "review" ? (
            <div>
              <h1 id="checkout-step-heading" ref={headingRef} tabIndex={-1} className="text-xl font-black text-foreground focus:outline-none">Review your order</h1>
              <dl className="mt-5 divide-y divide-border rounded-xl border border-border text-sm">
                <div className="flex justify-between gap-4 px-4 py-3"><dt className="text-muted-foreground">Name</dt><dd className="text-right font-semibold text-foreground">{details?.fullName}</dd></div>
                <div className="flex justify-between gap-4 px-4 py-3"><dt className="text-muted-foreground">Email</dt><dd className="break-all text-right font-semibold text-foreground">{details?.email}</dd></div>
                <div className="flex justify-between gap-4 px-4 py-3"><dt className="text-muted-foreground">Mobile</dt><dd className="text-right font-semibold text-foreground">+91 {details?.phone}</dd></div>
                <div className="flex justify-between gap-4 px-4 py-3"><dt className="text-muted-foreground">City</dt><dd className="text-right font-semibold text-foreground">{details?.city}</dd></div>
              </dl>
              <h2 className="mt-6 text-sm font-black uppercase tracking-wide text-muted-foreground">Class schedule</h2>
              <div className="mt-2">
                {upcoming.length > 0 ? (
                  <ScheduleList sessions={upcoming} compact />
                ) : (
                  <p className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">Schedule to be announced — you will be notified when the first live class is scheduled.</p>
                )}
              </div>
              {startError && <p role="alert" className="mt-4 text-sm font-semibold text-destructive-text">{startError}</p>}
              <div className="mt-6 flex flex-wrap justify-between gap-3">
                <Button type="button" variant="outline" onClick={() => setStep("details")}>Edit details</Button>
                <Button type="button" onClick={() => details && void startPayment(details)} disabled={processing} aria-busy={processing}>
                  {processing ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Preparing…</> : `Continue to payment · ${formatInr(price)}`}
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h1 id="checkout-step-heading" ref={headingRef} tabIndex={-1} className="text-xl font-black text-foreground focus:outline-none">Payment</h1>
              {session?.provider === "mock" && (
                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <ShieldCheck className="size-3.5" aria-hidden="true" /> Simulated payment — no real money moves and no card or bank details are collected.
                </p>
              )}
              <p role="status" className="mt-2 text-xs font-semibold text-foreground empty:hidden">{session?.resumed ? "Resuming your earlier unpaid order for this course." : ""}</p>

              <fieldset className="mt-5">
                <legend className="text-sm font-bold text-foreground">Payment method</legend>
                <div className="mt-2 grid gap-2">
                  {METHODS.map(({ key, label, hint, Icon }) => (
                    <label key={key} className={["flex cursor-pointer items-center gap-3 rounded-xl border p-3 focus-within:ring-2 focus-within:ring-ring", method === key ? "border-primary bg-primary/5" : "border-border"].join(" ")}>
                      <input type="radio" name="payment-method" value={key} checked={method === key} onChange={() => setMethod(key)} className="size-4 accent-primary" />
                      <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                      <span className="text-sm font-semibold text-foreground">{label}</span>
                      <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">{hint}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {method === "upi" && (
                <div className="mt-4 space-y-1.5">
                  <Label htmlFor={ids.upi}>UPI ID (fictional)</Label>
                  <Input id={ids.upi} value={upiId} onChange={(e) => setUpiId(e.target.value)} aria-invalid={!!upiError} aria-describedby={upiError ? `${ids.upi}-err` : undefined} />
                  <FieldError id={`${ids.upi}-err`} message={upiError ?? undefined} />
                </div>
              )}

              {session?.provider === "mock" && (
                <fieldset className="mt-5 rounded-xl border border-dashed border-warning/60 p-3">
                  <legend className="px-1 text-xs font-black uppercase tracking-wide text-muted-foreground">Presenter control: bank response</legend>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {OUTCOMES.map((o) => (
                      <label key={o.key} className={["flex cursor-pointer flex-col rounded-lg border p-2.5 text-xs focus-within:ring-2 focus-within:ring-ring", outcome === o.key ? "border-primary bg-primary/5" : "border-border"].join(" ")}>
                        <span className="flex items-center gap-2 font-bold text-foreground">
                          <input type="radio" name="demo-outcome" value={o.key} checked={outcome === o.key} onChange={() => setOutcome(o.key)} className="size-3.5 accent-primary" />
                          {o.label}
                        </span>
                        <span className="mt-0.5 text-muted-foreground">{o.hint}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              <div className="mt-6 flex flex-wrap justify-between gap-3">
                <Button type="button" variant="outline" onClick={() => setStep("review")} disabled={processing}>Back</Button>
                <Button type="button" onClick={() => void pay()} disabled={processing || !session} aria-busy={processing} className="gap-2">
                  {processing ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" /> {phase.label}</> : <><Lock className="size-4" aria-hidden="true" /> Pay {formatInr(price)}</>}
                </Button>
              </div>
            </div>
          )}
          <p className="sr-only" role="status" aria-live="polite">{processing ? phase.label : ""}</p>
        </section>

        <aside aria-label="Order summary" className="h-fit rounded-2xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24">
          <h2 className="text-sm font-black uppercase tracking-wide text-muted-foreground">Order summary</h2>
          <p className="mt-3 font-bold text-foreground">{course.title}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="info" className="capitalize">{course.level.replace("_", " ")}</Badge>
            {course.duration && <Badge variant="muted">{course.duration}</Badge>}
          </div>
          <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Course fee</dt><dd className="font-semibold text-foreground">{formatInr(course.price ?? 0)}</dd></div>
            {price < (course.price ?? 0) && (
              <div className="flex justify-between"><dt className="text-muted-foreground">Discount</dt><dd className="font-semibold text-success">− {formatInr((course.price ?? 0) - price)}</dd></div>
            )}
            <div className="flex justify-between border-t border-border pt-2 text-base"><dt className="font-black text-foreground">Total (incl. taxes)</dt><dd className="font-black text-foreground">{formatInr(price)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">Price is confirmed by the server when your order is created.</p>
        </aside>
      </div>
    </main>
  );
}
