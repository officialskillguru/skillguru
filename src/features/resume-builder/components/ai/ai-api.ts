// Typed client + helpers for the resume-ai Edge Function (no React components).
import { EdgeFunctionError, invokeResumeFunction } from "@/services/resumes.service";
import type { EditorPath, EditorValues } from "../form-model";

export type AiTextOperation =
  | "improve_summary"
  | "improve_objective"
  | "improve_experience"
  | "improve_internship"
  | "improve_project"
  | "fix_grammar"
  | "shorten"
  | "professional_tone";

export type TextImprovementResult = { original: string; improvedText: string; changes: string[]; missingInformation: string[] };
export type ResumeSuggestion = { fieldPath: string; label: string; original: string; improvedText: string; reason: string };
export type KeywordSuggestion = { keyword: string; reason: string; presentInResume: boolean };
export type ResumeAnalysis = {
  overallAssessment: string;
  strengths: string[];
  issues: { section: string; severity: "high" | "medium" | "low"; message: string }[];
  grammarIssues: { excerpt: string; suggestion: string }[];
};
export type JobMatch = {
  relevance: "low" | "medium" | "high";
  matchedSkills: string[];
  missingKeywords: string[];
  relevantItems: { label: string; reason: string }[];
  suggestions: string[];
};

export function callResumeAi<T>(payload: Record<string, unknown>): Promise<T> {
  return invokeResumeFunction<T>("resume-ai", payload);
}

export function aiErrorMessage(error: unknown): string {
  if (error instanceof EdgeFunctionError) return error.message;
  return "AI improvement is temporarily unavailable. You can continue editing manually.";
}

/** Maps an AI fieldPath ("experience.<entryId>.responsibilities") to the current form path, by entry id. */
export function resolveSuggestionPath(fieldPath: string, values: EditorValues): EditorPath | null {
  const parts = fieldPath.split(".");
  if (parts[0] === "summary" && (parts[1] === "summary" || parts[1] === "objective") && parts.length === 2) return `data.summary.${parts[1]}`;
  const [section, entryId, field] = parts;
  if (parts.length !== 3 || !entryId || !field) return null;
  const allowed: Record<string, string[]> = {
    experience: ["responsibilities", "achievements"],
    projects: ["description", "features", "contributions"],
    achievements: ["description"],
  };
  if (!section || !allowed[section]?.includes(field)) return null;
  const list = values.data[section as "experience" | "projects" | "achievements"] as { id: string }[];
  const index = list.findIndex((e) => e.id === entryId);
  return index >= 0 ? (`data.${section}.${index}.${field}` as EditorPath) : null;
}
