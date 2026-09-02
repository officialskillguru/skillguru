import { normalizePath } from "@/lib/url";

export const routes = {
  home: "/",
  about: "/about",
  courses: "/courses",
  placements: "/placements",
  placementAssistance: "/placements",
  guidance: "/guidance",
  mentors: "/mentors",
  faculty: "/mentors",
  contact: "/contact",
  login: "/login",
  signup: "/signup",
  verifyEmail: "/verify-email",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  forcePasswordChange: "/force-password-change",
  dashboard: "/dashboard",
  freeCounselling: "/contact?intent=counselling",
  demoBooking: "/contact?intent=demo",
  faq: "/faq",
  privacyPolicy: "/privacy-policy",
  terms: "/terms",
  refundPolicy: "/refund-policy",
  paymentSuccess: "/payment-success",
  paymentFailed: "/payment-failed",
  verifyCertificate: "/verify-certificate",
  admin: {
    login: "/admin/login",
    dashboard: "/admin",
    payments: "/admin/payments",
    leads: "/admin/leads",
    courses: "/admin/courses",
    blogs: "/admin/blogs",
    testimonials: "/admin/testimonials",
    faculty: "/admin/faculty",
    events: "/admin/events",
    seo: "/admin/seo",
    audit: "/admin/audit",
  },
  mentor: {
    dashboard: "/mentor/dashboard",
    overview: "/mentor/overview",
    courses: "/mentor/courses",
    courseBuilder: "/mentor/courses/new",
    students: "/mentor/students",
    tasks: "/mentor/tasks",
    reviews: "/mentor/reviews",
    analytics: "/mentor/analytics",
    messages: "/mentor/messages",
    announcements: "/mentor/announcements",
    notifications: "/mentor/notifications",
    profile: "/mentor/profile",
  },
  counsellor: {
    dashboard: "/counsellor/dashboard",
    students: "/counsellor/students",
    mentors: "/counsellor/mentors",
    courses: "/counsellor/courses",
    jobs: "/counsellor/jobs",
    messages: "/counsellor/messages",
    profile: "/counsellor/profile",
  },
} as const;

export function courseDetailRoute(slug: string) {
  return `/courses/${slug}` as const;
}

export function mentorCourseEditRoute(courseId: string) {
  return `/mentor/courses/${courseId}/edit` as const;
}

export function mentorCourseCurriculumRoute(courseId: string) {
  return `/mentor/courses/${courseId}/edit?step=curriculum` as const;
}

export function placementStoryRoute(id: string) {
  return `/placements/${id}` as const;
}

export function certificateViewRoute(id: string) {
  return `/dashboard/certificates/${id}` as const;
}

export function verifyCertificateRoute(code: string) {
  return `/verify-certificate/${code}` as const;
}

export function mentorProfileRoute(slug: string) {
  return `/mentors/${slug}` as const;
}

export function blogDetailRoute(slug: string) {
  return `/blog/${slug}` as const;
}

export function thankYouRoute(type: string) {
  return `/thank-you/${type}` as const;
}

export function isAdminRoute(pathname: string) {
  return normalizePath(pathname).startsWith("/admin");
}

export function isActiveRoute(pathname: string, href: string) {
  const current = normalizePath(pathname);
  const target = normalizePath(href);

  return current === target || (target !== "/" && current.startsWith(`${target}/`));
}
