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
  dashboard: "/dashboard",
  freeCounselling: "/contact?intent=counselling",
  demoBooking: "/contact?intent=demo",
  faq: "/faq",
  privacyPolicy: "/privacy-policy",
  terms: "/terms",
  refundPolicy: "/refund-policy",
  admin: {
    login: "/admin/login",
    dashboard: "/admin",
    leads: "/admin/leads",
    courses: "/admin/courses",
    blogs: "/admin/blogs",
    testimonials: "/admin/testimonials",
    faculty: "/admin/faculty",
    events: "/admin/events",
    seo: "/admin/seo",
    audit: "/admin/audit",
  },
} as const;

export function courseDetailRoute(slug: string) {
  return `/courses/${slug}` as const;
}

export function placementStoryRoute(id: string) {
  return `/placements/${id}` as const;
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
