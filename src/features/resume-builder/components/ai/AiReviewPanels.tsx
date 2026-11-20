import { useId, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useFormContext } from "react-hook-form";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { entryFactories } from "../../domain/resume-schema";
import { textareaClass, type EditorValues } from "../form-model";
import { LiveAnnouncer } from "../feedback";
import { useAiContext } from "./ai-context-core";
import { aiErrorMessage, callResumeAi, resolveSuggestionPath, type JobMatch, type KeywordSuggestion, type ResumeAnalysis, type ResumeSuggestion } from "./ai-api";

function useServerAi<T>(build: () => Record<string, unknown>) {
  const { ensureConsent, ensureSaved } = useAiContext();
  const mutation = useMutation({
    mutationFn: async () => {
      const saved = await ensureSaved();
      if (!saved) throw new Error("Save your latest changes first (see the save status above), then try again.");
      return callResumeAi<T>(build());
    },
  });
  const run = async () => {
    if (await ensureConsent()) mutation.mutate();
  };
  return { ...mutation, run };
}

function PanelShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div>
        <h3 className="text-base font-black text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function ErrorText({ error }: { error: unknown }) {
  return (
    <p role="alert" className="text-sm font-semibold text-destructive-text">
      {error instanceof Error && !("code" in error) ? error.message : aiErrorMessage(error)}
    </p>
  );
}

