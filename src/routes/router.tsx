import { lazy, Suspense, type ReactNode } from "react";
import { createHashRouter, Navigate, Outlet } from "react-router-dom";
import { PageLoader } from "@/components/common/PageLoader";
import { ScrollToTop } from "@/components/common/ScrollToTop";
import { AnalyticsProvider } from "@/context/AnalyticsProvider";
import { MarketingLayout } from "@/layouts/MarketingLayout";
import { routes } from "@/lib/routes";
import { AdminProtectedRoute, ProtectedRoute } from "@/routes/guards";

const HomePage = lazy(() => import("@/pages/HomePage"));
const CoursesPage = lazy(() => import("@/pages/CoursesPage"));
const CourseDetailsPage = lazy(() => import("@/pages/CourseDetailsPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const PlacementsPage = lazy(() => import("@/pages/PlacementsPage"));
const PlacementStoryPage = lazy(() => import("@/pages/PlacementStoryPage"));
const MentorsPage = lazy(() => import("@/pages/MentorsPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const GuidancePage = lazy(() => import("@/pages/GuidancePage"));
const AuthPage = lazy(() => import("@/pages/AuthPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const AdminLoginPage = lazy(() => import("@/pages/AdminLoginPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const LegalPage = lazy(() => import("@/pages/LegalPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

// Lazy load premium admin pages
const AdminDashboardPage = lazy(() => import("@/pages/AdminDashboardPage"));
const AdminCoursesPage = lazy(() => import("@/pages/AdminCoursesPage"));
const AdminStudentsPage = lazy(() => import("@/pages/AdminStudentsPage"));
const AdminMentorsPage = lazy(() => import("@/pages/AdminMentorsPage"));
const AdminSuccessStoriesPage = lazy(() => import("@/pages/AdminSuccessStoriesPage"));
const AdminPlacementsPage = lazy(() => import("@/pages/AdminPlacementsPage"));
const AdminCRMPage = lazy(() => import("@/pages/AdminCRMPage"));
const AdminAIGuidancePage = lazy(() => import("@/pages/AdminAIGuidancePage"));
const AdminCMSPage = lazy(() => import("@/pages/AdminCMSPage"));
const AdminAnalyticsPage = lazy(() => import("@/pages/AdminAnalyticsPage"));
const AdminRolePage = lazy(() => import("@/pages/AdminRolePage"));
const AdminSettingsPage = lazy(() => import("@/pages/AdminSettingsPage"));

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

function MarketingRoute({ children }: Readonly<{ children: ReactNode }>) {
  return <MarketingLayout>{children}</MarketingLayout>;
}

function RootRoute() {
  return (
    <AnalyticsProvider>
      <ScrollToTop />
      <Outlet />
    </AnalyticsProvider>
  );
}

export const router = createHashRouter([
  {
    element: <RootRoute />,
    children: [
      { path: routes.home, element: withSuspense(<MarketingRoute><HomePage /></MarketingRoute>) },
      { path: routes.courses, element: withSuspense(<MarketingRoute><CoursesPage /></MarketingRoute>) },
      { path: "/courses/:slug", element: withSuspense(<MarketingRoute><CourseDetailsPage /></MarketingRoute>) },
      { path: routes.about, element: withSuspense(<MarketingRoute><AboutPage /></MarketingRoute>) },
      { path: routes.placements, element: withSuspense(<MarketingRoute><PlacementsPage /></MarketingRoute>) },
      { path: "/placements/:id", element: withSuspense(<MarketingRoute><PlacementStoryPage /></MarketingRoute>) },
      { path: routes.mentors, element: withSuspense(<MarketingRoute><MentorsPage /></MarketingRoute>) },
      { path: routes.guidance, element: withSuspense(<MarketingRoute><GuidancePage /></MarketingRoute>) },
      { path: routes.contact, element: withSuspense(<MarketingRoute><ContactPage /></MarketingRoute>) },
      { path: routes.login, element: withSuspense(<AuthPage mode="login" />) },
      { path: routes.signup, element: withSuspense(<AuthPage mode="signup" />) },
      {
        path: routes.dashboard,
        element: withSuspense(
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>,
        ),
      },
      { path: routes.admin.login, element: withSuspense(<AdminLoginPage />) },
      {
        path: "/admin",
        element: withSuspense(
          <AdminProtectedRoute>
            <AdminPage />
          </AdminProtectedRoute>,
        ),
        children: [
          { index: true, element: withSuspense(<AdminDashboardPage />) },
          { path: "leads", element: withSuspense(<AdminCRMPage />) },
          { path: "pipeline", element: withSuspense(<AdminCRMPage />) },
          { path: "courses", element: withSuspense(<AdminCoursesPage />) },
          { path: "categories", element: withSuspense(<AdminCoursesPage />) },
          { path: "programs", element: withSuspense(<AdminCoursesPage />) },
          { path: "certifications", element: withSuspense(<AdminCoursesPage />) },
          { path: "students", element: withSuspense(<AdminStudentsPage />) },
          { path: "enrollments", element: withSuspense(<AdminStudentsPage />) },
          { path: "progress", element: withSuspense(<AdminStudentsPage />) },
          { path: "certificates", element: withSuspense(<AdminStudentsPage />) },
          { path: "blogs", element: withSuspense(<AdminCMSPage />) },
          { path: "faq", element: withSuspense(<AdminCMSPage />) },
          { path: "homepage", element: withSuspense(<AdminCMSPage />) },
          { path: "seo", element: withSuspense(<AdminCMSPage />) },
          { path: "faculty", element: withSuspense(<AdminMentorsPage />) },
          { path: "mentor-applications", element: withSuspense(<AdminMentorsPage />) },
          { path: "mentor-assignments", element: withSuspense(<AdminMentorsPage />) },
          { path: "mentor-reviews", element: withSuspense(<AdminMentorsPage />) },
          { path: "testimonials", element: withSuspense(<AdminSuccessStoriesPage />) },
          { path: "hiring-partners", element: withSuspense(<AdminSuccessStoriesPage />) },
          { path: "placement-records", element: withSuspense(<AdminPlacementsPage />) },
          { path: "placement-statistics", element: withSuspense(<AdminPlacementsPage />) },
          { path: "revenue", element: withSuspense(<AdminAnalyticsPage />) },
          { path: "transactions", element: withSuspense(<AdminAnalyticsPage />) },
          { path: "coupons", element: withSuspense(<AdminAnalyticsPage />) },
          { path: "refunds", element: withSuspense(<AdminAnalyticsPage />) },
          { path: "ai-guidance", element: withSuspense(<AdminAIGuidancePage />) },
          { path: "counselling", element: withSuspense(<AdminAIGuidancePage />) },
          { path: "users-roles", element: withSuspense(<AdminRolePage />) },
          { path: "permissions", element: withSuspense(<AdminRolePage />) },
          { path: "audit", element: withSuspense(<AdminRolePage />) },
          { path: "settings", element: withSuspense(<AdminSettingsPage />) },
        ],
      },
      { path: "/placement-assistance", element: <Navigate to={routes.placements} replace /> },
      { path: "/faculty", element: <Navigate to={routes.mentors} replace /> },
      { path: "/testimonials", element: <Navigate to={routes.placements} replace /> },
      { path: "/success-stories", element: <Navigate to={routes.placements} replace /> },
      { path: "/success-story", element: <Navigate to={routes.placements} replace /> },
      { path: "/success-story/:id", element: <Navigate to={routes.placements} replace /> },
      { path: "/resources", element: <Navigate to={routes.guidance} replace /> },
      { path: "/resources/:slug", element: <Navigate to={routes.guidance} replace /> },
      { path: "/blog", element: <Navigate to={routes.guidance} replace /> },
      { path: "/blog/:slug", element: <Navigate to={routes.guidance} replace /> },
      { path: "/career-programs", element: <Navigate to={routes.courses} replace /> },
      { path: routes.faq, element: withSuspense(<MarketingRoute><HomePage /></MarketingRoute>) },
      { path: routes.privacyPolicy, element: withSuspense(<MarketingRoute><LegalPage title="Privacy Policy" /></MarketingRoute>) },
      { path: routes.terms, element: withSuspense(<MarketingRoute><LegalPage title="Terms and Conditions" /></MarketingRoute>) },
      { path: routes.refundPolicy, element: withSuspense(<MarketingRoute><LegalPage title="Refund Policy" /></MarketingRoute>) },
      { path: "*", element: withSuspense(<MarketingRoute><NotFoundPage /></MarketingRoute>) },
    ],
  },
]);
