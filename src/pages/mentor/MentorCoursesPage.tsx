import { usePageMeta } from "@/hooks/usePageMeta";
import { CoursesTab } from "@/components/mentor/dashboard/CoursesTab";

export default function MentorCoursesPage() {
  usePageMeta("Assigned Courses");
  return <CoursesTab />;
}
