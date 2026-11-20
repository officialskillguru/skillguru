// ============================================================================
// Resume Quality Checker — transparent, rule-based heuristics.
// ============================================================================
// This is NOT an employer ATS score and does not predict hiring outcomes. Each
// rule is listed with the points it is worth, so a student can see exactly
// why points were lost and fix it. Formatting/PDF readability is reported as
// "not assessed" until a PDF has been generated and text-extracted.
// ============================================================================
import { toBullets, type ResumeData } from "./resume-schema";

export type QualityCategory = "Contact" | "Summary" | "Education" | "Experience & Projects" | "Skills" | "Clarity" | "Length" | "Target Role";

export type QualityCheck = {
  id: string;
  category: QualityCategory;
  label: string;
  points: number;
  earned: number;
  suggestion: string | null;
};

export type QualityReport = {
  score: number;
  maxScore: number;
  level: "Needs Improvement" | "Good" | "Strong";
  checks: QualityCheck[];
  wordCount: number;
  notAssessed: string[];
};

const LONG_BULLET_CHARS = 220;
const FIRST_PERSON = /\b(I|I'm|I am|my|me)\b/;

function words(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function collectResumeText(data: ResumeData): string[] {
  return [
    data.summary.objective,
    data.summary.summary,
    ...data.experience.flatMap((e) => [e.responsibilities, e.achievements]),
    ...data.projects.flatMap((p) => [p.description, p.features, p.contributions]),
    ...data.achievements.map((a) => a.description),
    ...data.additional.map((a) => a.description),
    ...data.education.flatMap((e) => [e.details, e.coursework]),
  ].filter((t) => t.trim().length > 0);
}

export function estimateWordCount(data: ResumeData): number {
  const scalar = [
    ...Object.values(data.personal),
    ...data.education.flatMap((e) => [e.institution, e.degree, e.specialization]),
    ...data.experience.flatMap((e) => [e.title, e.organization, e.technologies.join(" ")]),
    ...data.projects.flatMap((p) => [p.name, p.technologies.join(" ")]),
    ...data.skills.flatMap((g) => [g.category, g.items.join(" ")]),
    ...data.certifications.flatMap((c) => [c.name, c.issuer]),
    ...data.achievements.map((a) => a.title),
    ...data.languages.map((l) => `${l.name} ${l.proficiency}`),
  ];
  return [...scalar, ...collectResumeText(data)].reduce((sum, t) => sum + words(t), 0);
}

export function analyzeResumeQuality(data: ResumeData, targetRole: string | null | undefined): QualityReport {
  const checks: QualityCheck[] = [];
  const add = (check: Omit<QualityCheck, "earned"> & { pass: boolean | number }) => {
    const ratio = typeof check.pass === "number" ? Math.max(0, Math.min(1, check.pass)) : check.pass ? 1 : 0;
    const earned = Math.round(check.points * ratio);
    checks.push({ id: check.id, category: check.category, label: check.label, points: check.points, earned, suggestion: earned < check.points ? check.suggestion : null });
  };
  const p = data.personal;

  // Contact (15)
  add({ id: "contact-name", category: "Contact", label: "Full name", points: 4, pass: !!p.fullName.trim(), suggestion: "Add your full name." });
  add({ id: "contact-email", category: "Contact", label: "Email address", points: 4, pass: !!p.email.trim(), suggestion: "Add a professional email address." });
  add({ id: "contact-phone", category: "Contact", label: "Phone number", points: 4, pass: !!p.phone.trim(), suggestion: "Add a phone number recruiters can reach you on." });
  add({ id: "contact-location", category: "Contact", label: "City or location", points: 1, pass: !!(p.city.trim() || p.country.trim()), suggestion: "Add your city so recruiters know where you are based." });
  add({
    id: "contact-links",
    category: "Contact",
    label: "Professional profile link",
    points: 2,
    pass: !!(p.linkedin || p.github || p.portfolio || p.website),
    suggestion: "Your resume does not include a LinkedIn, GitHub or portfolio link. Add one if you have it.",
  });

  // Summary (10)
  const summaryText = (data.summary.summary.trim() || data.summary.objective.trim());
  add({ id: "summary-present", category: "Summary", label: "Professional summary or career objective", points: 6, pass: !!summaryText, suggestion: "Your resume does not contain a professional summary or career objective." });
  const summaryWords = words(summaryText);
  add({
    id: "summary-length",
    category: "Summary",
    label: "Summary is 25–120 words",
    points: 4,
    pass: summaryWords >= 25 && summaryWords <= 120,
    suggestion: summaryWords > 120 ? "Your summary is long. Keep it to 2–4 focused sentences." : "Expand your summary to 2–4 sentences about your background and goals.",
  });

  // Education (15)
  add({ id: "education-present", category: "Education", label: "At least one education entry", points: 8, pass: data.education.length > 0, suggestion: "Add your education (degree and institution)." });
  const eduComplete = data.education.length ? data.education.filter((e) => e.institution.trim() && e.degree.trim()).length / data.education.length : 0;
  add({ id: "education-complete", category: "Education", label: "Each entry has degree and institution", points: 4, pass: eduComplete, suggestion: "Fill in both the degree and the institution for every education entry." });
  const eduDated = data.education.length ? data.education.filter((e) => e.endDate || e.current).length / data.education.length : 0;
  add({ id: "education-dates", category: "Education", label: "Graduation year (or currently studying)", points: 3, pass: eduDated, suggestion: "Add a graduation year, or mark the course as currently studying." });

  // Experience & Projects (25)
  const workItems = [...data.experience, ...data.projects];
  add({ id: "work-present", category: "Experience & Projects", label: "Experience, internship or project entries", points: 10, pass: workItems.length > 0, suggestion: "Add at least one internship, job or practical project." });
  const described =
    workItems.length === 0
      ? 0
      : [...data.experience.map((e) => !!(e.responsibilities.trim() || e.achievements.trim())), ...data.projects.map((pr) => !!(pr.description.trim() || pr.contributions.trim()))].filter(Boolean)
          .length / workItems.length;
  add({ id: "work-described", category: "Experience & Projects", label: "Every entry has a description", points: 8, pass: described, suggestion: "Describe what you did in each experience and project entry." });
  const bullets = [...data.experience.flatMap((e) => [...toBullets(e.responsibilities), ...toBullets(e.achievements)]), ...data.projects.flatMap((pr) => [...toBullets(pr.description), ...toBullets(pr.contributions), ...toBullets(pr.features)])];
  const longBullets = bullets.filter((b) => b.length > LONG_BULLET_CHARS).length;
  add({
    id: "work-concise",
    category: "Experience & Projects",
    label: `Bullet points under ${LONG_BULLET_CHARS} characters`,
    points: 4,
    pass: bullets.length === 0 ? workItems.length > 0 : 1 - longBullets / bullets.length,
    suggestion: "Some descriptions are very long paragraphs. Put each one on its own line as a short bullet point.",
  });
  const projectsWithTech = data.projects.length ? data.projects.filter((pr) => pr.technologies.length > 0).length / data.projects.length : data.experience.length > 0 ? 1 : 0;
  add({
    id: "work-tech",
    category: "Experience & Projects",
    label: "Projects list the technologies used",
    points: 3,
    pass: projectsWithTech,
    suggestion: "Your project descriptions would be stronger if you listed the technologies you actually used.",
  });

  // Skills (15)
  const allSkills = data.skills.flatMap((g) => g.items);
  add({ id: "skills-present", category: "Skills", label: "Skills section", points: 8, pass: allSkills.length > 0, suggestion: "Add the skills you actually have." });
  add({ id: "skills-count", category: "Skills", label: "At least 5 skills", points: 4, pass: Math.min(allSkills.length / 5, 1), suggestion: "List more of the relevant skills you genuinely have (aim for 5 or more)." });
  add({
    id: "skills-grouped",
    category: "Skills",
    label: "Skills grouped into named categories",
    points: 3,
    pass: data.skills.length > 0 && data.skills.every((g) => g.category.trim()),
    suggestion: "Give every skills group a category name, such as Programming Languages or Tools.",
  });

  // Clarity (10)
  const texts = collectResumeText(data);
  const longParagraphs = texts.filter((t) => t.split(/\r?\n/).some((line) => words(line) > 60)).length;
  add({ id: "clarity-paragraphs", category: "Clarity", label: "No long paragraphs (over 60 words on one line)", points: 6, pass: texts.length === 0 ? 0 : longParagraphs === 0, suggestion: "Break long paragraphs into concise bullet points." });
  const firstPerson = texts.filter((t) => FIRST_PERSON.test(t)).length;
  add({
    id: "clarity-voice",
    category: "Clarity",
    label: "Avoids first-person phrasing (I, my, me)",
    points: 4,
    pass: texts.length === 0 ? 0 : firstPerson === 0,
    suggestion: "Resumes usually drop “I” and “my”. Start bullets with an action verb, e.g. “Developed …”.",
  });

  // Length (5)
  const wordCount = estimateWordCount(data);
  add({
    id: "length",
    category: "Length",
    label: "Overall length about 200–900 words",
    points: 5,
    pass: wordCount >= 200 && wordCount <= 900,
    suggestion: wordCount > 900 ? "Your resume is long. Students and freshers usually aim for one page; consider shortening descriptions." : "Your resume is quite short. Add more detail about your projects, skills and experience.",
  });

  // Target role (5)
  const role = (targetRole ?? "").trim();
  add({ id: "role-set", category: "Target Role", label: "Target job role set", points: 2, pass: !!role, suggestion: "Set a target job role so suggestions can be tailored." });
  const roleWords = role.toLowerCase().split(/[^a-z0-9+#.]+/).filter((w) => w.length > 2 && !["and", "the", "for", "with"].includes(w));
  const haystack = [summaryText, ...allSkills, p.headline, ...data.experience.map((e) => e.title)].join(" ").toLowerCase();
  add({
    id: "role-relevance",
    category: "Target Role",
    label: "Target role mentioned in your headline, summary, titles or skills",
    points: 3,
    pass: roleWords.length > 0 && roleWords.some((w) => haystack.includes(w)),
    suggestion: "Mention your target role in your headline or summary (only if it reflects your real background).",
  });

  const score = checks.reduce((s, c) => s + c.earned, 0);
  const maxScore = checks.reduce((s, c) => s + c.points, 0);
  const pct = maxScore ? (score / maxScore) * 100 : 0;
  return {
    score,
    maxScore,
    level: pct >= 80 ? "Strong" : pct >= 50 ? "Good" : "Needs Improvement",
    checks,
    wordCount,
    notAssessed: ["PDF formatting and text extraction (checked after a PDF is generated)", "Grammar and spelling (use “Improve My Resume with AI” to review)"],
  };
}
