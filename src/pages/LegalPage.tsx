import { usePageMeta } from "@/hooks/usePageMeta";
import { SectionShell } from "@/components/common/SectionShell";

export default function LegalPage({ title }: Readonly<{ title: string }>) {
  usePageMeta(title);

  return (
    <main>
      <SectionShell>
        <article className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-4xl font-black text-foreground">{title}</h1>
          <p className="mt-6 leading-8 text-muted-foreground">
            This page is prepared for production legal review. Final policy language should be approved before commercial launch.
          </p>
          <p className="mt-4 leading-8 text-muted-foreground">
            For questions, contact SkillGuru through the official contact channels listed on the website.
          </p>
        </article>
      </SectionShell>
    </main>
  );
}
