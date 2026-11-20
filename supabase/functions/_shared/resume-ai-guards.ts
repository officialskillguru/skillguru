// ============================================================================
// Resume AI guards — input validation, output validation, anti-fabrication.
// ============================================================================
// Pure functions (no Deno/Node globals) so they run under Deno in the Edge
// Function and under vitest in CI. Everything the model returns is treated as
// untrusted text: it must match the expected shape, stay within size limits,
// and must not introduce numbers, links or emails the student never wrote.
// ============================================================================

export const TEXT_OPERATIONS = [
  "improve_summary",
  "improve_objective",
  "improve_experience",
  "improve_internship",
  "improve_project",
  "fix_grammar",
  "shorten",
  "professional_tone",
] as const;
export type TextOperation = (typeof TEXT_OPERATIONS)[number];

export const RESUME_OPERATIONS = ["suggest_keywords", "improve_resume", "analyze_resume", "match_job"] as const;
export type ResumeOperation = (typeof RESUME_OPERATIONS)[number];
export type ResumeAiOperation = TextOperation | ResumeOperation;

export const LIMITS = {
  text: 5000,
  contextField: 200,
  technologies: 30,
  jobDescriptionMin: 40,
  jobDescription: 12000,
  bodyBytes: 48 * 1024,
} as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TextContext = { targetRole?: string; title?: string; organization?: string; technologies?: string[] };

export type ResumeAiRequest =
  | { operation: TextOperation; text: string; resumeId?: string; context: TextContext }
  | { operation: "suggest_keywords" | "improve_resume" | "analyze_resume"; resumeId: string; targetRole?: string }
  | { operation: "match_job"; resumeId: string; jobDescription: string };

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const str = (v: unknown, max: number, field: string): string | undefined => {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v !== "string") throw new ValidationError(`${field} must be text`);
  const trimmed = v.trim();
  if (trimmed.length > max) throw new ValidationError(`${field} is too long (max ${max} characters)`);
  return trimmed || undefined;
};

/** Validates the raw JSON body of a resume-ai request. Throws ValidationError with a student-safe message. */
export function parseResumeAiRequest(body: unknown): ResumeAiRequest {
  if (!body || typeof body !== "object") throw new ValidationError("Invalid request");
  const b = body as Record<string, unknown>;
  const operation = b.operation;

  if (typeof operation === "string" && (TEXT_OPERATIONS as readonly string[]).includes(operation)) {
    const op = operation as TextOperation;
    const text = typeof b.text === "string" ? b.text.trim() : "";
    if (text.length > LIMITS.text) throw new ValidationError(`Text is too long (max ${LIMITS.text} characters)`);
    const resumeId = str(b.resumeId, 64, "resumeId");
    if (resumeId && !UUID.test(resumeId)) throw new ValidationError("Invalid resume");
    // Only a career objective may be generated from scratch, and only from the saved resume's verified facts.
    if (!text && !(op === "improve_objective" && resumeId)) throw new ValidationError("Write something first, then ask AI to improve it.");
    if (text && text.length < 3) throw new ValidationError("Write a little more before asking AI to improve it.");
    const ctx = (b.context && typeof b.context === "object" ? b.context : {}) as Record<string, unknown>;
    const techRaw = Array.isArray(ctx.technologies) ? ctx.technologies : [];
    const context: TextContext = {
      targetRole: str(ctx.targetRole, LIMITS.contextField, "targetRole"),
      title: str(ctx.title, LIMITS.contextField, "title"),
      organization: str(ctx.organization, LIMITS.contextField, "organization"),
      technologies: techRaw
        .filter((t): t is string => typeof t === "string")
        .slice(0, LIMITS.technologies)
        .map((t) => str(t, 60, "technology"))
        .filter((t): t is string => !!t),
    };
    return { operation: op, text, resumeId, context };
  }

  if (typeof operation === "string" && (RESUME_OPERATIONS as readonly string[]).includes(operation)) {
    const resumeId = str(b.resumeId, 64, "resumeId");
    if (!resumeId || !UUID.test(resumeId)) throw new ValidationError("Save your resume first, then try again.");
    if (operation === "match_job") {
      const jd = typeof b.jobDescription === "string" ? b.jobDescription.trim() : "";
      if (jd.length < LIMITS.jobDescriptionMin) throw new ValidationError("Paste the full job description (at least a few sentences).");
      if (jd.length > LIMITS.jobDescription) throw new ValidationError(`The job description is too long (max ${LIMITS.jobDescription} characters).`);
      return { operation: "match_job", resumeId, jobDescription: jd };
    }
    return { operation: operation as "suggest_keywords" | "improve_resume" | "analyze_resume", resumeId, targetRole: str(b.targetRole, LIMITS.contextField, "targetRole") };
  }

  throw new ValidationError("Unknown AI operation");
}

