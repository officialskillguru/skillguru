import { CheckCircle2 } from "lucide-react";

import { CTAButton } from "@/components/common/CTAButton";
import { routes } from "@/lib/routes";
import type { Course } from "@/types/platform";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "INR",
  }).format(value);
}

export function PricingCard({ course }: Readonly<{ course: Course }>) {
  return (
    <article className="premium-pricing-card rounded-[20px] border border-[#DDE7F6] bg-white p-6 shadow-[0_22px_70px_rgba(10,42,136,0.12)] sm:p-7">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-3xl font-black text-[#111E79]">{formatPrice(course.price)}</p>
        <p className="text-sm font-bold text-[#94A3B8] line-through">
          {formatPrice(course.oldPrice)}
        </p>
        <span className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-black text-[#22C55E]">
          {course.discount}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold text-[#64748B]">EMI starts at INR 2,083/month</p>
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
      <div className="mt-6 space-y-3">
        {[
          course.duration,
          "Live Classes + Recorded Videos",
          "Hands-on Projects",
          "Certificate of Completion",
          course.placementSupport,
        ].map((item) => (
          <p key={item} className="flex gap-3 text-sm font-semibold text-[#334155]">
            <CheckCircle2 className="size-5 shrink-0 text-[#5B35F2]" />
            {item}
          </p>
        ))}
      </div>
    </article>
  );
}
