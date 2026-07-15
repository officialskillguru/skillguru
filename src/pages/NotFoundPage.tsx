import { CTAButton } from "@/components/common/CTAButton";
import { SectionShell } from "@/components/common/SectionShell";
import { routes } from "@/lib/routes";

export default function NotFoundPage() {
  return (
    <main>
      <SectionShell tone="dark">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-accent">404</p>
          <h1 className="mt-5 text-5xl font-black">Page not found</h1>
          <p className="mt-5 text-white/70">The page you are looking for has moved or no longer exists.</p>
          <CTAButton to={routes.home} className="mt-8">Return home</CTAButton>
        </div>
      </SectionShell>
    </main>
  );
}
