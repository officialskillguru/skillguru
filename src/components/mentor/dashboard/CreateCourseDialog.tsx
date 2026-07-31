import { useId, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { useCreateMentorCourse } from "@/hooks/useMentorPortal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Enums } from "@/types/database";

const LEVELS: { value: Enums<"course_level">; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "all_levels", label: "All Levels" },
];

interface CreateCourseDialogProps {
  onCreated: (courseId: string) => void;
}

export function CreateCourseDialog({ onCreated }: CreateCourseDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const priceId = useId();
  const durationId = useId();
  const levelId = useId();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<Enums<"course_level">>("all_levels");
  const [price, setPrice] = useState("0");
  const [duration, setDuration] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const createCourse = useCreateMentorCourse();

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setLevel("all_levels");
    setPrice("0");
    setDuration("");
    setTitleError(null);
  };

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError("Course title is required.");
      return;
    }
    setTitleError(null);

    const parsedPrice = Number(price);
    try {
      const course = await createCourse.mutateAsync({
        title: trimmedTitle,
        description: description.trim() || null,
        level,
        price: Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 0,
        duration: duration.trim() || null,
      });
      toast.success("Course created — you can now build its curriculum.");
      setOpen(false);
      resetForm();
      onCreated(course.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create course.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" className="gap-2">
          <Plus className="size-4" aria-hidden="true" />
          Create Course
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a New Course</DialogTitle>
          <DialogDescription>
            Starts as a draft. You&apos;ll build out modules and lessons in the next step.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={titleId}>Course Title</Label>
            <Input
              id={titleId}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
            <Label htmlFor={descriptionId}>Description</Label>
            <Textarea
              id={descriptionId}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will students learn in this course?"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={levelId}>Level</Label>
              <Select value={level} onValueChange={(v) => setLevel(v as Enums<"course_level">)}>
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
              <Label htmlFor={priceId}>Price (₹, 0 = free)</Label>
              <Input
                id={priceId}
                type="number"
                min={0}
                step="1"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={durationId}>Duration (optional)</Label>
            <Input
              id={durationId}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 6 weeks"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={createCourse.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={createCourse.isPending}
            aria-busy={createCourse.isPending}
            className="gap-2"
          >
            {createCourse.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Creating course…
              </>
            ) : (
              "Create Course"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
