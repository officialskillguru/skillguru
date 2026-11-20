// ============================================================================
// Structured resume data — the single source of truth for every template.
// ============================================================================
// Stored as resumes.resume_data (jsonb). Two layers, on purpose:
//
// 1. STORAGE schema (resumeDataSchema): checks only types and caps lengths.
//    Parsing never throws and works field-by-field (`.catch`), so a single bad
//    or legacy value can never make a resume unopenable or wipe a section.
//    Half-typed drafts (e.g. an email without its domain yet) are kept as typed.
// 2. FORMAT rules (getFormatErrors): email/phone/URL/date checks used for
//    inline form errors and before PDF generation. They report problems; they
//    never drop what the student wrote.
//
// Free-text "bullet" fields are plain text with one bullet per line - students
// never type markup, and the LaTeX renderer escapes every character.
// ============================================================================
import { z } from "zod";

export const RESUME_SCHEMA_VERSION = 1;

export function newEntryId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Text capped at `max` characters; anything that is not a string becomes "". */
const text = (max: number) =>
  z
    .string()
    .transform((v) => v.slice(0, max))
    .catch("");
const flag = z.boolean().catch(false);
const id = z.string().min(1).max(64).catch(() => newEntryId());
const tags = z
  .array(z.unknown())
  .catch(() => [])
  .transform((items) =>
    Array.from(new Set(items.filter((t): t is string => typeof t === "string").map((t) => t.trim().slice(0, 60)).filter(Boolean))).slice(0, 60),
  );
/** Array of entries: non-objects are dropped, each entry is parsed tolerantly, length capped. */
const entries = <T extends z.ZodTypeAny>(schema: T, max: number) =>
  z
    .array(z.unknown())
    .catch(() => [])
    .transform((items) => items.filter((i) => i !== null && typeof i === "object" && !Array.isArray(i)).slice(0, max).map((i) => schema.parse(i) as z.output<T>));

export const FIELD_LIMITS = { short: 160, name: 100, phone: 25, url: 300, date: 7, long: 3000 } as const;

export const personalSchema = z
  .object({
    fullName: text(100),
    headline: text(140),
    email: text(160),
    phone: text(25),
    city: text(80),
    state: text(80),
    country: text(80),
    linkedin: text(300),
    github: text(300),
    portfolio: text(300),
    website: text(300),
  })
  // Factory, not a literal: .catch(value) would hand every resume the SAME mutable object.
  .catch(() => ({ fullName: "", headline: "", email: "", phone: "", city: "", state: "", country: "", linkedin: "", github: "", portfolio: "", website: "" }));

export const summarySchema = z.object({ objective: text(1500), summary: text(1500) }).catch(() => ({ objective: "", summary: "" }));

export const educationSchema = z.object({
  id,
  institution: text(160),
  degree: text(160),
  specialization: text(160),
  location: text(120),
  startDate: text(7),
  endDate: text(7),
  current: flag,
  cgpa: text(20),
  percentage: text(20),
  coursework: text(1000),
  details: text(1500),
});

export const EXPERIENCE_KINDS = ["job", "internship"] as const;
export const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Internship", "Contract", "Freelance", "Apprenticeship", "Volunteer"] as const;

export const experienceSchema = z.object({
  id,
  kind: z.enum(EXPERIENCE_KINDS).catch("job"),
  title: text(140),
  organization: text(160),
  employmentType: text(40),
  location: text(120),
  startDate: text(7),
  endDate: text(7),
  current: flag,
  responsibilities: text(3000),
  achievements: text(2000),
  technologies: tags,
});

export const projectSchema = z.object({
  id,
  name: text(160),
  type: text(80),
  description: text(2500),
  technologies: tags,
  features: text(2000),
  contributions: text(2000),
  repoUrl: text(300),
  liveUrl: text(300),
});

export const skillGroupSchema = z.object({ id, category: text(60), items: tags });

export const certificationSchema = z.object({
  id,
  name: text(160),
  issuer: text(160),
  issueDate: text(7),
  credentialId: text(100),
  credentialUrl: text(300),
});

export const achievementSchema = z.object({ id, title: text(160), description: text(1500), organization: text(160), date: text(7) });

export const languageSchema = z.object({ id, name: text(60), proficiency: text(60) });

