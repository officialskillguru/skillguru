import { useParams, useSearchParams } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { CourseBuilderWizard } from "@/components/mentor/course-builder/CourseBuilderWizard";
import { BUILDER_STEPS, type BuilderStepKey } from "@/components/mentor/course-builder/types";

const STEP_KEYS = new Set<string>(BUILDER_STEPS.map((s) => s.key));

export default function MentorCourseBuilderPage() {
  const { courseId } = useParams<{ courseId?: string }>();
  const [searchParams] = useSearchParams();
  const stepParam = searchParams.get("step");
  const initialStep = stepParam && STEP_KEYS.has(stepParam) ? (stepParam as BuilderStepKey) : undefined;

  usePageMeta(courseId ? "Edit Course" : "Course Builder");
  return <CourseBuilderWizard courseId={courseId} initialStep={initialStep} />;
}
