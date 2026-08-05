import { usePageMeta } from "@/hooks/usePageMeta";
import { ProfileTab } from "@/components/mentor/dashboard/ProfileTab";

export default function MentorPortalProfilePage() {
  usePageMeta("Mentor Profile");
  return <ProfileTab />;
}
