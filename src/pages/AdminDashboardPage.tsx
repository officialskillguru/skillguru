import { DashboardHeader } from "@/components/admin/dashboard/DashboardHeader";
import { DashboardStats } from "@/components/admin/dashboard/DashboardStats";
import { PlatformOverviewWidget } from "@/components/admin/dashboard/PlatformOverviewWidget";
import { SystemHealthWidget } from "@/components/admin/dashboard/SystemHealthWidget";
import { RecentMentorsWidget } from "@/components/admin/dashboard/RecentMentorsWidget";
import { QuickActionsWidget } from "@/components/admin/dashboard/QuickActionsWidget";
import { RecentOrdersWidget } from "@/components/admin/dashboard/RecentOrdersWidget";
import { RoleManagementWidget } from "@/components/admin/dashboard/RoleManagementWidget";
import { TopCoursesWidget } from "@/components/admin/dashboard/TopCoursesWidget";
import { RecentActivitiesWidget } from "@/components/admin/dashboard/RecentActivitiesWidget";
import { GsapReveal } from "@/components/motion/gsap-reveal";

export default function AdminDashboardPage() {
  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <GsapReveal>
        <DashboardHeader />
      </GsapReveal>
      
      <GsapReveal stagger>
        <DashboardStats />
      </GsapReveal>
      
      <GsapReveal>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <PlatformOverviewWidget />
          </div>
          <div className="lg:col-span-1">
            <SystemHealthWidget />
          </div>
        </div>
      </GsapReveal>

      <GsapReveal>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <RecentMentorsWidget />
          </div>
          <div className="lg:col-span-1">
            <QuickActionsWidget />
          </div>
        </div>
      </GsapReveal>

      <GsapReveal>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <RecentOrdersWidget />
          </div>
          <div className="lg:col-span-1">
            <RoleManagementWidget />
          </div>
        </div>
      </GsapReveal>

      <GsapReveal>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TopCoursesWidget />
          </div>
          <div className="lg:col-span-1">
            <RecentActivitiesWidget />
          </div>
        </div>
      </GsapReveal>
    </div>
  );
}
