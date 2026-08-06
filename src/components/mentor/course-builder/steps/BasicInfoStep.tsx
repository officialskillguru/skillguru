import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  useCourseCategories,
  useCreateMentorCourse,
  useUpdateMentorCourse,
  useMyCategoryProposals,
  useProposeCategory,
} from "@/hooks/useMentorPortal";
import { useDebouncedAutosave } from "@/hooks/useDebouncedAutosave";
import { SaveStatusIndicator } from "@/components/mentor/course-builder/SaveStatusIndicator";
import type { BuilderStepKey, MentorCourse } from "@/components/mentor/course-builder/types";
import type { Enums } from "@/types/database";

const NONE_PARENT = "__none__";

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
  const { data: myProposals = [] } = useMyCategoryProposals();
  const createCourse = useCreateMentorCourse();
  const updateCourse = useUpdateMentorCourse(course?.id);
  const proposeCategory = useProposeCategory();

  const [values, setValues] = useState<BasicInfoValues>(() => toValues(course, course?.selectedCategoryIds ?? []));
  const [titleError, setTitleError] = useState<string | null>(null);

  const topLevelCategories = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const initialSelectedId = values.categoryIds[0];
  const initialSelected = useMemo(() => categories.find((c) => c.id === initialSelectedId), [categories, initialSelectedId]);

  // No separate "seed from server" effect: until the mentor makes an explicit
  // choice (userTopLevelId/userSubcategoryId stay null), the selects fall back
  // to whatever the course's existing category resolves to once categories load.
  const [userTopLevelId, setUserTopLevelId] = useState<string | null>(null);
  const [userSubcategoryId, setUserSubcategoryId] = useState<string | null>(null);

  const selectedTopLevelId = userTopLevelId ?? initialSelected?.parent_id ?? initialSelected?.id ?? "";
  const selectedSubcategoryId = userSubcategoryId ?? (initialSelected?.parent_id ? initialSelected.id : "");

  const subcategories = useMemo(
    () => categories.filter((c) => c.parent_id === selectedTopLevelId),
    [categories, selectedTopLevelId]
  );

  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalForm, setProposalForm] = useState({ name: "", parent_id: NONE_PARENT, description: "", reason: "" });

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

  const handleTopLevelChange = (topLevelId: string) => {
    setUserTopLevelId(topLevelId);
    setUserSubcategoryId("");
    const hasChildren = categories.some((c) => c.parent_id === topLevelId);
    update("categoryIds", hasChildren ? [] : [topLevelId]);
  };

  const handleSubcategoryChange = (subcategoryId: string) => {
    setUserSubcategoryId(subcategoryId);
    update("categoryIds", [subcategoryId]);
  };

  const handleProposeCategory = async () => {
    const name = proposalForm.name.trim();
    if (!name || !proposalForm.reason.trim()) return;
    try {
      await proposeCategory.mutateAsync({
        name,
        parent_id: proposalForm.parent_id === NONE_PARENT ? null : proposalForm.parent_id,
        description: proposalForm.description.trim() || null,
        reason: proposalForm.reason.trim(),
      });
      toast.success("Category proposed - an admin will review it shortly.");
      setProposalOpen(false);
      setProposalForm({ name: "", parent_id: NONE_PARENT, description: "", reason: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to propose category.");
    }
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
        <div className="flex items-center justify-between">
          <Label>Category</Label>
          <Button type="button" variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setProposalOpen(true)}>
            <Plus className="size-3.5" /> Suggest New Category
          </Button>
        </div>
        {categoriesLoading ? (
          <p className="text-xs text-muted-foreground">Loading categories…</p>
        ) : categories.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No categories are available yet. Use "Suggest New Category" to propose one for admin approval.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category-top-level">Domain</Label>
              <Select value={selectedTopLevelId} onValueChange={handleTopLevelChange}>
                <SelectTrigger id="category-top-level">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {topLevelCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-subcategory">Subcategory</Label>
              <Select
                value={selectedSubcategoryId}
                onValueChange={handleSubcategoryChange}
                disabled={!selectedTopLevelId || subcategories.length === 0}
              >
                <SelectTrigger id="category-subcategory">
                  <SelectValue placeholder={subcategories.length === 0 ? "No subcategories" : "Select a subcategory"} />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {myProposals.length > 0 && (
          <div className="space-y-1.5 rounded-md border border-dashed border-border p-3">
            <p className="text-xs font-semibold text-muted-foreground">Your proposed categories</p>
            <div className="flex flex-wrap gap-2">
              {myProposals.map((p) => (
                <Badge key={p.id} variant={p.status === "pending" ? "warning" : "destructive"}>
                  {p.name} - {p.status === "pending" ? "Pending approval" : "Rejected"}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={proposalOpen} onOpenChange={setProposalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suggest a New Category</DialogTitle>
            <DialogDescription>
              Can't find the right category or subcategory? Propose one - an admin will review it before it becomes selectable.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="proposal-name">Name</Label>
              <Input
                id="proposal-name"
                value={proposalForm.name}
                onChange={(e) => setProposalForm({ ...proposalForm, name: e.target.value })}
                placeholder="e.g. Quantum Computing"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proposal-parent">Parent category (optional)</Label>
              <Select value={proposalForm.parent_id} onValueChange={(v) => setProposalForm({ ...proposalForm, parent_id: v })}>
                <SelectTrigger id="proposal-parent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_PARENT}>None (top-level domain)</SelectItem>
                  {topLevelCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proposal-description">Description (optional)</Label>
              <Textarea
                id="proposal-description"
                value={proposalForm.description}
                onChange={(e) => setProposalForm({ ...proposalForm, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proposal-reason">Why is this needed?</Label>
              <Textarea
                id="proposal-reason"
                value={proposalForm.reason}
                onChange={(e) => setProposalForm({ ...proposalForm, reason: e.target.value })}
                placeholder="Explain why the existing taxonomy doesn't cover this course"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProposalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleProposeCategory()}
              disabled={!proposalForm.name.trim() || !proposalForm.reason.trim() || proposeCategory.isPending}
            >
              {proposeCategory.isPending ? "Submitting..." : "Submit for Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
