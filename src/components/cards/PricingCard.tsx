import { CheckCircle2 } from "lucide-react";

import { CTAButton } from "@/components/common/CTAButton";
import { routes } from "@/lib/routes";
import type { Course } from "@/types/platform";
import { useCheckEnrollment } from "@/hooks/student/useCheckEnrollment";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "INR",
  }).format(value);
}

export function PricingCard({ course }: Readonly<{ course: Course }>) {
  const { data: enrollmentData, isLoading } = useCheckEnrollment(course.slug);
  const isEnrolled = enrollmentData?.isEnrolled;
  const courseId = enrollmentData?.courseId;

  return (
    <article className="premium-pricing-card rounded-[20px] border border-border bg-white p-6 shadow-[0_22px_70px_rgba(10,42,136,0.12)] sm:p-7">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-3xl font-black text-primary">{formatPrice(course.price)}</p>
        <p className="text-sm font-bold text-slate-400 line-through">
          {formatPrice(course.oldPrice)}
        </p>
        <span className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-500">
          {course.discount}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold text-muted-foreground">EMI starts at INR 2,083/month</p>
      
      {isLoading ? (
        <div className="mt-6 h-[46px] w-full animate-pulse rounded-md bg-muted" />
      ) : isEnrolled && courseId ? (
        <CTAButton to={`/dashboard/courses/${courseId}`} className="premium-magnetic mt-6 w-full bg-emerald-600 hover:bg-emerald-700">
          Go to Course
        </CTAButton>
      ) : (
        <>
          <CTAButton to={routes.demoBooking} className="premium-magnetic mt-6 w-full">
            Enroll Now
          </CTAButton>
          <CTAButton
            to={routes.freeCounselling}
            variant="secondary"
            className="premium-magnetic mt-3 w-full"
          >
            Book Free Demo
          </CTAButton>
        </>
      )}

      <div className="mt-6 space-y-3">
        {[
          course.duration,
          "Live Classes + Recorded Videos",
          "Hands-on Projects",
          "Certificate of Completion",
          course.placementSupport,
        ].map((item) => (
          <p key={item} className="flex gap-3 text-sm font-semibold text-slate-700">
            <CheckCircle2 className="size-5 shrink-0 text-secondary" />
            {item}
          </p>
        ))}
      </div>
    </article>
  );
}