export const ADDITIONAL_KINDS = ["volunteering", "leadership", "publication", "extracurricular", "award", "custom"] as const;
export type AdditionalKind = (typeof ADDITIONAL_KINDS)[number];

export const ADDITIONAL_KIND_LABELS: Record<AdditionalKind, string> = {
  volunteering: "Volunteering",
  leadership: "Leadership",
  publication: "Publications",
  extracurricular: "Extracurricular Activities",
  award: "Awards",
  custom: "Custom Section",
};

export const additionalSchema = z.object({
  id,
  kind: z.enum(ADDITIONAL_KINDS).catch("custom"),
  heading: text(60),
  title: text(160),
  organization: text(160),
  date: text(7),
  description: text(1500),
});

export const ENTRY_LIMITS = { education: 15, experience: 30, projects: 30, skills: 20, certifications: 30, achievements: 30, languages: 15, additional: 30 } as const;

export const resumeDataSchema = z
  .object({
    personal: personalSchema,
    summary: summarySchema,
    education: entries(educationSchema, ENTRY_LIMITS.education),
    experience: entries(experienceSchema, ENTRY_LIMITS.experience),
    projects: entries(projectSchema, ENTRY_LIMITS.projects),
    skills: entries(skillGroupSchema, ENTRY_LIMITS.skills),
    certifications: entries(certificationSchema, ENTRY_LIMITS.certifications),
    achievements: entries(achievementSchema, ENTRY_LIMITS.achievements),
    languages: entries(languageSchema, ENTRY_LIMITS.languages),
    additional: entries(additionalSchema, ENTRY_LIMITS.additional),
  });

export type ResumeData = z.output<typeof resumeDataSchema>;
export type ResumePersonal = ResumeData["personal"];
export type ResumeEducation = z.output<typeof educationSchema>;
export type ResumeExperienceEntry = z.output<typeof experienceSchema>;
export type ResumeProjectEntry = z.output<typeof projectSchema>;
export type ResumeSkillGroup = z.output<typeof skillGroupSchema>;
export type ResumeCertificationEntry = z.output<typeof certificationSchema>;
export type ResumeAchievementEntry = z.output<typeof achievementSchema>;
export type ResumeLanguageEntry = z.output<typeof languageSchema>;
export type ResumeAdditionalEntry = z.output<typeof additionalSchema>;

export const SUGGESTED_SKILL_CATEGORIES = [
  "Programming Languages",
  "Frontend",
  "Backend",
  "Databases",
  "Cloud",
  "Developer Tools",
  "Data Analytics",
  "Design",
  "Other Technical Skills",
  "Soft Skills",
] as const;

/**
 * Reads whatever is stored in resumes.resume_data into a complete ResumeData.
 * Never throws: unknown keys are dropped and invalid values fall back to
 * defaults one field at a time.
 */
export function parseStoredResumeData(raw: unknown): ResumeData {
  const input = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return resumeDataSchema.parse(input);
}

export function emptyResumeData(): ResumeData {
  return parseStoredResumeData({});
}

export const entryFactories = {
  education: (): ResumeEducation => educationSchema.parse({ id: newEntryId() }),
  experience: (kind: ResumeExperienceEntry["kind"] = "job"): ResumeExperienceEntry =>
    experienceSchema.parse({ id: newEntryId(), kind, employmentType: kind === "internship" ? "Internship" : "" }),
  project: (): ResumeProjectEntry => projectSchema.parse({ id: newEntryId() }),
  skillGroup: (category = ""): ResumeSkillGroup => skillGroupSchema.parse({ id: newEntryId(), category }),
  certification: (): ResumeCertificationEntry => certificationSchema.parse({ id: newEntryId() }),
  achievement: (): ResumeAchievementEntry => achievementSchema.parse({ id: newEntryId() }),
  language: (): ResumeLanguageEntry => languageSchema.parse({ id: newEntryId() }),
  additional: (kind: AdditionalKind = "custom"): ResumeAdditionalEntry => additionalSchema.parse({ id: newEntryId(), kind }),
};

/** Splits a free-text field into bullet lines (blank lines and leading bullet glyphs removed). */
export function toBullets(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•▪◦·]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
}

// ─── Format rules (inline errors + generation readiness) ─────────────────────

/** "YYYY" or "YYYY-MM". A bare year is allowed so nothing is invented when only the year is known. */
export const RESUME_DATE_PATTERN = /^\d{4}(-(0[1-9]|1[0-2]))?$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?[\d\s()-]{7,20}$/;

