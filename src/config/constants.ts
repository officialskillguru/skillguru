export const brandColors = {
  navy: {
    950: "#04101F",
    900: "#071A3D",
    800: "#0A2E63",
    700: "#0E3F8A",
  },
  teal: {
    500: "#11B5C9",
    400: "#2DD4E4",
    300: "#67E8F9",
  },
  amber: {
    500: "#F59E0B",
    400: "#FBBF24",
  },
  slate: {
    50: "#F8FAFC",
    100: "#F1F5F9",
    200: "#E2E8F0",
    500: "#64748B",
    900: "#0F172A",
  },
  white: "#FFFFFF",
  success: "#16A34A",
} as const;

export const appConstants = {
  defaultLocale: "en-IN",
  timezone: "Asia/Kolkata",
  leadCookieName: "skill_guru_lead_source",
  csrfCookieName: "skill_guru_csrf",
  /** Contact details — update these when real info is available */
  phone: "+91 91090 72316",
  email: "info@skillguru.com",
  address: "1st Floor, ZR Tower, Civil Lines, Vadodara, Gujarat - 390002",
  /** Social links — update when available */
  social: {
    linkedin: "#",
    instagram: "#",
    youtube: "#",
    whatsapp: "#",
  },
} as const;

/**
 * CMS-editable trust metrics.
 * These should eventually come from Supabase / admin panel.
 * DO NOT use fabricated statistics — update with real data only.
 */
export const trustMetrics = {
  learnersEnrolled: { value: 500, suffix: "+", label: "Learners enrolled" },
  placementSupport: { value: 100, suffix: "%", label: "Placement support provided" },
  programsOffered: { value: 15, suffix: "+", label: "Programs offered" },
  batchesCompleted: { value: 30, suffix: "+", label: "Batches completed" },
} as const;

/**
 * Course pricing placeholders.
 * Update with real pricing from CMS / admin panel.
 */
export const coursePricing = {
  "hr-generalist-certification": {
    startingFrom: 25000,
    emiAvailable: true,
    emiStarting: 4500,
  },
  "recruitment-specialist-program": {
    startingFrom: 18000,
    emiAvailable: true,
    emiStarting: 3500,
  },
  "payroll-and-compliance": {
    startingFrom: 12000,
    emiAvailable: true,
    emiStarting: 2500,
  },
} as const;
