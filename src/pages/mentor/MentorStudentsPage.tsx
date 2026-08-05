import { usePageMeta } from "@/hooks/usePageMeta";
import { StudentsTab } from "@/components/mentor/dashboard/StudentsTab";

export default function MentorStudentsPage() {
  usePageMeta("Students");
  return <StudentsTab />;
}
