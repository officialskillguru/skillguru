import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { PageLoader } from "@/components/common/PageLoader";
import { routes } from "@/lib/routes";
import { AdminProtectedRoute, ProtectedRoute, MentorProtectedRoute } from "@/routes/guards";

import { DashboardLayout } from "@/layouts/DashboardLayout";

// ── Public / Marketing pages ──────────────────────────────────────────────────
const HomePage            = lazy(() => import("@/pages/HomePage"));
const CoursesPage         = lazy(() => import("@/pages/CoursesPage"));
const CourseDetailsPage   = lazy(() => import("@/pages/CourseDetailsPage"));
const AboutPage           = lazy(() => import("@/pages/AboutPage"));
const PlacementsPage      = lazy(() => import("@/pages/PlacementsPage"));
const PlacementStoryPage  = lazy(() => import("@/pages/PlacementStoryPage"));
const MentorsPage         = lazy(() => import("@/pages/MentorsPage"));
const MentorProfilePage   = lazy(() => import("@/pages/MentorProfilePage"));
const ContactPage         = lazy(() => import("@/pages/ContactPage"));
const StudentMentorsPage  = lazy(() => import("@/pages/student/StudentMentorsPage"));
const WishlistPage        = lazy(() => import("@/pages/student/WishlistPage"));
const NotesPage           = lazy(() => import("@/pages/student/NotesPage"));
const StudentPlacementsPage = lazy(() => import("@/pages/student/PlacementsPage"));
const ResumeBuilderPage = lazy(() => import("@/pages/student/ResumeBuilderPage"));
const CareerGuidancePage = lazy(() => import("@/pages/student/CareerGuidancePage"));
const GuidancePage        = lazy(() => import("@/pages/GuidancePage"));
const AuthPage            = lazy(() => import("@/pages/AuthPage"));
const VerifyEmailPage     = lazy(() => import("@/pages/VerifyEmailPage"));
const ForgotPasswordPage  = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage   = lazy(() => import("@/pages/ResetPasswordPage"));
const ForcePasswordChangePage = lazy(() => import("@/pages/ForcePasswordChangePage"));
const LegalPage           = lazy(() => import("@/pages/LegalPage"));
const NotFoundPage        = lazy(() => import("@/pages/NotFoundPage"));
const PaymentSuccessPage  = lazy(() => import("@/pages/PaymentSuccessPage"));
const PaymentFailedPage   = lazy(() => import("@/pages/PaymentFailedPage"));
const VerifyCertificatePage = lazy(() => import("@/pages/VerifyCertificatePage"));

// ── Student dashboard pages ───────────────────────────────────────────────────
const DashboardPage          = lazy(() => import("@/pages/DashboardPage"));
const MyCoursesPage          = lazy(() => import("@/pages/student/MyCoursesPage").catch(() => ({ default: () => <></> })));
const MyCertificatesPage     = lazy(() => import("@/pages/student/MyCertificatesPage").catch(() => ({ default: () => <></> })));
const CertificateViewPage    = lazy(() => import("@/pages/student/CertificateViewPage").catch(() => ({ default: () => <></> })));
const ProfileSettingsPage    = lazy(() => import("@/pages/student/ProfileSettingsPage").catch(() => ({ default: () => <></> })));
const CourseLearningPage     = lazy(() => import("@/pages/student/CourseLearningPage").catch(() => ({ default: () => <></> })));
const PaymentHistoryPage     = lazy(() => import("@/pages/student/PaymentHistoryPage").catch(() => ({ default: () => <></> })));
const ProfileCompletionPage  = lazy(() => import("@/pages/student/ProfileCompletionPage"));
const StudentChatPage        = lazy(() => import("@/pages/student/ChatPage").catch(() => ({ default: () => <></> })));
const StudentSupportPage     = lazy(() => import("@/pages/student/SupportPage").catch(() => ({ default: () => <></> })));
const StudentAssignmentsPage = lazy(() => import("@/pages/student/AssignmentsPage").catch(() => ({ default: () => <></> })));

// ── Mentor dashboard ──────────────────────────────────────────────────────────
const MentorDashboardPage = lazy(() => import("@/pages/MentorDashboardPage"));

// ── Admin shell & auth ────────────────────────────────────────────────────────
const AdminLoginPage = lazy(() => import("@/pages/AdminLoginPage"));
const AdminPage      = lazy(() => import("@/pages/AdminPage"));

