import { useId } from "react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { getActiveTemplates, type ResumeTemplateMetadata } from "../domain/templates";

/**
 * Template gallery as an accessible radio group. Only active, licence-reviewed
 * templates appear. With none available it says so plainly instead of showing
 * placeholder designs - students can still build and save their resume.
 */
export function TemplatePicker({ value, onChange, labelledBy, templates = getActiveTemplates() }: { value: string | null; onChange: (id: string) => void; labelledBy: string; templates?: ResumeTemplateMetadata[] }) {
  const name = useId();
  if (templates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="space-y-1 text-sm">
            <p className="font-bold text-foreground">Resume templates are being prepared</p>
            <p className="text-muted-foreground">
              Professional ATS-friendly templates will appear here soon. You can fill in and save your resume now; choose a template and generate your PDF once they are available. Your information is kept and works with every template.
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((t) => {
        const id = `${name}-${t.id}`;
        const selected = value === t.id;
        return (
          <label
            key={t.id}
            htmlFor={id}
            className={cn(
              "flex cursor-pointer flex-col gap-2 rounded-2xl border bg-card p-3 shadow-sm transition-colors focus-within:ring-2 focus-within:ring-ring",
              selected ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50",
            )}
          >
            {t.previewImage ? (
              <img src={t.previewImage} alt="" loading="lazy" className="aspect-[3/4] w-full rounded-lg border border-border object-cover object-top" />
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-border bg-muted/40 text-xs text-muted-foreground">Preview not available</div>
            )}
            <div className="flex items-start gap-2">
              <input id={id} type="radio" name={name} value={t.id} checked={selected} onChange={() => onChange(t.id)} aria-labelledby={`${id}-name`} aria-describedby={`${id}-desc`} className="mt-1 size-5 accent-primary" />
              <span>
                <span id={`${id}-name`} className="block text-sm font-black text-foreground">{t.name}</span>
                <span id={`${id}-desc`}>
                  <span className="block text-xs text-muted-foreground">{t.description}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {t.ats.singleColumn ? "Single-column, ATS-friendly layout." : "Multi-column layout."} {t.ats.notes}
                  </span>
                </span>
              </span>
            </div>
          </label>
        );
      })}
    </div>
  );
}
