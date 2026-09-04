import { useState } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { MissionControlHero } from "@/components/dashboard/sections/MissionControlHero";
import { TodaysFocus } from "@/components/dashboard/sections/TodaysFocus";
import { ContinueLearning } from "@/components/dashboard/sections/ContinueLearning";
import { LearningAnalytics } from "@/components/dashboard/sections/LearningAnalytics";
import { UpcomingLiveClasses } from "@/components/dashboard/sections/UpcomingLiveClasses";
import { useAuth } from "@/hooks/useAuth";
import { useStudentDashboard } from "@/hooks/student/useStudentDashboard";
import { PageLoader } from "@/components/common/PageLoader";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

function WidgetError({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-3 rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-center">
      <AlertCircle className="text-destructive" size={32} />
      <div>
        <p className="font-semibold text-destructive">{message}</p>
        <p className="text-sm text-destructive/80">Please refresh to try again.</p>
      </div>
      <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-2 rounded-xl">
        <RefreshCw className="mr-2" size={14} /> Refresh
      </Button>
    </div>
  );
}

export default function DashboardPage() {
  usePageMeta("Dashboard | SkillGuru");
  const { user } = useAuth();
  const [studyHoursRangeDays, setStudyHoursRangeDays] = useState<7 | 30>(7);

  const {
    stats, isLoadingStats, statsError,
    continueLearning, isLoadingContinueLearning, continueLearningError,
    weeklyStudyHours,
    nextAssignment,
  } = useStudentDashboard(studyHoursRangeDays);

  // API Failure Strategy: Loading State
  if (isLoadingStats || isLoadingContinueLearning) {
    return <PageLoader />;
  }

  // Derived Analytics (if stats exist)
  const completionRate = stats && stats.enrolledCourses > 0
    ? Math.round((stats.completedCourses / stats.enrolledCourses) * 100)
    : 0;

  const activeCourses = stats ? Math.max(0, stats.enrolledCourses - stats.completedCourses) : 0;
  const certificatesEarned = stats ? stats.certificates : 0;

  const derivedAnalytics = {
    activeCourses,
    certificatesEarned,
    completionRate,
    weeklyData: weeklyStudyHours,
    studyHoursRangeDays,
    onStudyHoursRangeChange: setStudyHoursRangeDays,
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Priority 1: Mission Control (Hero) */}
      <section>
        {continueLearningError ? (
          <WidgetError message="Mission Control unavailable" />
        ) : (
        <ErrorBoundary fallback={<WidgetError message="Mission Control unavailable" />}>
          <MissionControlHero
            student={{ name: (user?.user_metadata?.full_name as string | undefined) || user?.email || "Learner" }}
            course={continueLearning?.course ? {
              id: continueLearning.course.id,
              name: continueLearning.course.title,
              progress: continueLearning.progress?.completion_percentage || 0,
            } : null}
            nextLesson={continueLearning?.nextLesson ? { title: continueLearning.nextLesson.title, duration: "30m" } : { title: "No upcoming lessons", duration: "0m" }}
            nextAssignment={
              nextAssignment
                ? {
                    title: nextAssignment.pendingCount > 1 ? `${nextAssignment.title} (+${nextAssignment.pendingCount - 1} more)` : nextAssignment.title,
                    due: nextAssignment.dueDate ? new Date(nextAssignment.dueDate).toLocaleDateString() : "No due date",
                  }
                : null
            }
            loading={isLoadingContinueLearning}
          />
        </ErrorBoundary>
        )}
      </section>

      {/* Priority 2: Focus & Learning */}
      <section className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        {/* Left Column (2/3 width on xl) */}
        <div className="flex flex-col gap-8 xl:col-span-2">
          {continueLearningError ? (
            <WidgetError message="Continue Learning unavailable" />
          ) : (
            <ErrorBoundary fallback={<WidgetError message="Continue Learning unavailable" />}>
              <ContinueLearning
                course={continueLearning?.course ? {
                  id: continueLearning.course.id,
                  title: continueLearning.course.title,
                  instructor: continueLearning.mentorName || "SkillGuru Faculty",
                  progress: continueLearning.progress?.completion_percentage || 0,
                  thumbnail: continueLearning.course.thumbnail_file_id || "/assets/placeholder-course.jpg",
                  nextModule: continueLearning.module?.title || "Welcome",
                  totalModules: continueLearning.totalModules,
                  completedModules: continueLearning.completedModules,
                } : undefined}
              />
            </ErrorBoundary>
          )}

          {statsError ? (
            <WidgetError message="Analytics unavailable" />
          ) : (
            <ErrorBoundary fallback={<WidgetError message="Analytics unavailable" />}>
              <LearningAnalytics {...derivedAnalytics} />
            </ErrorBoundary>
          )}
        </div>

        {/* Right Column (1/3 width on xl) */}
        <div className="flex flex-col gap-8">
          {continueLearningError ? (
            <WidgetError message="Learning Tasks unavailable" />
          ) : (
            <ErrorBoundary fallback={<WidgetError message="Learning Tasks unavailable" />}>
              <TodaysFocus
                items={continueLearning?.nextLesson && continueLearning.course ? [
                  {
                    id: continueLearning.nextLesson.id,
                    type: "lesson",
                    title: continueLearning.nextLesson.title,
                    timeEstimate: "30m",
                    isCompleted: false,
                    href: `/dashboard/courses/${continueLearning.course.id}`,
                  },
                ] : []}
              />
            </ErrorBoundary>
          )}
          
          <ErrorBoundary fallback={<WidgetError message="Live Classes unavailable" />}>
            <UpcomingLiveClasses />
          </ErrorBoundary>
        </div>
      </section>
    </div>
  );
}