// ── Admin panel pages ─────────────────────────────────────────────────────────
const AdminDashboardPage      = lazy(() => import("@/pages/AdminDashboardPage"));
const AdminProfilePage        = lazy(() => import("@/pages/AdminProfilePage"));
const AdminCoursesPage        = lazy(() => import("@/pages/AdminCoursesPage"));
const AdminStudentsPage       = lazy(() => import("@/pages/AdminStudentsPage"));
const AdminMentorsPage        = lazy(() => import("@/pages/AdminMentorsPage"));
const AdminSuccessStoriesPage = lazy(() => import("@/pages/AdminSuccessStoriesPage"));
const AdminPlacementsPage     = lazy(() => import("@/pages/AdminPlacementsPage"));
const AdminCRMPage            = lazy(() => import("@/pages/AdminCRMPage"));
const AdminCMSPage            = lazy(() => import("@/pages/AdminCMSPage"));
const AdminAnalyticsPage      = lazy(() => import("@/pages/AdminAnalyticsPage"));
const AdminRolePage           = lazy(() => import("@/pages/AdminRolePage"));
const AdminSettingsPage       = lazy(() => import("@/pages/AdminSettingsPage"));
const AdminPaymentsPage       = lazy(() => import("@/pages/AdminPaymentsPage"));
// ── New admin pages (Phase 3) ─────────────────────────────────────────────────
const AdminCouponsPage        = lazy(() => import("@/pages/AdminCouponsPage").catch(() => ({ default: () => <></> })));
const AdminRefundsPage        = lazy(() => import("@/pages/AdminRefundsPage").catch(() => ({ default: () => <></> })));
const AdminChatPage           = lazy(() => import("@/pages/AdminChatPage").catch(() => ({ default: () => <></> })));
const AdminNotificationsPage  = lazy(() => import("@/pages/AdminNotificationsPage").catch(() => ({ default: () => <></> })));
const AdminSupportPage        = lazy(() => import("@/pages/AdminSupportPage").catch(() => ({ default: () => <></> })));
const AdminAuditLogsPage      = lazy(() => import("@/pages/AdminAuditLogsPage").catch(() => ({ default: () => <></> })));
const AdminSystemHealthPage   = lazy(() => import("@/pages/AdminSystemHealthPage").catch(() => ({ default: () => <></> })));
const AdminCalendarPage       = lazy(() => import("@/pages/AdminCalendarPage").catch(() => ({ default: () => <></> })));
const AdminAssignmentsPage    = lazy(() => import("@/pages/AdminAssignmentsPage").catch(() => ({ default: () => <></> })));
const AdminCertificatesPage   = lazy(() => import("@/pages/AdminCertificatesPage").catch(() => ({ default: () => <></> })));
const AdminKnowledgeBasePage  = lazy(() => import("@/pages/AdminKnowledgeBasePage").catch(() => ({ default: () => <></> })));
const AdminInvitationsPage    = lazy(() => import("@/pages/AdminInvitationsPage").catch(() => ({ default: () => <></> })));

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

import { RootRoute, MarketingRoute } from "./layouts";

