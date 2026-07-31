import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePageMeta } from "@/hooks/usePageMeta";
import { PageLoader } from "@/components/common/PageLoader";
import { MentorDashboardShell, type MentorTab } from "@/components/mentor/layout/MentorDashboardShell";
import { OverviewTab } from "@/components/mentor/dashboard/OverviewTab";
import { CoursesTab } from "@/components/mentor/dashboard/CoursesTab";
import { CourseBuilderTab } from "@/components/mentor/dashboard/CourseBuilderTab";
import { StudentsTab } from "@/components/mentor/dashboard/StudentsTab";
import { TasksTab } from "@/components/mentor/dashboard/TasksTab";
import { ReviewsTab } from "@/components/mentor/dashboard/ReviewsTab";
import { AnalyticsTab } from "@/components/mentor/dashboard/AnalyticsTab";
import { NotificationsTab } from "@/components/mentor/dashboard/NotificationsTab";
import { ProfileTab } from "@/components/mentor/dashboard/ProfileTab";

export default function MentorDashboardPage() {
  usePageMeta("Mentor Dashboard");
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<MentorTab>("Overview");

  if (auth.status === "INITIALIZING" as string || auth.status === "AUTHENTICATING" as string || auth.status === "LOADING_PROFILE" as string) return <PageLoader />;

  return (
    <MentorDashboardShell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "Overview" && <OverviewTab />}
      {activeTab === "Assigned Courses" && <CoursesTab />}
      {activeTab === "Course Builder" && <CourseBuilderTab />}
      {activeTab === "Students" && <StudentsTab />}
      {activeTab === "Tasks" && <TasksTab />}
      {activeTab === "Reviews" && <ReviewsTab />}
      {activeTab === "Analytics" && <AnalyticsTab />}
      {activeTab === "Notifications" && <NotificationsTab />}
      {activeTab === "Profile" && <ProfileTab />}
    </MentorDashboardShell>
  );
}
