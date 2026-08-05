import { usePageMeta } from "@/hooks/usePageMeta";
import { AnalyticsTab } from "@/components/mentor/dashboard/AnalyticsTab";

export default function MentorAnalyticsPage() {
  usePageMeta("Analytics");
  return <AnalyticsTab />;
}
