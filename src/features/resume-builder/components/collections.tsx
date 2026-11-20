import { useId, useRef, useState, type ReactNode } from "react";
import { useController, useFieldArray, useFormContext, useWatch, type ArrayPath, type FieldArray } from "react-hook-form";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { inputClass, type EditorPath, type EditorValues } from "./form-model";
import { ConfirmDialog, LiveAnnouncer } from "./feedback";

type ListPath = ArrayPath<EditorValues>;

const hasContent = (value: unknown): boolean =>
  typeof value === "string" ? value.trim().length > 0 : Array.isArray(value) ? value.length > 0 : value && typeof value === "object" ? Object.entries(value).some(([k, v]) => k !== "id" && k !== "kind" && hasContent(v)) : false;

/**
 * Add / remove / reorder entries of one resume section. Reordering uses
 * explicit "Move up/down" buttons (keyboard and screen-reader friendly) rather
 * than drag-and-drop. Entry ids are preserved, so AI suggestions and saved
 * data keep pointing at the right entry after a move.
 */
export function RepeatableList<P extends ListPath>({
  name,
  noun,
  addLabel,
  max,
  createItem,
  getLabel,
  renderItem,
  emptyText,
  secondaryAdd,
}: {
  name: P;
  noun: string;
  addLabel: string;
  max: number;
  createItem: () => FieldArray<EditorValues, P>;
  getLabel: (item: Record<string, unknown> | undefined, index: number) => string;
  renderItem: (index: number) => ReactNode;
  emptyText: string;
  /** Optional second "add" button for a variant entry (e.g. "Add internship"). */
  secondaryAdd?: { label: string; noun: string; create: () => FieldArray<EditorValues, P> };
}) {
  const { control } = useFormContext<EditorValues>();
  const { fields, append, remove, move } = useFieldArray({ control, name, keyName: "fieldKey" });
  const values = useWatch({ control, name }) as unknown as Record<string, unknown>[] | undefined;
  const listId = useId();
  const listRef = useRef<HTMLOListElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const [announcement, setAnnouncement] = useState("");
  const [pendingRemove, setPendingRemove] = useState<number | null>(null);

  const labelFor = (index: number) => getLabel(values?.[index], index);

  const focusEntry = (index: number) =>
    requestAnimationFrame(() => {
      const entry = listRef.current?.querySelector<HTMLElement>(`[data-entry-index="${index}"]`);
      entry?.querySelector<HTMLElement>("input, textarea, select")?.focus();
    });

  const handleAdd = (item = createItem(), itemNoun = noun) => {
    append(item);
    setAnnouncement(`${itemNoun} ${fields.length + 1} added`);
    focusEntry(fields.length);
  };

  const doRemove = (index: number) => {
    const label = labelFor(index);
    remove(index);
    setPendingRemove(null);
    setAnnouncement(`${label} removed`);
    requestAnimationFrame(() => {
      const next = listRef.current?.querySelector<HTMLElement>(`[data-entry-index="${Math.min(index, fields.length - 2)}"] [data-entry-label]`);
      (next ?? addRef.current)?.focus();
    });
  };

  const handleMove = (from: number, to: number) => {
    move(from, to);
    setAnnouncement(`${labelFor(from)} moved to position ${to + 1} of ${fields.length}`);
    // At either end the pressed button becomes disabled; keep focus on the entry's other move button.
    if (to === 0 || to === fields.length - 1) {
      requestAnimationFrame(() => {
        const target = to === 0 ? "down" : "up";
        listRef.current?.querySelector<HTMLElement>(`[data-entry-index="${to}"] [data-move="${target}"]`)?.focus();
      });
    }
  };

  return (
    <div className="space-y-4">
      {fields.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ol ref={listRef} className="space-y-4">
          {fields.map((field, index) => {
            const label = labelFor(index);
            return (
              <li key={field.fieldKey} data-entry-index={index}>
                {/* Named via aria-labelledby: a <legend> must be the fieldset's first child, which this toolbar layout can't guarantee. */}
                <fieldset aria-labelledby={`${listId}-${field.fieldKey}`} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <span id={`${listId}-${field.fieldKey}`} data-entry-label tabIndex={-1} className="text-sm font-black text-foreground outline-none">
                      {label}
                    </span>
                    <div className="flex gap-1">
                      <Button type="button" size="icon" variant="ghost" className="size-10" data-move="up" disabled={index === 0} onClick={() => handleMove(index, index - 1)} aria-label={`Move ${label} up`}>
                        <ArrowUp className="size-4" aria-hidden="true" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="size-10" data-move="down" disabled={index === fields.length - 1} onClick={() => handleMove(index, index + 1)} aria-label={`Move ${label} down`}>
                        <ArrowDown className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-10 text-destructive-text hover:bg-destructive/10"
                        onClick={() => (hasContent(values?.[index]) ? setPendingRemove(index) : doRemove(index))}
                        aria-label={`Remove ${label}`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                  <div>{renderItem(index)}</div>
                </fieldset>
              </li>
            );
          })}
        </ol>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button ref={addRef} type="button" variant="outline" onClick={() => handleAdd()} disabled={fields.length >= max}>
          <Plus className="size-4" aria-hidden="true" /> {addLabel}
        </Button>
        {secondaryAdd && (
          <Button type="button" variant="outline" onClick={() => handleAdd(secondaryAdd.create(), secondaryAdd.noun)} disabled={fields.length >= max}>
            <Plus className="size-4" aria-hidden="true" /> {secondaryAdd.label}
          </Button>
        )}
        {fields.length >= max && <p className="text-xs text-muted-foreground">You can add up to {max} entries.</p>}
      </div>
      <LiveAnnouncer message={announcement} />
      <ConfirmDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => !open && setPendingRemove(null)}
        title={`Remove ${pendingRemove !== null ? labelFor(pendingRemove) : noun}?`}
        description="This entry and everything typed in it will be removed from this resume."
        confirmLabel="Remove entry"
        onConfirm={() => pendingRemove !== null && doRemove(pendingRemove)}
      />
    </div>
  );
}

/** Chip input for a string[] field: Enter or comma adds, paste "a, b" adds several. */
export function TagInput({ name, label, hint, max = 60, suggestions }: { name: EditorPath; label: string; hint?: string; max?: number; suggestions?: readonly string[] }) {
  const id = useId();
  const { control } = useFormContext<EditorValues>();
  const { field } = useController({ control, name });
  const items = (Array.isArray(field.value) ? field.value : []) as string[];
  const [draft, setDraft] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const chipsRef = useRef<HTMLUListElement>(null);

  /** `refocus`: return focus to the text input (used by buttons that disappear or disable after use). */
  const add = (raw: string, refocus = false) => {
    const incoming = raw.split(",").map((s) => s.trim().slice(0, 60)).filter(Boolean);
    if (incoming.length === 0) return;
    const next = [...items];
    const added: string[] = [];
    const dupes: string[] = [];
    for (const item of incoming) {
      if (next.some((x) => x.toLowerCase() === item.toLowerCase())) dupes.push(item);
      else if (next.length < max) {
        next.push(item);
        added.push(item);
      }
    }
    field.onChange(next);
    setDraft("");
    if (refocus) inputRef.current?.focus();
    setAnnouncement(
      [added.length ? `${added.join(", ")} added` : "", dupes.length ? `${dupes.join(", ")} already listed` : "", next.length >= max ? `Limit of ${max} reached` : ""].filter(Boolean).join(". "),
    );
  };

  /** Keyboard removal from the input (Backspace) keeps focus in the input; chip buttons move focus to a neighbouring chip. */
  const removeAt = (index: number, keepFocusInInput = false) => {
    const removed = items[index];
    field.onChange(items.filter((_, i) => i !== index));
    setAnnouncement(`${removed} removed`);
    if (keepFocusInInput) return;
    requestAnimationFrame(() => {
      const buttons = chipsRef.current?.querySelectorAll<HTMLButtonElement>("button");
      (buttons?.[Math.min(index, (buttons?.length ?? 1) - 1)] ?? inputRef.current)?.focus();
    });
  };

  const available = (suggestions ?? []).filter((s) => !items.some((i) => i.toLowerCase() === s.toLowerCase())).slice(0, 8);

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-bold text-foreground">
        {label}
      </Label>
      {items.length > 0 && (
        <ul ref={chipsRef} className="flex flex-wrap gap-2" aria-label={`${label}: ${items.length} added`}>
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className="flex items-center gap-1 rounded-full border border-border bg-muted/50 py-1 pl-3 pr-1 text-sm font-semibold text-foreground">
              {item}
              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label={`Remove ${item}`}
                className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          id={id}
          value={draft}
          maxLength={200}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && items.length > 0) {
              removeAt(items.length - 1, true);
            }
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (text.includes(",")) {
              e.preventDefault();
              add(text);
            }
          }}
          onBlur={field.onBlur}
          aria-describedby={`${id}-hint`}
          className={cn(inputClass, "flex-1")}
          placeholder="Type and press Enter"
        />
        <Button type="button" variant="outline" onClick={() => add(draft, true)} disabled={!draft.trim() || items.length >= max}>
          Add
        </Button>
      </div>
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        {hint ?? "Press Enter or comma to add. Add only skills you genuinely have."}
      </p>
      {available.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Common:</span>
          {available.map((s) => (
            <Button key={s} type="button" size="sm" variant="ghost" className="h-8 border border-dashed border-border" onClick={() => add(s, true)} aria-label={`Add ${s}`}>
              + {s}
            </Button>
          ))}
        </div>
      )}
      <LiveAnnouncer message={announcement} />
    </div>
  );
}
