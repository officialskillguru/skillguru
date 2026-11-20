// ============================================================================
// ResumeData -> template view model.
// ============================================================================
// Templates never see raw student data. This module validates the stored
// document with the SAME Zod schema the web app uses, then produces only
// pre-escaped SafeLatex values plus boolean `has*` flags so templates can
// omit empty sections (no orphan headings) and support any number of entries.
// The full list of fields is documented in resume-templates/README.md.
// ============================================================================
import { parseStoredResumeData, toBullets, type ResumeData } from "../../../src/features/resume-builder/domain/resume-schema.ts";
import { displayUrl, escapeLatex, escapeUrl, type LatexEngine } from "./latex-escape.ts";
import { safe, type SafeLatex, type ViewObject } from "./template-engine.ts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2024-06" -> "Jun 2024", "2024" -> "2024", "" -> "". */
export function formatResumeDate(value: string): string {
  const m = /^(\d{4})(?:-(\d{2}))?$/.exec(value.trim());
  if (!m) return "";
  return m[2] ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : m[1]!;
}

export function formatDateRange(start: string, end: string, current: boolean, currentLabel = "Present"): string {
  const s = formatResumeDate(start);
  const e = current ? currentLabel : formatResumeDate(end);
  if (s && e) return `${s} – ${e}`;
  return s || e;
}

export function buildTemplateView(raw: unknown, engine: LatexEngine): { view: ViewObject; data: ResumeData } {
  const data = withoutEmptyEntries(parseStoredResumeData(raw));
  const t = (v: string): SafeLatex => safe(escapeLatex(v, engine));
  const u = (v: string): SafeLatex => safe(escapeUrl(v));
  const bullets = (...texts: string[]) => texts.flatMap(toBullets).map(t);
  const joined = (items: string[]) => t(items.map((i) => i.trim()).filter(Boolean).join(", "));
  const p = data.personal;

  const links = [
    { label: "LinkedIn", url: p.linkedin },
    { label: "GitHub", url: p.github },
    { label: "Portfolio", url: p.portfolio },
    { label: "Website", url: p.website },
  ]
    .filter((l) => l.url && escapeUrl(l.url))
    .map((l) => ({ label: t(l.label), url: u(l.url), display: safe(displayUrl(l.url, engine)) }));

  const location = [p.city, p.state, p.country].map((x) => x.trim()).filter(Boolean).join(", ");

  const education = data.education.map((e) => {
    const degreeLine = [e.degree, e.specialization].map((x) => x.trim()).filter(Boolean).join(", ");
    const score = [e.cgpa.trim() && `CGPA: ${e.cgpa.trim()}`, e.percentage.trim() && `Percentage: ${e.percentage.trim()}`].filter(Boolean).join(" | ");
    const details = bullets(e.details);
    return {
      institution: t(e.institution),
      degree: t(e.degree),
      specialization: t(e.specialization),
      degreeLine: t(degreeLine),
      location: t(e.location),
      dates: t(formatDateRange(e.startDate, e.endDate, e.current, "Present")),
      score: t(score),
      coursework: t(e.coursework),
      details,
      hasDetails: details.length > 0,
    };
  });

  const toExperience = (e: ResumeData["experience"][number]) => {
    const items = bullets(e.responsibilities, e.achievements);
    return {
      title: t(e.title),
      organization: t(e.organization),
      employmentType: t(e.employmentType),
      location: t(e.location),
      dates: t(formatDateRange(e.startDate, e.endDate, e.current)),
      bullets: items,
      hasBullets: items.length > 0,
      technologies: joined(e.technologies),
      hasTechnologies: e.technologies.length > 0,
      isInternship: e.kind === "internship",
    };
  };
  const jobs = data.experience.filter((e) => e.kind !== "internship").map(toExperience);
  const internships = data.experience.filter((e) => e.kind === "internship").map(toExperience);

  const projects = data.projects.map((pr) => {
    const items = bullets(pr.description, pr.features, pr.contributions);
    return {
      name: t(pr.name),
      type: t(pr.type),
      technologies: joined(pr.technologies),
      hasTechnologies: pr.technologies.length > 0,
      bullets: items,
      hasBullets: items.length > 0,
      repoUrl: u(pr.repoUrl),
      repoDisplay: safe(displayUrl(pr.repoUrl, engine)),
      hasRepoUrl: !!escapeUrl(pr.repoUrl),
      liveUrl: u(pr.liveUrl),
      liveDisplay: safe(displayUrl(pr.liveUrl, engine)),
      hasLiveUrl: !!escapeUrl(pr.liveUrl),
    };
  });

  const skills = data.skills
    .filter((g) => g.items.length > 0)
    .map((g) => ({ category: t(g.category || "Skills"), items: joined(g.items) }));

  const certifications = data.certifications.map((c) => ({
    name: t(c.name),
    issuer: t(c.issuer),
    date: t(formatResumeDate(c.issueDate)),
    credentialId: t(c.credentialId),
    credentialUrl: u(c.credentialUrl),
    hasCredentialUrl: !!escapeUrl(c.credentialUrl),
  }));

  const achievements = data.achievements.map((a) => ({
    title: t(a.title),
    organization: t(a.organization),
    date: t(formatResumeDate(a.date)),
    description: t(a.description),
  }));

  const languages = data.languages
    .filter((l) => l.name.trim())
    .map((l) => ({ name: t(l.name), proficiency: t(l.proficiency) }));

  const groups = new Map<string, ResumeData["additional"]>();
  for (const a of data.additional) {
    const heading = (a.kind === "custom" ? a.heading.trim() || "Additional Information" : HEADINGS[a.kind]) ?? "Additional Information";
    groups.set(heading, [...(groups.get(heading) ?? []), a]);
  }
  const additional = [...groups.entries()].map(([heading, items]) => ({
    heading: t(heading),
    items: items.map((a) => ({ title: t(a.title), organization: t(a.organization), date: t(formatResumeDate(a.date)), description: t(a.description) })),
  }));

  const summaryParagraphs = data.summary.summary.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean).map(t);

  const view: ViewObject = {
    name: t(p.fullName),
    headline: t(p.headline),
    hasHeadline: !!p.headline.trim(),
    email: t(p.email),
    emailUrl: safe(p.email ? `mailto:${escapeUrlPart(p.email)}` : ""),
    phone: t(p.phone),
    location: t(location),
    hasLocation: !!location,
    links,
    hasLinks: links.length > 0,
    summary: t(data.summary.summary),
    summaryParagraphs,
    hasSummary: summaryParagraphs.length > 0,
    objective: t(data.summary.objective),
    hasObjective: !!data.summary.objective.trim(),
    education,
    hasEducation: education.length > 0,
    experience: jobs,
    hasExperience: jobs.length > 0,
    internships,
    hasInternships: internships.length > 0,
    allExperience: [...jobs, ...internships],
    hasAnyExperience: jobs.length + internships.length > 0,
    projects,
    hasProjects: projects.length > 0,
    skills,
    hasSkills: skills.length > 0,
    certifications,
    hasCertifications: certifications.length > 0,
    achievements,
    hasAchievements: achievements.length > 0,
    languages,
    hasLanguages: languages.length > 0,
    languagesLine: joined(data.languages.filter((l) => l.name.trim()).map((l) => (l.proficiency.trim() ? `${l.name.trim()} (${l.proficiency.trim()})` : l.name.trim()))),
    additional,
    hasAdditional: additional.length > 0,
  };
  return { view, data };
}

