import { CourseCurriculumEditor } from "@/components/shared/CourseCurriculumEditor";
import type { StepProps } from "@/components/mentor/course-builder/types";

/**
 * Thin wrapper around the shared curriculum editor - publish/archive controls
 * and the inline media uploader are hidden here since the wizard has its own
 * dedicated Media step and status-transition actions (Submit for Review /
 * Archive) live in the Review step and the /mentor/courses workspace instead.
 */
export function CurriculumStep({ course }: Readonly<StepProps>) {
  return <CourseCurriculumEditor courseId={course.id} courseTitle={course.title} courseStatus={course.status} hideStatusControls hideMediaSection />;
}
