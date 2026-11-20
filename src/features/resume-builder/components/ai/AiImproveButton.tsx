import { useId, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { LiveAnnouncer, dialogMotionClass } from "../feedback";
import { textareaClass } from "../form-model";
import { useAiContext } from "./ai-context-core";
import { aiErrorMessage, callResumeAi, type AiTextOperation, type TextImprovementResult } from "./ai-api";

const SECONDARY_OPS: { op: AiTextOperation; label: string }[] = [
  { op: "fix_grammar", label: "Fix grammar & spelling" },
  { op: "shorten", label: "Make it shorter" },
  { op: "professional_tone", label: "Make it more professional" },
];

type Props = {
  /** Main operation for this field (e.g. improve_project). */
  operation: AiTextOperation;
  fieldLabel: string;
  getText: () => string;
  onAccept: (text: string) => void;
  context?: { title?: string; organization?: string; technologies?: string[] };
  /** improve_objective may generate from the saved resume when the field is empty. */
  allowEmpty?: boolean;
};

/**
 * "Improve with AI" control for one text field: main action + a menu of
 * secondary rewrites. Opens a comparison dialog; the field only changes when
 * the student explicitly accepts (or edits and accepts) the suggestion.
 */
export function AiImproveButton({ operation, fieldLabel, getText, onAccept, context, allowEmpty }: Props) {
  const { resumeId, targetRole, ensureConsent, ensureSaved } = useAiContext();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [activeOp, setActiveOp] = useState<AiTextOperation>(operation);
  const [editing, setEditing] = useState(false);
  const [edited, setEdited] = useState("");
  const [validation, setValidation] = useState<string | null>(null);
  const editId = useId();

  const mutation = useMutation({
    mutationFn: async (op: AiTextOperation) => {
      const text = getText().trim();
      if (op === "improve_objective" && !text) await ensureSaved();
      return callResumeAi<TextImprovementResult>({
        operation: op,
        text,
        resumeId: op === "improve_objective" ? resumeId : undefined,
        context: { ...context, targetRole: targetRole || undefined },
      });
    },
    onSuccess: (result) => {
      setEdited(result.improvedText);
      setEditing(false);
    },
  });

  const start = async (op: AiTextOperation) => {
    setValidation(null);
    const text = getText().trim();
    if (!text && !(allowEmpty && op === "improve_objective")) {
      setValidation(`Write your ${fieldLabel.toLowerCase()} first, then ask AI to improve it.`);
      return;
    }
    if (!(await ensureConsent())) return;
    setActiveOp(op);
    setOpen(true);
    mutation.reset();
    mutation.mutate(op);
  };

  const close = () => {
    setOpen(false);
    setEditing(false);
  };
  const result = mutation.data;
  const original = result?.original ?? getText();
  const opLabel = activeOp === operation ? "Improve with AI" : SECONDARY_OPS.find((o) => o.op === activeOp)?.label ?? "Improve with AI";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center">
        <Button ref={triggerRef} type="button" size="sm" variant="outline" className="rounded-r-none" onClick={() => void start(operation)} aria-label={`Improve with AI: ${fieldLabel}`}>
          <Sparkles className="size-3.5" aria-hidden="true" /> Improve with AI
        </Button>
        {/* Non-modal: this menu opens dialogs; a modal menu + dialog can leave body pointer-events locked. */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" variant="outline" className="rounded-l-none border-l-0 px-2" aria-label={`More AI options for ${fieldLabel}`}>
              <span aria-hidden="true">▾</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SECONDARY_OPS.map((o) => (
              <DropdownMenuItem key={o.op} onSelect={() => void start(o.op)}>
                {o.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {validation && <p className="text-xs text-muted-foreground">{validation}</p>}
      <LiveAnnouncer message={validation ?? ""} />

      <Dialog open={open} onOpenChange={(next) => !next && close()}>
        <DialogContent
          className={`${dialogMotionClass} max-w-3xl`}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {opLabel}: {fieldLabel}
            </DialogTitle>
            <DialogDescription>Compare the suggestion with your original. Nothing changes until you accept.</DialogDescription>
          </DialogHeader>

          {/* One always-mounted live region: content changes are announced reliably. */}
          <LiveAnnouncer message={mutation.isPending ? "Generating improvement…" : result && !mutation.isError ? "Improvement ready." : ""} />
          <div className="grid gap-4 md:grid-cols-2">
            <section aria-labelledby={`${editId}-orig`} className="rounded-xl border border-border bg-muted/30 p-3">
              <h3 id={`${editId}-orig`} className="mb-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
                Original
              </h3>
              <p className="whitespace-pre-wrap text-sm text-foreground">{original || <em className="text-muted-foreground">Empty — will be written from your saved resume details.</em>}</p>
            </section>
            <section aria-labelledby={`${editId}-new`} className="rounded-xl border border-primary/40 bg-primary/5 p-3">
              <h3 id={`${editId}-new`} className="mb-2 text-xs font-black uppercase tracking-wide text-primary">
                Improved
              </h3>
              {mutation.isPending && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Generating improvement…
                </p>
              )}
              {mutation.isError && (
                <p role="alert" className="text-sm font-semibold text-destructive-text">
                  {aiErrorMessage(mutation.error)}
                </p>
              )}
              {result && !mutation.isPending &&
                (editing ? (
                  <div className="space-y-1">
                    <Label htmlFor={editId} className="text-xs font-bold">
                      Edit improved text
                    </Label>
                    <textarea id={editId} autoFocus value={edited} onChange={(e) => setEdited(e.target.value)} rows={8} maxLength={5000} className={textareaClass} />
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm text-foreground">{edited}</p>
                ))}
            </section>
          </div>

          {result && !mutation.isPending && (result.changes.length > 0 || result.missingInformation.length > 0) && (
            <div className="grid gap-3 text-sm md:grid-cols-2">
              {result.changes.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-foreground">What changed</h3>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
                    {result.changes.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.missingInformation.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-foreground">You could add (only if true)</h3>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
                    {result.missingInformation.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={close}>
              Keep original
            </Button>
            <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate(activeOp)}>
              Regenerate
            </Button>
            <Button type="button" variant="outline" disabled={!result || mutation.isPending} onClick={() => setEditing((v) => !v)}>
              {editing ? "Done editing" : "Edit improved text"}
            </Button>
            <Button
              type="button"
              disabled={!result || mutation.isPending || !edited.trim()}
              onClick={() => {
                onAccept(edited.trim());
                close();
              }}
            >
              Accept improvement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
