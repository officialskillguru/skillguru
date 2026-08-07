import type { Tables } from "@/types/database";

export type MentorCourse = Tables<"courses">;

export type BuilderStepKey = "basic" | "pricing" | "media" | "curriculum" | "outcomes" | "gallery" | "review";

export const BUILDER_STEPS: { key: BuilderStepKey; label: string }[] = [
  { key: "basic", label: "Basic Information" },
  { key: "pricing", label: "Pricing" },
  { key: "media", label: "Media" },
  { key: "curriculum", label: "Curriculum" },
  { key: "outcomes", label: "Outcomes & Marketing" },
  { key: "gallery", label: "Gallery & FAQs" },
  { key: "review", label: "Review" },
];

export interface StepProps {
  course: MentorCourse;
  onDirtyChange: (stepKey: BuilderStepKey, dirty: boolean) => void;
}
