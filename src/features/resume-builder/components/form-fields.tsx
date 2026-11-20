// Shared, accessible form fields for the resume editor. Every input has a
// visible <Label htmlFor>, hint/error text linked via aria-describedby, and
// aria-invalid when its format is wrong. Errors appear once a field has been
// touched (or after the student tries to continue), never while typing.
import { useContext, useId, type ReactNode } from "react";
import { useFormContext, useFormState } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FormatErrorsContext, inputClass, textareaClass, type EditorPath, type EditorValues } from "./form-model";

function useFieldError(name: EditorPath): string | undefined {
  const { errors, showAll } = useContext(FormatErrorsContext);
  const { touchedFields } = useFormState<EditorValues>();
  const message = errors[name];
  if (!message) return undefined;
  const touched = name.split(".").reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined), touchedFields);
  return showAll || touched ? message : undefined;
}

type BaseProps = {
  name: EditorPath;
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  maxLength?: number;
};

function FieldShell({ id, label, required, hint, hintId, error, errorId, className, children, actions }: {
  id: string; label: string; required?: boolean; hint?: string; hintId: string; error?: string; errorId: string; className?: string; children: ReactNode; actions?: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <Label htmlFor={id} className="text-xs font-bold text-foreground">
          {label}
          {required && <span className="text-muted-foreground"> (required)</span>}
        </Label>
        {actions}
      </div>
      {children}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-semibold text-destructive-text">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({
  type = "text",
  autoComplete,
  placeholder,
  inputMode,
  ...props
}: BaseProps & { type?: "text" | "email" | "tel" | "url"; autoComplete?: string; placeholder?: string; inputMode?: "text" | "numeric" | "email" | "tel" | "url" }) {
  const id = useId();
  const { register } = useFormContext<EditorValues>();
  const error = useFieldError(props.name);
  const describedBy = [props.hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <FieldShell id={id} label={props.label} required={props.required} hint={props.hint} hintId={`${id}-hint`} error={error} errorId={`${id}-error`} className={props.className}>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete ?? "off"}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={props.maxLength ?? 160}
        aria-required={props.required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={inputClass}
        {...register(props.name)}
      />
    </FieldShell>
  );
}

export function TextAreaField({ rows = 4, placeholder, actions, ...props }: BaseProps & { rows?: number; placeholder?: string; actions?: ReactNode }) {
  const id = useId();
  const { register } = useFormContext<EditorValues>();
  const error = useFieldError(props.name);
  const describedBy = [props.hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <FieldShell id={id} label={props.label} required={props.required} hint={props.hint} hintId={`${id}-hint`} error={error} errorId={`${id}-error`} className={props.className} actions={actions}>
      <textarea
        id={id}
        rows={rows}
        placeholder={placeholder}
        maxLength={props.maxLength ?? 3000}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={textareaClass}
        {...register(props.name)}
      />
    </FieldShell>
  );
}

export function DateField(props: Omit<BaseProps, "maxLength">) {
  return <TextField {...props} hint={props.hint ?? "YYYY or YYYY-MM"} placeholder="2024-06" inputMode="numeric" maxLength={7} />;
}

export function CheckboxField({ name, label, className }: { name: EditorPath; label: string; className?: string }) {
  const id = useId();
  const { register } = useFormContext<EditorValues>();
  return (
    <div className={cn("flex min-h-11 items-center gap-2", className)}>
      <input id={id} type="checkbox" className="size-5 rounded border-border accent-primary" {...register(name)} />
      <Label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
      </Label>
    </div>
  );
}

export function SelectField({ options, ...props }: Omit<BaseProps, "maxLength"> & { options: readonly { value: string; label: string }[] }) {
  const id = useId();
  const { register } = useFormContext<EditorValues>();
  return (
    <FieldShell id={id} label={props.label} hint={props.hint} hintId={`${id}-hint`} errorId={`${id}-error`} className={props.className}>
      <select id={id} aria-describedby={props.hint ? `${id}-hint` : undefined} className={inputClass} {...register(props.name)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

/** Step wrapper: a focusable h2 (focus moves here on step change) and an optional intro. */
export function StepSection({ title, description, headingRef, children }: { title: string; description?: string; headingRef: React.Ref<HTMLHeadingElement>; children: ReactNode }) {
  return (
    <section aria-labelledby="resume-step-heading" className="space-y-5">
      <div>
        <h2 id="resume-step-heading" ref={headingRef} tabIndex={-1} className="text-xl font-black text-foreground outline-none">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}
