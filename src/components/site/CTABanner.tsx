import { CheckCircle2 } from "lucide-react";

import { CTAButton } from "@/components/common/CTAButton";
import { routes } from "@/lib/routes";

export function CTABanner({
  title = "Ready to Start Your Career Transformation?",
  description = "Our experts are ready to guide you towards your dream career.",
}: Readonly<{ title?: string; description?: string }>) {
  return (
    <section className="bg-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="brand-gradient relative mx-auto max-w-[1280px] overflow-hidden rounded-[20px] p-7 text-white shadow-[0_24px_80px_rgba(10,42,136,0.22)] sm:p-9">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_86%_26%,rgba(25,217,255,0.36),transparent_21rem)]" />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="max-w-xl text-3xl font-black leading-tight sm:text-4xl">{title}</h2>
            <p className="mt-3 max-w-lg text-sm leading-7 text-white/72">{description}</p>
            <div className="mt-6 flex flex-wrap gap-3 text-xs font-bold text-white/75">
              {["Expert Mentors", "Placement Assistance", "Interview Preparation"].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-accent" />
                  {item}
                </span>
              ))}
            </div>
          </div>
          <CTAButton to={routes.freeCounselling} className="shrink-0 bg-accent text-primary hover:bg-white">
            Book Free Counselling
          </CTAButton>
        </div>
      </div>
    </section>
  );
}