// ─── Stored resume -> plain facts / editable fields ─────────────────────────

type Obj = Record<string, unknown>;
const asObj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const asArr = (v: unknown): Obj[] => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object").map((x) => x as Obj) : []);
const s = (v: unknown, max = 3000): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean).slice(0, 60) : []);

export type EditableField = { fieldPath: string; label: string; text: string };

/** Text fields AI may propose rewrites for. Paths use entry ids, so they stay valid if the student reorders entries. */
export function extractEditableFields(resumeData: unknown): EditableField[] {
  const d = asObj(resumeData);
  const fields: EditableField[] = [];
  const push = (fieldPath: string, label: string, text: string) => {
    if (text.trim().length >= 3) fields.push({ fieldPath, label, text });
  };
  const summary = asObj(d.summary);
  push("summary.summary", "Professional summary", s(summary.summary));
  push("summary.objective", "Career objective", s(summary.objective));
  for (const e of asArr(d.experience)) {
    const id = s(e.id, 64);
    if (!id) continue;
    const name = [s(e.title, 140), s(e.organization, 160)].filter(Boolean).join(" at ") || "Experience";
    push(`experience.${id}.responsibilities`, `${name} — responsibilities`, s(e.responsibilities));
    push(`experience.${id}.achievements`, `${name} — achievements`, s(e.achievements));
  }
  for (const p of asArr(d.projects)) {
    const id = s(p.id, 64);
    if (!id) continue;
    const name = s(p.name, 160) || "Project";
    push(`projects.${id}.description`, `${name} — description`, s(p.description));
    push(`projects.${id}.features`, `${name} — key features`, s(p.features));
    push(`projects.${id}.contributions`, `${name} — your contributions`, s(p.contributions));
  }
  for (const a of asArr(d.achievements)) {
    const id = s(a.id, 64);
    if (!id) continue;
    push(`achievements.${id}.description`, `${s(a.title, 160) || "Achievement"} — description`, s(a.description));
  }
  return fields.slice(0, 40);
}

/** Compact, factual view of the resume handed to the model as data. */
export function extractResumeFacts(resumeData: unknown, targetRole: string | null | undefined) {
  const d = asObj(resumeData);
  const personal = asObj(d.personal);
  return {
    targetRole: s(targetRole, 200) || null,
    headline: s(personal.headline, 140) || null,
    education: asArr(d.education).map((e) => ({
      degree: s(e.degree, 160), specialization: s(e.specialization, 160), institution: s(e.institution, 160),
      graduation: s(e.endDate, 10), current: e.current === true, coursework: s(e.coursework, 600),
    })),
    experience: asArr(d.experience).map((e) => ({
      kind: s(e.kind, 20), title: s(e.title, 140), organization: s(e.organization, 160),
      responsibilities: s(e.responsibilities, 1500), achievements: s(e.achievements, 1000), technologies: list(e.technologies),
    })),
    projects: asArr(d.projects).map((p) => ({
      name: s(p.name, 160), description: s(p.description, 1200), technologies: list(p.technologies), contributions: s(p.contributions, 800),
    })),
    skills: asArr(d.skills).map((g) => ({ category: s(g.category, 60), items: list(g.items) })),
    certifications: asArr(d.certifications).map((c) => ({ name: s(c.name, 160), issuer: s(c.issuer, 160) })),
    achievements: asArr(d.achievements).map((a) => ({ title: s(a.title, 160), description: s(a.description, 600) })),
    summary: s(asObj(d.summary).summary, 1500),
    objective: s(asObj(d.summary).objective, 1500),
  };
}

export function resumePlainText(resumeData: unknown): string {
  return JSON.stringify(extractResumeFacts(resumeData, null)).toLowerCase();
}

// ─── Output validation ───────────────────────────────────────────────────────

export class InvalidAiOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAiOutputError";
  }
}

