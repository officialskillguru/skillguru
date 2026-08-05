import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useUpdateMentorCourse } from "@/hooks/useMentorPortal";
import { useDebouncedAutosave } from "@/hooks/useDebouncedAutosave";
import { SaveStatusIndicator } from "@/components/mentor/course-builder/SaveStatusIndicator";
import type { StepProps } from "@/components/mentor/course-builder/types";

type OutcomesValues = { whatYouWillLearn: string[]; requirements: string[] };

function toValues(course: StepProps["course"]): OutcomesValues {
  return {
    whatYouWillLearn: course.what_you_will_learn?.length ? course.what_you_will_learn : [""],
    requirements: course.requirements?.length ? course.requirements : [""],
  };
}

function ListEditor({
  label,
  placeholder,
  items,
  onChange,
}: Readonly<{ label: string; placeholder: string; items: string[]; onChange: (items: string[]) => void }>) {
  const removeButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const handleRemove = (index: number) => {
    onChange(items.length > 1 ? items.filter((_, i) => i !== index) : [""]);
    // The clicked remove button is about to unmount; move focus to the
    // previous item's remove button, or the Add button if this was the first.
    requestAnimationFrame(() => {
      if (index > 0) removeButtonRefs.current[index - 1]?.focus();
      else addButtonRef.current?.focus();
    });
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={item}
              placeholder={placeholder}
              aria-label={`${label}, item ${index + 1}`}
              onChange={(e) => {
                const next = [...items];
                next[index] = e.target.value;
                onChange(next);
              }}
            />
            <button
              type="button"
              ref={(el) => {
                removeButtonRefs.current[index] = el;
              }}
              aria-label={`Remove item ${index + 1}`}
              onClick={() => handleRemove(index)}
              className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        ref={addButtonRef}
        onClick={() => onChange([...items, ""])}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
      >
        <Plus className="size-3.5" aria-hidden="true" />
        Add item
      </button>
    </div>
  );
}

export function OutcomesStep({ course, onDirtyChange }: Readonly<StepProps>) {
  const updateCourse = useUpdateMentorCourse(course.id);
  const [values, setValues] = useState<OutcomesValues>(() => toValues(course));

  const autosave = useDebouncedAutosave<OutcomesValues>(async (v) => {
    await updateCourse.mutateAsync({
      what_you_will_learn: v.whatYouWillLearn.map((s) => s.trim()).filter(Boolean),
      requirements: v.requirements.map((s) => s.trim()).filter(Boolean),
    });
  }, 900);

  useEffect(() => {
    onDirtyChange("outcomes", autosave.hasUnsavedWork);
  }, [autosave.hasUnsavedWork, onDirtyChange]);

  const update = (key: keyof OutcomesValues, items: string[]) => {
    const next = { ...values, [key]: items };
    setValues(next);
    autosave.schedule(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Outcomes & Marketing</h2>
          <p className="text-sm text-muted-foreground">Shown on the public course page to help students decide whether to enroll.</p>
        </div>
        <SaveStatusIndicator status={autosave.status} errorMessage={autosave.errorMessage} onRetry={autosave.flush} />
      </div>

      <ListEditor
        label="What students will learn"
        placeholder="e.g. Build and deploy a full-stack web application"
        items={values.whatYouWillLearn}
        onChange={(items) => update("whatYouWillLearn", items)}
      />

      <ListEditor
        label="Requirements / prerequisites"
        placeholder="e.g. Basic understanding of JavaScript"
        items={values.requirements}
        onChange={(items) => update("requirements", items)}
      />
    </div>
  );
}
