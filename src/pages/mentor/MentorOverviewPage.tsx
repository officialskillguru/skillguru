import { usePageMeta } from "@/hooks/usePageMeta";
import { OverviewTab } from "@/components/mentor/dashboard/OverviewTab";

export default function MentorOverviewPage() {
  usePageMeta("Mentor Overview");
  return <OverviewTab />;
}
