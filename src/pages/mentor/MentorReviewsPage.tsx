import { usePageMeta } from "@/hooks/usePageMeta";
import { ReviewsTab } from "@/components/mentor/dashboard/ReviewsTab";

export default function MentorReviewsPage() {
  usePageMeta("Reviews");
  return <ReviewsTab />;
}