export function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && parsed.hostname.includes(".");
  } catch {
    return false;
  }
}

export const FORMAT_MESSAGES = {
  email: "Enter a valid email address, e.g. name@example.com",
  phone: "Enter a valid phone number, e.g. +91 98765 43210",
  url: "Enter a full link starting with https://",
  date: "Use YYYY or YYYY-MM, e.g. 2024 or 2024-06",
  dateOrder: "The end date is before the start date",
} as const;

const compareDates = (a: string, b: string) => (a.length === 4 ? `${a}-01` : a).localeCompare(b.length === 4 ? `${b}-12` : b);

/**
 * Format problems keyed by form field path relative to the resume data
 * (e.g. "personal.email", "education.2.endDate"). Empty fields are never errors here.
 */
export function getFormatErrors(data: ResumeData): Record<string, string> {
  const errors: Record<string, string> = {};
  const check = (path: string, value: string, ok: (v: string) => boolean, message: string) => {
    if (value.trim() && !ok(value.trim())) errors[path] = message;
  };
  const isDate = (v: string) => RESUME_DATE_PATTERN.test(v);
  const range = (prefix: string, start: string, end: string, current: boolean) => {
    check(`${prefix}.startDate`, start, isDate, FORMAT_MESSAGES.date);
    check(`${prefix}.endDate`, end, isDate, FORMAT_MESSAGES.date);
    if (!current && isDate(start.trim()) && isDate(end.trim()) && compareDates(end.trim(), start.trim()) < 0) errors[`${prefix}.endDate`] = FORMAT_MESSAGES.dateOrder;
  };

  const p = data.personal;
  check("personal.email", p.email, (v) => EMAIL_PATTERN.test(v), FORMAT_MESSAGES.email);
  check("personal.phone", p.phone, (v) => PHONE_PATTERN.test(v), FORMAT_MESSAGES.phone);
  for (const key of ["linkedin", "github", "portfolio", "website"] as const) check(`personal.${key}`, p[key], isHttpUrl, FORMAT_MESSAGES.url);
  data.education.forEach((e, i) => range(`education.${i}`, e.startDate, e.endDate, e.current));
  data.experience.forEach((e, i) => range(`experience.${i}`, e.startDate, e.endDate, e.current));
  data.projects.forEach((pr, i) => {
    check(`projects.${i}.repoUrl`, pr.repoUrl, isHttpUrl, FORMAT_MESSAGES.url);
    check(`projects.${i}.liveUrl`, pr.liveUrl, isHttpUrl, FORMAT_MESSAGES.url);
  });
  data.certifications.forEach((c, i) => {
    check(`certifications.${i}.issueDate`, c.issueDate, isDate, FORMAT_MESSAGES.date);
    check(`certifications.${i}.credentialUrl`, c.credentialUrl, isHttpUrl, FORMAT_MESSAGES.url);
  });
  data.achievements.forEach((a, i) => check(`achievements.${i}.date`, a.date, isDate, FORMAT_MESSAGES.date));
  data.additional.forEach((a, i) => check(`additional.${i}.date`, a.date, isDate, FORMAT_MESSAGES.date));
  return errors;
}

export type GenerationIssue = { section: string; message: string };

/** Requirements that must hold before a PDF is generated (drafts may be incomplete). */
export function getGenerationIssues(data: ResumeData, templateId: string | null): GenerationIssue[] {
  const issues: GenerationIssue[] = [];
  if (!templateId) issues.push({ section: "Setup", message: "Choose a resume template." });
  if (!data.personal.fullName.trim()) issues.push({ section: "Personal Information", message: "Full name is required." });
  if (!data.personal.email.trim()) issues.push({ section: "Personal Information", message: "Email address is required." });
  if (!data.personal.phone.trim()) issues.push({ section: "Personal Information", message: "Phone number is required." });
  const hasBody = data.education.length + data.experience.length + data.projects.length + data.skills.length > 0;
  if (!hasBody) issues.push({ section: "Content", message: "Add at least one education, experience, project or skills entry." });
  const formatCount = Object.keys(getFormatErrors(data)).length;
  if (formatCount > 0) issues.push({ section: "Formatting", message: `Fix ${formatCount} field${formatCount === 1 ? "" : "s"} with an invalid format (email, phone, link or date).` });
  return issues;
}