function parseJson(text: string): Obj {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new InvalidAiOutputError("AI response was not valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new InvalidAiOutputError("AI response was not an object");
  return parsed as Obj;
}

const outStr = (v: unknown, field: string, max: number, required = true): string => {
  if (typeof v !== "string") {
    if (!required && (v === undefined || v === null)) return "";
    throw new InvalidAiOutputError(`${field} missing`);
  }
  return sanitizeAiText(v).slice(0, max);
};
const outList = (v: unknown, max: number, itemMax = 300): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => sanitizeAiText(x).slice(0, itemMax)).filter(Boolean).slice(0, max) : [];

/** Removes markdown/markup the model sometimes adds; we only ever store plain text. */
export function sanitizeAiText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`+/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type TextImprovement = { improvedText: string; changes: string[]; missingInformation: string[] };

export function validateTextImprovement(raw: string): TextImprovement {
  const o = parseJson(raw);
  const improvedText = outStr(o.improvedText, "improvedText", LIMITS.text);
  if (improvedText.length < 3) throw new InvalidAiOutputError("improvedText empty");
  return { improvedText, changes: outList(o.changes, 6, 200), missingInformation: outList(o.missingInformation, 5, 240) };
}

export type KeywordSuggestion = { keyword: string; reason: string; presentInResume: boolean };

export function validateKeywords(raw: string, resumeText: string): KeywordSuggestion[] {
  const o = parseJson(raw);
  if (!Array.isArray(o.keywords)) throw new InvalidAiOutputError("keywords missing");
  const seen = new Set<string>();
  const out: KeywordSuggestion[] = [];
  for (const k of o.keywords) {
    const item = asObj(k);
    const keyword = outStr(item.keyword, "keyword", 60, false);
    if (!keyword || seen.has(keyword.toLowerCase())) continue;
    seen.add(keyword.toLowerCase());
    // Never trust the model about what the student has: recompute from the resume itself.
    out.push({ keyword, reason: outStr(item.reason, "reason", 240, false), presentInResume: containsTerm(resumeText, keyword) });
    if (out.length >= 20) break;
  }
  return out;
}

export type ResumeSuggestion = { fieldPath: string; label: string; original: string; improvedText: string; reason: string };

export function validateResumeSuggestions(raw: string, fields: EditableField[]): { suggestions: ResumeSuggestion[]; rejected: number } {
  const o = parseJson(raw);
  if (!Array.isArray(o.suggestions)) throw new InvalidAiOutputError("suggestions missing");
  const byPath = new Map(fields.map((f) => [f.fieldPath, f]));
  const suggestions: ResumeSuggestion[] = [];
  let rejected = 0;
  const used = new Set<string>();
  for (const item of o.suggestions) {
    const sug = asObj(item);
    const field = typeof sug.fieldPath === "string" ? byPath.get(sug.fieldPath) : undefined;
    const improvedText = typeof sug.improvedText === "string" ? sanitizeAiText(sug.improvedText).slice(0, LIMITS.text) : "";
    if (!field || used.has(field.fieldPath) || improvedText.length < 3 || normalise(improvedText) === normalise(field.text)) {
      rejected++;
      continue;
    }
    if (findUnsupportedDetails(field.text, improvedText).length > 0) {
      rejected++;
      continue;
    }
    used.add(field.fieldPath);
    suggestions.push({ fieldPath: field.fieldPath, label: field.label, original: field.text, improvedText, reason: outStr(sug.reason, "reason", 240, false) });
  }
  return { suggestions, rejected };
}

export type ResumeAnalysis = {
  overallAssessment: string;
  strengths: string[];
  issues: { section: string; severity: "high" | "medium" | "low"; message: string }[];
  grammarIssues: { excerpt: string; suggestion: string }[];
};

export function validateAnalysis(raw: string, resumeText: string): ResumeAnalysis {
  const o = parseJson(raw);
  const severities = new Set(["high", "medium", "low"]);
  const issues = (Array.isArray(o.issues) ? o.issues : [])
    .map(asObj)
    .map((i) => ({
      section: outStr(i.section, "section", 60, false) || "General",
      severity: (severities.has(String(i.severity)) ? i.severity : "medium") as "high" | "medium" | "low",
      message: outStr(i.message, "message", 300, false),
    }))
    .filter((i) => i.message)
    .slice(0, 12);
  // A grammar note is only kept if it quotes text that is really in the resume.
  const grammarIssues = (Array.isArray(o.grammarIssues) ? o.grammarIssues : [])
    .map(asObj)
    .map((g) => ({ excerpt: outStr(g.excerpt, "excerpt", 200, false), suggestion: outStr(g.suggestion, "suggestion", 300, false) }))
    .filter((g) => g.excerpt && g.suggestion && resumeText.includes(g.excerpt.toLowerCase()))
    .slice(0, 10);
  return { overallAssessment: outStr(o.overallAssessment, "overallAssessment", 800), strengths: outList(o.strengths, 6), issues, grammarIssues };
}

export type JobMatch = {
  relevance: "low" | "medium" | "high";
  matchedSkills: string[];
  missingKeywords: string[];
  relevantItems: { label: string; reason: string }[];
  suggestions: string[];
};

export function validateJobMatch(raw: string, resumeText: string, jobDescription: string): JobMatch {
  const o = parseJson(raw);
  const jd = jobDescription.toLowerCase();
  const claimedMatched = outList(o.matchedSkills, 30, 60);
  const claimedMissing = outList(o.missingKeywords, 30, 60);
  // Re-derive both lists from the actual texts: a "match" must really be in the resume,
  // a "missing" keyword must really be in the job description and absent from the resume.
  const matchedSkills = dedupe(claimedMatched.filter((k) => containsTerm(resumeText, k)));
  const missingKeywords = dedupe(
    [...claimedMissing, ...claimedMatched.filter((k) => !containsTerm(resumeText, k))].filter((k) => containsTerm(jd, k) && !containsTerm(resumeText, k)),
  );
  const relevance = (["low", "medium", "high"].includes(String(o.relevance)) ? o.relevance : "medium") as JobMatch["relevance"];
  const relevantItems = (Array.isArray(o.relevantItems) ? o.relevantItems : [])
    .map(asObj)
    .map((r) => ({ label: outStr(r.label, "label", 160, false), reason: outStr(r.reason, "reason", 300, false) }))
    .filter((r) => r.label && containsTerm(resumeText, r.label))
    .slice(0, 8);
  return { relevance, matchedSkills, missingKeywords, relevantItems, suggestions: outList(o.suggestions, 8) };
}

// ─── Anti-fabrication ────────────────────────────────────────────────────────

const NUMBER_TOKEN = /\d+(?:[.,]\d+)*\s*(?:%|percent|x\b|k\b|lakh|crore|million|billion)?/gi;
const URL_TOKEN = /\b(?:https?:\/\/|www\.)[^\s)]+/gi;
const EMAIL_TOKEN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

const normaliseNumber = (n: string) => n.toLowerCase().replace(/\s+/g, "").replace(/,/g, "");
const normalise = (t: string) => t.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Numbers (metrics, percentages, counts, years), links and emails that appear in
 * the AI output but nowhere in the student's own source text. Any hit means the
 * model invented a detail, and the output is rejected.
 */
export function findUnsupportedDetails(source: string, output: string): string[] {
  const src = source.toLowerCase();
  const srcNumbers = new Set((src.match(NUMBER_TOKEN) ?? []).map(normaliseNumber));
  const srcDigits = new Set((src.match(/\d+/g) ?? []).map((d) => d.replace(/^0+(?=\d)/, "")));
  const problems: string[] = [];
  for (const raw of output.match(NUMBER_TOKEN) ?? []) {
    const n = normaliseNumber(raw);
    const digits = (raw.match(/\d+/g) ?? []).map((d) => d.replace(/^0+(?=\d)/, ""));
    const hasUnit = /[%a-z]/i.test(n);
    const supported = srcNumbers.has(n) || (!hasUnit && digits.every((d) => srcDigits.has(d)));
    if (!supported) problems.push(raw.trim());
  }
  for (const url of output.match(URL_TOKEN) ?? []) if (!src.includes(url.toLowerCase())) problems.push(url);
  for (const email of output.match(EMAIL_TOKEN) ?? []) if (!src.includes(email.toLowerCase())) problems.push(email);
  return Array.from(new Set(problems));
}

export function containsTerm(haystackLower: string, term: string): boolean {
  const t = term.toLowerCase().trim();
  if (!t) return false;
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Word-ish boundaries that still work for terms like "c++", "node.js", "c#".
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(haystackLower);
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    const k = i.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
