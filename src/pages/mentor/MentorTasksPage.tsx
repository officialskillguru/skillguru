import { usePageMeta } from "@/hooks/usePageMeta";
import { TasksTab } from "@/components/mentor/dashboard/TasksTab";

export default function MentorTasksPage() {
  usePageMeta("Tasks");
  return <TasksTab />;
}
