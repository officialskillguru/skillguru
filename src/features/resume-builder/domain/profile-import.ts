// ============================================================================
// "Import from my profile" — maps the student's existing Skill Guru data
// (profiles, student_profiles and the classic resume_* tables) into the new
// independent ResumeData document. Read-only with respect to the source: the
// profile is never modified, and later edits to the resume never flow back.
// ============================================================================
import type { ResumeAchievement, ResumeCertification, ResumeExperience, ResumeProfile, ResumeProject } from "@/services/resume.service";
import {
  entryFactories,
  type ResumeData,
  type ResumeEducation,
  type ResumeExperienceEntry,
  type ResumeProjectEntry,
} from "./resume-schema";

export type ProfileImportSource = {
  profile: ResumeProfile | null;
  experience: ResumeExperience[];
  projects: ResumeProject[];
  certifications: ResumeCertification[];
  achievements: ResumeAchievement[];
};

const clean = (v: string | null | undefined, max: number) => (v ?? "").trim().slice(0, max);
/** "2024-06-15" -> "2024-06"; anything unparseable -> "". */
const toMonth = (date: string | null | undefined) => (date && /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : "");
const isRepoUrl = (url: string) => /^https?:\/\/(www\.)?(github\.com|gitlab\.com|bitbucket\.org)\//i.test(url);
const safeUrl = (url: string | null | undefined) => {
  const value = clean(url, 300);
  return /^https?:\/\//i.test(value) ? value : "";
};

export function mapProfileToResumeData(source: ProfileImportSource): Partial<ResumeData> {
  const { profile } = source;
  const result: Partial<ResumeData> = {};

  if (profile) {
    result.personal = {
      fullName: clean(profile.full_name, 100),
      headline: "",
      email: clean(profile.email, 160),
      phone: clean(profile.phone, 25),
      city: clean(profile.city, 80),
      state: clean(profile.state, 80),
      country: clean(profile.country, 80),
      linkedin: safeUrl(profile.linkedin_url),
      github: safeUrl(profile.github_url),
      portfolio: safeUrl(profile.portfolio_url),
      website: safeUrl(profile.website_url),
    };
    result.summary = { objective: "", summary: clean(profile.bio, 1500) };

    if (profile.education || profile.college) {
      const edu: ResumeEducation = {
        ...entryFactories.education(),
        degree: clean(profile.education, 160),
        institution: clean(profile.college, 160),
        endDate: profile.graduation_year ? String(profile.graduation_year) : "",
      };
      result.education = [edu];
    }

    const skills = (profile.skills ?? []).map((s) => s.trim().slice(0, 60)).filter(Boolean);
    if (skills.length > 0) {
      result.skills = [{ ...entryFactories.skillGroup("Technical Skills"), items: Array.from(new Set(skills)).slice(0, 60) }];
    }
  }

  if (source.experience.length > 0) {
    result.experience = source.experience.map(
      (e): ResumeExperienceEntry => ({
        ...entryFactories.experience("job"),
        title: clean(e.title, 140),
        organization: clean(e.company, 160),
        location: clean(e.location, 120),
        startDate: toMonth(e.start_date),
        endDate: e.is_current ? "" : toMonth(e.end_date),
        current: e.is_current,
        responsibilities: clean(e.description, 3000),
      }),
    );
  }

  if (source.projects.length > 0) {
    result.projects = source.projects.map((p): ResumeProjectEntry => {
      const link = safeUrl(p.project_url);
      return {
        ...entryFactories.project(),
        name: clean(p.title, 160),
        description: clean(p.description, 2500),
        technologies: (p.tech_stack ?? []).map((t) => t.trim().slice(0, 60)).filter(Boolean).slice(0, 60),
        repoUrl: link && isRepoUrl(link) ? link : "",
        liveUrl: link && !isRepoUrl(link) ? link : "",
      };
    });
  }

  if (source.certifications.length > 0) {
    result.certifications = source.certifications.map((c) => ({
      ...entryFactories.certification(),
      name: clean(c.name, 160),
      issuer: clean(c.issuer, 160),
      issueDate: toMonth(c.issue_date),
      credentialUrl: safeUrl(c.credential_url),
    }));
  }

  if (source.achievements.length > 0) {
    result.achievements = source.achievements.map((a) => ({
      ...entryFactories.achievement(),
      title: clean(a.title, 160),
      description: clean(a.description, 1500),
      date: toMonth(a.date_achieved),
    }));
  }

  return result;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Merges imported profile data into an existing resume without overwriting
 * anything the student already typed: empty scalar fields are filled, list
 * entries are appended unless an equivalent entry already exists.
 */
export function mergeImportedData(current: ResumeData, imported: Partial<ResumeData>): { data: ResumeData; addedCount: number } {
  let addedCount = 0;
  const next: ResumeData = structuredClone(current);

  if (imported.personal) {
    for (const key of Object.keys(imported.personal) as (keyof ResumeData["personal"])[]) {
      if (!next.personal[key].trim() && imported.personal[key].trim()) {
        next.personal[key] = imported.personal[key];
        addedCount++;
      }
    }
  }
  if (imported.summary) {
    for (const key of ["objective", "summary"] as const) {
      if (!next.summary[key].trim() && imported.summary[key].trim()) {
        next.summary[key] = imported.summary[key];
        addedCount++;
      }
    }
  }

  const appendUnique = <T>(target: T[], incoming: T[] | undefined, key: (item: T) => string) => {
    if (!incoming) return;
    const seen = new Set(target.map(key));
    for (const item of incoming) {
      const k = key(item);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      target.push(item);
      addedCount++;
    }
  };

  appendUnique(next.education, imported.education, (e) => norm(`${e.degree}|${e.institution}`));
  appendUnique(next.experience, imported.experience, (e) => norm(`${e.title}|${e.organization}`));
  appendUnique(next.projects, imported.projects, (p) => norm(p.name));
  appendUnique(next.certifications, imported.certifications, (c) => norm(`${c.name}|${c.issuer}`));
  appendUnique(next.achievements, imported.achievements, (a) => norm(a.title));

  if (imported.skills) {
    for (const group of imported.skills) {
      const existing = next.skills.find((g) => norm(g.category) === norm(group.category));
      if (!existing) {
        if (next.skills.length < 20) {
          next.skills.push(group);
          addedCount += group.items.length;
        }
        continue;
      }
      const have = new Set(existing.items.map(norm));
      for (const item of group.items) {
        if (!have.has(norm(item)) && existing.items.length < 60) {
          existing.items.push(item);
          have.add(norm(item));
          addedCount++;
        }
      }
    }
  }

  return { data: next, addedCount };
}
