import { usePageMeta } from "@/hooks/usePageMeta";
import { CourseBuilderTab } from "@/components/mentor/dashboard/CourseBuilderTab";

export default function MentorCourseBuilderPage() {
  usePageMeta("Course Builder");
  return <CourseBuilderTab />;
}