/** Blank rows a student added but never filled in must not print empty headings. */
export function withoutEmptyEntries(data: ResumeData): ResumeData {
  const has = (...values: string[]) => values.some((v) => v.trim().length > 0);
  return {
    ...data,
    education: data.education.filter((e) => has(e.institution, e.degree, e.specialization)),
    experience: data.experience.filter((e) => has(e.title, e.organization)),
    projects: data.projects.filter((p) => has(p.name, p.description)),
    skills: data.skills.filter((g) => g.items.length > 0),
    certifications: data.certifications.filter((c) => has(c.name)),
    achievements: data.achievements.filter((a) => has(a.title, a.description)),
    languages: data.languages.filter((l) => has(l.name)),
    additional: data.additional.filter((a) => has(a.title, a.description)),
  };
}

const HEADINGS: Record<string, string> = {
  volunteering: "Volunteering",
  leadership: "Leadership",
  publication: "Publications",
  extracurricular: "Extracurricular Activities",
  award: "Awards",
};

/** Email local/domain parts for a mailto: link; specials are percent-encoded then LaTeX-escaped. */
function escapeUrlPart(email: string): string {
  return encodeURIComponent(email.trim()).replace(/%40/g, "@").replace(/%/g, "\\%");
}

/** All visible student text, for the unsupported-character pre-check. */
export function collectAllText(data: ResumeData): string {
  return JSON.stringify(data);
}

/** Strings that must be extractable from the generated PDF (ATS validation). */
export function expectedPdfText(data: ResumeData): { label: string; text: string }[] {
  const expectations: { label: string; text: string }[] = [];
  if (data.personal.fullName.trim()) expectations.push({ label: "name", text: data.personal.fullName.trim() });
  if (data.personal.email.trim()) expectations.push({ label: "email", text: data.personal.email.trim() });
  if (data.personal.phone.trim()) expectations.push({ label: "phone", text: data.personal.phone.trim() });
  const firstSkill = data.skills.flatMap((g) => g.items)[0];
  if (firstSkill) expectations.push({ label: "skills", text: firstSkill });
  const firstJob = data.experience[0];
  if (firstJob?.organization.trim()) expectations.push({ label: "experience", text: firstJob.organization.trim() });
  const firstEdu = data.education[0];
  if (firstEdu?.institution.trim()) expectations.push({ label: "education", text: firstEdu.institution.trim() });
  return expectations;
}
