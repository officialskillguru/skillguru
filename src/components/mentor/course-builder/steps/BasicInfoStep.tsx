import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCourseCategories, useCreateMentorCourse, useUpdateMentorCourse } from "@/hooks/useMentorPortal";
import { useDebouncedAutosave } from "@/hooks/useDebouncedAutosave";
import { SaveStatusIndicator } from "@/components/mentor/course-builder/SaveStatusIndicator";
import type { BuilderStepKey, MentorCourse } from "@/components/mentor/course-builder/types";
import type { Enums } from "@/types/database";

const LEVELS: { value: Enums<"course_level">; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "all_levels", label: "All Levels" },
];

type BasicInfoValues = {
  title: string;
  short_description: string;
  description: string;
  level: Enums<"course_level">;
  language: string;
  course_type: string;
  categoryIds: string[];
};

function toValues(course: MentorCourse | null, selectedCategoryIds: string[]): BasicInfoValues {
  return {
    title: course?.title ?? "",
    short_description: course?.short_description ?? "",
    description: course?.description ?? "",
    level: course?.level ?? "all_levels",
    language: course?.language ?? "English",
    course_type: course?.course_type ?? "",
    categoryIds: selectedCategoryIds,
  };
}

interface BasicInfoStepProps {
  course: (MentorCourse & { selectedCategoryIds?: string[] }) | null;
  onCreated: (courseId: string) => void;
  onDirtyChange: (stepKey: BuilderStepKey, dirty: boolean) => void;
}

export function BasicInfoStep({ course, onCreated, onDirtyChange }: Readonly<BasicInfoStepProps>) {
  const titleId = useId();
  const shortDescId = useId();
  const descId = useId();
  const levelId = useId();
  const languageId = useId();
  const typeId = useId();

  const { data: categories = [], isLoading: categoriesLoading } = useCourseCategories();
  const createCourse = useCreateMentorCourse();
  const updateCourse = useUpdateMentorCourse(course?.id);

  const [values, setValues] = useState<BasicInfoValues>(() => toValues(course, course?.selectedCategoryIds ?? []));
  const [titleError, setTitleError] = useState<string | null>(null);

  const autosave = useDebouncedAutosave<BasicInfoValues>(async (v) => {
    await updateCourse.mutateAsync({
      title: v.title.trim(),
      short_description: v.short_description.trim() || null,
      description: v.description.trim() || null,
      level: v.level,
      language: v.language.trim() || "English",
      course_type: v.course_type.trim() || null,
      selectedCategoryIds: v.categoryIds,
    });
  }, 900);

  useEffect(() => {
    onDirtyChange("basic", autosave.hasUnsavedWork);
  }, [autosave.hasUnsavedWork, onDirtyChange]);

  const isEditMode = !!course;

  const update = <K extends keyof BasicInfoValues>(key: K, value: BasicInfoValues[K]) => {
    const next = { ...values, [key]: value };
    setValues(next);
    if (key === "title" && !value) return; // don't autosave a title into blank
    if (isEditMode) autosave.schedule(next);
  };

  const toggleCategory = (categoryId: string, checked: boolean) => {
    const next = checked ? [...values.categoryIds, categoryId] : values.categoryIds.filter((id) => id !== categoryId);
    update("categoryIds", next);
  };

  const canCreate = useMemo(() => values.title.trim().length >= 4, [values.title]);

  const handleCreate = async () => {
    const trimmedTitle = values.title.trim();
    if (trimmedTitle.length < 4) {
      setTitleError("Course title must be at least 4 characters.");
      return;
    }
    setTitleError(null);
    try {
      const created = await createCourse.mutateAsync({
        title: trimmedTitle,
        short_description: values.short_description.trim() || null,
        description: values.description.trim() || null,
        level: values.level,
        language: values.language.trim() || "English",
        course_type: values.course_type.trim() || null,
        price: 0,
        selectedCategoryIds: values.categoryIds,
      });
      toast.success("Draft created — continue building your course.");
      onCreated(created.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create the course draft.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Basic Information</h2>
          <p className="text-sm text-muted-foreground">Title, description, and classification for your course.</p>
        </div>
        {isEditMode && <SaveStatusIndicator status={autosave.status} errorMessage={autosave.errorMessage} onRetry={autosave.flush} />}
      </div>

      <div className="space-y-2">
        <Label htmlFor={titleId}>
          Course Title <span className="text-destructive-text">*</span>
        </Label>
        <Input
          id={titleId}
          value={values.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="e.g. Full-Stack Web Development Bootcamp"
          required
          aria-required="true"
          aria-invalid={!!titleError}
          aria-describedby={titleError ? `${titleId}-error` : undefined}
        />
        {titleError && (
          <p id={`${titleId}-error`} role="alert" className="text-xs font-semibold text-destructive-text">
            {titleError}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={shortDescId}>Short description</Label>
        <Input
          id={shortDescId}
          value={values.short_description}
          onChange={(e) => update("short_description", e.target.value)}
          placeholder="One sentence shown on course cards and search results"
          maxLength={160}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={descId}>Full description</Label>
        <Textarea
          id={descId}
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="What will students learn in this course?"
          rows={5}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={levelId}>Level</Label>
          <Select value={values.level} onValueChange={(v) => update("level", v as Enums<"course_level">)}>
            <SelectTrigger id={levelId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEVELS.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={languageId}>Language</Label>
          <Input id={languageId} value={values.language} onChange={(e) => update("language", e.target.value)} placeholder="English" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={typeId}>Course type</Label>
          <Input id={typeId} value={values.course_type} onChange={(e) => update("course_type", e.target.value)} placeholder="e.g. Self-paced, Live" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        {categoriesLoading ? (
          <p className="text-xs text-muted-foreground">Loading categories…</p>
        ) : categories.length === 0 ? (
          <p className="text-xs text-muted-foreground">No categories are available yet. Contact an administrator.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categories.map((category) => {
              const checkboxId = `category-${category.id}`;
              const checked = values.categoryIds.includes(category.id);
              return (
                <label
                  key={category.id}
                  htmlFor={checkboxId}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted has-[:checked]:border-secondary has-[:checked]:bg-secondary/5"
                >
                  <Checkbox id={checkboxId} checked={checked} onCheckedChange={(v) => toggleCategory(category.id, v === true)} />
                  {category.name}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {!isEditMode && (
        <div className="flex justify-end border-t border-border pt-4">
          <Button type="button" onClick={() => void handleCreate()} disabled={!canCreate || createCourse.isPending} aria-busy={createCourse.isPending} className="gap-2">
            {createCourse.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                Creating draft…
              </>
            ) : (
              "Save & Continue"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
