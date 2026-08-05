import { usePageMeta } from "@/hooks/usePageMeta";
import { NotificationsTab } from "@/components/mentor/dashboard/NotificationsTab";

export default function MentorNotificationsPage() {
  usePageMeta("Notifications");
  return <NotificationsTab />;
}