export function ImproveWholeResumePanel() {
  const { resumeId } = useAiContext();
  const { getValues, setValue } = useFormContext<EditorValues>();
  const [decided, setDecided] = useState<Record<string, "accepted" | "kept" | "stale">>({});
  const [announcement, setAnnouncement] = useState("");
  const ai = useServerAi<{ suggestions: ResumeSuggestion[]; rejected: number }>(() => ({ operation: "improve_resume", resumeId }));

  const accept = (s: ResumeSuggestion) => {
    const path = resolveSuggestionPath(s.fieldPath, getValues());
    // Only apply if the field still holds exactly the text the AI saw.
    const current = path ? getValues(path) : undefined;
    if (!path || typeof current !== "string" || current.trim() !== s.original.trim()) {
      setDecided((d) => ({ ...d, [s.fieldPath]: "stale" }));
      setAnnouncement(`${s.label} has changed since the suggestion was made; it was not applied.`);
      return;
    }
    setValue(path, s.improvedText, { shouldDirty: true, shouldTouch: true });
    setDecided((d) => ({ ...d, [s.fieldPath]: "accepted" }));
    setAnnouncement(`Accepted improvement for ${s.label}`);
  };

  return (
    <PanelShell title="Improve My Resume with AI" description="AI reviews your summary and descriptions and proposes rewrites. Accept or keep each one individually.">
      <Button type="button" onClick={() => void ai.run()} disabled={ai.isPending}>
        {ai.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
        {ai.data ? "Review again" : "Improve My Resume with AI"}
      </Button>
      <div aria-busy={ai.isPending}>
        {ai.isPending && <p role="status" className="text-sm text-muted-foreground">Reviewing your resume…</p>}
        {ai.isError && <ErrorText error={ai.error} />}
        {ai.data && !ai.isPending && (
          <div className="space-y-3">
            <p role="status" className="text-sm text-muted-foreground">
              {ai.data.suggestions.length === 0 ? "No improvements suggested — your writing already reads well." : `${ai.data.suggestions.length} suggestion${ai.data.suggestions.length === 1 ? "" : "s"} ready.`}
              {ai.data.rejected > 0 && ` ${ai.data.rejected} suggestion${ai.data.rejected === 1 ? " was" : "s were"} discarded because they added details you didn't provide.`}
            </p>
            <ul className="space-y-3">
              {ai.data.suggestions.map((s) => {
                const state = decided[s.fieldPath];
                return (
                  <li key={s.fieldPath} className="rounded-xl border border-border p-3">
                    <h4 className="text-sm font-black text-foreground">{s.label}</h4>
                    {s.reason && <p className="text-xs text-muted-foreground">{s.reason}</p>}
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <div className="rounded-lg bg-muted/40 p-2">
                        <p className="text-[11px] font-black uppercase text-muted-foreground">Original</p>
                        <p className="whitespace-pre-wrap text-sm">{s.original}</p>
                      </div>
                      <div className="rounded-lg bg-primary/5 p-2">
                        <p className="text-[11px] font-black uppercase text-primary">Improved</p>
                        <p className="whitespace-pre-wrap text-sm">{s.improvedText}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {state ? (
                        <p className="text-xs font-semibold text-muted-foreground">
                          {state === "accepted" ? "Accepted" : state === "kept" ? "Kept original" : "Not applied: this field changed after the review. Run the review again."}
                        </p>
                      ) : (
                        <>
                          <Button type="button" size="sm" onClick={() => accept(s)} aria-label={`Accept improvement for ${s.label}`}>
                            <Check className="size-3.5" aria-hidden="true" /> Accept
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setDecided((d) => ({ ...d, [s.fieldPath]: "kept" }))} aria-label={`Keep original ${s.label}`}>
                            <X className="size-3.5" aria-hidden="true" /> Keep original
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
      <LiveAnnouncer message={announcement} />
    </PanelShell>
  );
}

export function KeywordSuggestionsPanel() {
  const { resumeId, targetRole } = useAiContext();
  const { getValues, setValue } = useFormContext<EditorValues>();
  const [added, setAdded] = useState<string[]>([]);
  const ai = useServerAi<{ keywords: KeywordSuggestion[] }>(() => ({ operation: "suggest_keywords", resumeId, targetRole: targetRole || undefined }));

  const addSkill = (keyword: string) => {
    const groups = getValues("data.skills");
    const index = groups.findIndex((g) => g.category.toLowerCase() === "other technical skills");
    if (index >= 0) setValue(`data.skills.${index}.items`, [...(groups[index]?.items ?? []), keyword], { shouldDirty: true });
    else setValue("data.skills", [...groups, { ...entryFactories.skillGroup("Other Technical Skills"), items: [keyword] }], { shouldDirty: true });
    setAdded((a) => [...a, keyword]);
  };

  return (
    <PanelShell title="ATS keyword suggestions" description={targetRole ? `Terms employers often look for in a ${targetRole} resume. Add a keyword only if you genuinely have that skill.` : "Set a target job role in Step 1 to get keyword suggestions."}>
      <Button type="button" variant="outline" onClick={() => void ai.run()} disabled={ai.isPending || !targetRole}>
        {ai.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Suggest keywords
      </Button>
      <div aria-busy={ai.isPending}>
        {ai.isError && <ErrorText error={ai.error} />}
        {ai.data && !ai.isPending && (
          <ul className="space-y-2">
            {ai.data.keywords.map((k) => (
              <li key={k.keyword} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-2.5">
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {k.keyword} <span className="text-xs font-semibold text-muted-foreground">— {k.presentInResume || added.includes(k.keyword) ? "already in your resume" : "not in your resume"}</span>
                  </p>
                  {k.reason && <p className="text-xs text-muted-foreground">{k.reason}</p>}
                </div>
                {!k.presentInResume && !added.includes(k.keyword) && (
                  <Button type="button" size="sm" variant="outline" onClick={() => addSkill(k.keyword)} aria-label={`I have ${k.keyword}: add it to my skills`}>
                    I have this — add to skills
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </PanelShell>
  );
}

export function AiAnalysisPanel() {
  const { resumeId } = useAiContext();
  const ai = useServerAi<ResumeAnalysis>(() => ({ operation: "analyze_resume", resumeId }));
  return (
    <PanelShell title="AI writing review" description="An AI read-through for clarity, grammar and completeness. This is guidance, not an ATS score.">
      <Button type="button" variant="outline" onClick={() => void ai.run()} disabled={ai.isPending}>
        {ai.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Review my writing
      </Button>
      <div aria-busy={ai.isPending} className="space-y-3 text-sm">
        {ai.isError && <ErrorText error={ai.error} />}
        {ai.data && !ai.isPending && (
          <>
            <p className="text-foreground">{ai.data.overallAssessment}</p>
            {ai.data.strengths.length > 0 && (
              <div>
                <h4 className="font-black text-foreground">Strengths</h4>
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">{ai.data.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
            )}
            {ai.data.issues.length > 0 && (
              <div>
                <h4 className="font-black text-foreground">Suggestions</h4>
                <ul className="mt-1 space-y-1">
                  {ai.data.issues.map((i) => (
                    <li key={i.message} className="text-muted-foreground">
                      <span className="font-bold text-foreground">{i.section}</span> ({i.severity} priority): {i.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {ai.data.grammarIssues.length > 0 && (
              <div>
                <h4 className="font-black text-foreground">Grammar and spelling</h4>
                <ul className="mt-1 space-y-1 text-muted-foreground">
                  {ai.data.grammarIssues.map((g) => (
                    <li key={g.excerpt}>
                      “{g.excerpt}” → {g.suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </PanelShell>
  );
}

export function JobMatchPanel() {
  const { resumeId } = useAiContext();
  const id = useId();
  const [jd, setJd] = useState("");
  const ai = useServerAi<JobMatch>(() => ({ operation: "match_job", resumeId, jobDescription: jd }));
  const tooShort = jd.trim().length < 40;
  return (
    <PanelShell title="Match against a job description" description="Paste a job posting to see which requirements your resume already shows and what is missing. This is an estimated relevance comparison, not an employer ATS result.">
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-xs font-bold">
          Job description
        </Label>
        <textarea id={id} value={jd} onChange={(e) => setJd(e.target.value)} rows={6} maxLength={12000} aria-describedby={`${id}-hint`} className={textareaClass} />
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {jd.length.toLocaleString()} / 12,000 characters. Paste at least a few sentences.
        </p>
      </div>
      <Button type="button" variant="outline" onClick={() => void ai.run()} disabled={ai.isPending || tooShort}>
        {ai.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Analyze match
      </Button>
      <div aria-busy={ai.isPending} className="space-y-3 text-sm">
        {ai.isError && <ErrorText error={ai.error} />}
        {ai.data && !ai.isPending && (
          <>
            <p role="status" className="font-bold text-foreground">
              Estimated relevance: {ai.data.relevance} — {ai.data.matchedSkills.length} matching, {ai.data.missingKeywords.length} missing keywords.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <h4 className="font-black text-foreground">Already in your resume</h4>
                {ai.data.matchedSkills.length ? <ul className="mt-1 list-disc pl-5 text-muted-foreground">{ai.data.matchedSkills.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="text-muted-foreground">None found.</p>}
              </div>
              <div>
                <h4 className="font-black text-foreground">Mentioned in the job, missing from your resume</h4>
                {ai.data.missingKeywords.length ? <ul className="mt-1 list-disc pl-5 text-muted-foreground">{ai.data.missingKeywords.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="text-muted-foreground">None.</p>}
                <p className="mt-1 text-xs text-muted-foreground">Add these only if you actually have the experience.</p>
              </div>
            </div>
            {ai.data.relevantItems.length > 0 && (
              <div>
                <h4 className="font-black text-foreground">Most relevant parts of your resume</h4>
                <ul className="mt-1 space-y-1 text-muted-foreground">{ai.data.relevantItems.map((r) => <li key={r.label}><span className="font-bold text-foreground">{r.label}:</span> {r.reason}</li>)}</ul>
              </div>
            )}
            {ai.data.suggestions.length > 0 && (
              <div>
                <h4 className="font-black text-foreground">Suggestions</h4>
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">{ai.data.suggestions.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
            )}
          </>
        )}
      </div>
    </PanelShell>
  );
}