export const router = createBrowserRouter([
  {
    element: <RootRoute />,
    children: [
      // ── Marketing ───────────────────────────────────────────────────────────
      { path: routes.home,        element: withSuspense(<MarketingRoute><HomePage /></MarketingRoute>) },
      { path: routes.courses,     element: withSuspense(<MarketingRoute><CoursesPage /></MarketingRoute>) },
      { path: "/courses/:slug",   element: withSuspense(<MarketingRoute><CourseDetailsPage /></MarketingRoute>) },
      { path: routes.about,       element: withSuspense(<MarketingRoute><AboutPage /></MarketingRoute>) },
      { path: routes.placements,  element: withSuspense(<MarketingRoute><PlacementsPage /></MarketingRoute>) },
      { path: "/placements/:id",  element: withSuspense(<MarketingRoute><PlacementStoryPage /></MarketingRoute>) },
      { path: routes.mentors,     element: withSuspense(<MarketingRoute><MentorsPage /></MarketingRoute>) },
      { path: "/mentors/:slug",   element: withSuspense(<MarketingRoute><MentorProfilePage /></MarketingRoute>) },
      { path: routes.guidance,    element: withSuspense(<MarketingRoute><GuidancePage /></MarketingRoute>) },
      { path: routes.contact,     element: withSuspense(<MarketingRoute><ContactPage /></MarketingRoute>) },
      { path: routes.login,       element: withSuspense(<AuthPage />) },
      { path: routes.signup,      element: withSuspense(<AuthPage />) },
      { path: routes.verifyEmail, element: withSuspense(<VerifyEmailPage />) },
      { path: routes.forgotPassword, element: withSuspense(<ForgotPasswordPage />) },
      { path: routes.resetPassword, element: withSuspense(<ResetPasswordPage />) },
      { path: routes.verifyCertificate, element: withSuspense(<MarketingRoute><VerifyCertificatePage /></MarketingRoute>) },
      { path: "/verify-certificate/:code", element: withSuspense(<MarketingRoute><VerifyCertificatePage /></MarketingRoute>) },

      // ── Payment result pages ─────────────────────────────────────────────────
      { path: routes.paymentSuccess, element: withSuspense(<ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>) },
      { path: routes.paymentFailed,  element: withSuspense(<ProtectedRoute><PaymentFailedPage /></ProtectedRoute>) },

      // ── Onboarding ───────────────────────────────────────────────────────────
      { path: "/onboarding", element: withSuspense(<ProtectedRoute><ProfileCompletionPage /></ProtectedRoute>) },
      { path: routes.forcePasswordChange, element: withSuspense(<ProtectedRoute><ForcePasswordChangePage /></ProtectedRoute>) },

      // ── Student dashboard ────────────────────────────────────────────────────
      {
        path: routes.dashboard,
        element: withSuspense(<ProtectedRoute><DashboardLayout /></ProtectedRoute>),
        children: [
          { index: true,              element: withSuspense(<DashboardPage />) },
          { path: "courses",          element: withSuspense(<MyCoursesPage />) },
          { path: "courses/:id",      element: withSuspense(<CourseLearningPage />) },
          { path: "certificates",     element: withSuspense(<MyCertificatesPage />) },
          { path: "certificates/:id", element: withSuspense(<CertificateViewPage />) },
          { path: "payments",         element: withSuspense(<PaymentHistoryPage />) },
          { path: "profile",          element: withSuspense(<ProfileSettingsPage />) },
          { path: "chat",             element: withSuspense(<StudentChatPage />) },
          { path: "support",          element: withSuspense(<StudentSupportPage />) },
          { path: "assignments",      element: withSuspense(<StudentAssignmentsPage />) },
          { path: "mentors",          element: withSuspense(<StudentMentorsPage />) },
          { path: "wishlist",         element: withSuspense(<WishlistPage />) },
          { path: "notes",            element: withSuspense(<NotesPage />) },
          { path: "placement",        element: withSuspense(<StudentPlacementsPage />) },
          { path: "resume-builder",   element: withSuspense(<ResumeBuilderPage />) },
          { path: "career-guidance",  element: withSuspense(<CareerGuidancePage />) },
        ],
      },

      // ── Mentor dashboard ─────────────────────────────────────────────────────
      {
        path: "/mentor/dashboard",
        element: withSuspense(<MentorProtectedRoute><MentorDashboardPage /></MentorProtectedRoute>),
      },

      // ── Admin ────────────────────────────────────────────────────────────────
      { path: routes.admin.login, element: withSuspense(<AdminLoginPage />) },
      {
        path: "/admin",
        element: withSuspense(<AdminProtectedRoute><AdminPage /></AdminProtectedRoute>),
        children: [
          { index: true, element: withSuspense(<AdminDashboardPage />) },
          { path: "profile", element: withSuspense(<AdminProfilePage />) },

          // User Management
          { path: "users",                element: withSuspense(<AdminStudentsPage />) },
          { path: "users/mentors",        element: withSuspense(<AdminMentorsPage />) },
          { path: "users/admins",         element: withSuspense(<AdminRolePage />) },
          { path: "users/roles",          element: withSuspense(<AdminRolePage />) },
          { path: "users/invitations",    element: withSuspense(<AdminInvitationsPage />) },

          // Course Management
          { path: "courses",              element: withSuspense(<AdminCoursesPage />) },
          { path: "courses/categories",   element: withSuspense(<AdminCoursesPage />) },
          { path: "courses/modules",      element: withSuspense(<AdminCoursesPage />) },
          { path: "courses/lessons",      element: withSuspense(<AdminCoursesPage />) },
          { path: "courses/assignments",  element: withSuspense(<AdminAssignmentsPage />) },
          { path: "courses/quizzes",      element: withSuspense(<AdminCoursesPage />) },
          { path: "courses/reviews",      element: withSuspense(<AdminMentorsPage />) },

          // Students
          { path: "students",                 element: withSuspense(<AdminStudentsPage />) },
          { path: "students/enrollments",     element: withSuspense(<AdminStudentsPage />) },
          { path: "students/progress",        element: withSuspense(<AdminStudentsPage />) },
          { path: "students/certificates",    element: withSuspense(<AdminCertificatesPage />) },

          // CRM
          { path: "crm",                      element: withSuspense(<AdminCRMPage />) },
          { path: "crm/leads",                element: withSuspense(<AdminCRMPage />) },
          { path: "crm/pipeline",             element: withSuspense(<AdminCRMPage />) },
          { path: "crm/followups",            element: withSuspense(<AdminCRMPage />) },
          { path: "crm/tasks",                element: withSuspense(<AdminCRMPage />) },

          // Commerce
          { path: "commerce/orders",          element: withSuspense(<AdminPaymentsPage />) },
          { path: "commerce/payments",        element: withSuspense(<AdminPaymentsPage />) },
          { path: "commerce/coupons",         element: withSuspense(<AdminCouponsPage />) },
          { path: "commerce/refunds",         element: withSuspense(<AdminRefundsPage />) },
          { path: "commerce/invoices",        element: withSuspense(<AdminPaymentsPage />) },

          // Website CMS
          { path: "cms/pages",    element: withSuspense(<AdminCMSPage />) },
          { path: "cms/seo",      element: withSuspense(<AdminCMSPage />) },
          { path: "cms/media",    element: withSuspense(<AdminCMSPage />) },

          // Communication
          { path: "communication/notifications",  element: withSuspense(<AdminNotificationsPage />) },
          { path: "communication/announcements",  element: withSuspense(<AdminNotificationsPage />) },
          { path: "communication/chat",           element: withSuspense(<AdminChatPage />) },
          { path: "communication/tickets",        element: withSuspense(<AdminSupportPage />) },

          // Placements / CMS content
          { path: "placements",       element: withSuspense(<AdminPlacementsPage />) },
          { path: "success-stories",  element: withSuspense(<AdminSuccessStoriesPage />) },

          // Calendar
          { path: "calendar",   element: withSuspense(<AdminCalendarPage />) },

          // Analytics
          { path: "analytics",  element: withSuspense(<AdminAnalyticsPage />) },
          { path: "reports",    element: <Navigate to="/admin/analytics" replace /> },

          // Operations
          { path: "audit-logs",     element: withSuspense(<AdminAuditLogsPage />) },
          { path: "health",         element: withSuspense(<AdminSystemHealthPage />) },
          { path: "knowledge-base", element: withSuspense(<AdminKnowledgeBasePage />) },
          { path: "settings",       element: withSuspense(<AdminSettingsPage />) },
        ],
      },

      // ── Redirects ────────────────────────────────────────────────────────────
      { path: "/placement-assistance", element: <Navigate to={routes.placements} replace /> },
      { path: "/faculty",              element: <Navigate to={routes.mentors} replace /> },
      { path: "/testimonials",         element: <Navigate to={routes.placements} replace /> },
      { path: "/success-stories",      element: <Navigate to={routes.placements} replace /> },
      { path: "/success-story",        element: <Navigate to={routes.placements} replace /> },
      { path: "/success-story/:id",    element: <Navigate to={routes.placements} replace /> },
      { path: "/resources",            element: <Navigate to={routes.guidance} replace /> },
      { path: "/resources/:slug",      element: <Navigate to={routes.guidance} replace /> },
      { path: "/blog",                 element: <Navigate to={routes.guidance} replace /> },
      { path: "/blog/:slug",           element: <Navigate to={routes.guidance} replace /> },
      { path: "/career-programs",      element: <Navigate to={routes.courses} replace /> },

      // ── Static pages ─────────────────────────────────────────────────────────
      { path: routes.faq,           element: withSuspense(<MarketingRoute><HomePage /></MarketingRoute>) },
      { path: routes.privacyPolicy, element: withSuspense(<MarketingRoute><LegalPage title="Privacy Policy" /></MarketingRoute>) },
      { path: routes.terms,         element: withSuspense(<MarketingRoute><LegalPage title="Terms and Conditions" /></MarketingRoute>) },
      { path: routes.refundPolicy,  element: withSuspense(<MarketingRoute><LegalPage title="Refund Policy" /></MarketingRoute>) },
      { path: "*",                  element: withSuspense(<MarketingRoute><NotFoundPage /></MarketingRoute>) },
    ],
  },
]);
