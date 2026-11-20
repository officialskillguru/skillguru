// Wizard step definitions and form <-> storage mapping for the resume editor.
import type { ResumeDetail, SaveResumePatch } from "@/services/resumes.service";
import type { WizardStep } from "./components/WizardStepper";
import type { EditorValues } from "./components/form-model";

export const RESUME_STEPS: (WizardStep & { prefixes: string[] })[] = [
  { id: "setup", label: "Resume Setup", shortLabel: "Setup", prefixes: ["title", "targetRole", "templateId"] },
  { id: "personal", label: "Personal Information", shortLabel: "Personal", prefixes: ["data.personal"] },
  { id: "summary", label: "Professional Summary", shortLabel: "Summary", prefixes: ["data.summary"] },
  { id: "education", label: "Education", shortLabel: "Education", prefixes: ["data.education"] },
  { id: "experience", label: "Experience & Internships", shortLabel: "Experience", prefixes: ["data.experience"] },
  { id: "projects", label: "Projects", shortLabel: "Projects", prefixes: ["data.projects"] },
  { id: "skills", label: "Skills", shortLabel: "Skills", prefixes: ["data.skills"] },
  { id: "certifications", label: "Certifications", shortLabel: "Certifications", prefixes: ["data.certifications"] },
  { id: "additional", label: "Achievements & More", shortLabel: "More", prefixes: ["data.achievements", "data.languages", "data.additional"] },
  { id: "review", label: "Review & Generate", shortLabel: "Review", prefixes: [] },
];

export function toEditorValues(resume: ResumeDetail): EditorValues {
  return { title: resume.title, targetRole: resume.target_role ?? "", templateId: resume.template_id, data: resume.resume_data };
}

/** Stable-key-order patch; an empty title is not sent (the database requires one). */
export function buildPatch(values: EditorValues): SaveResumePatch {
  return {
    ...(values.title.trim() ? { title: values.title } : {}),
    targetRole: values.targetRole,
    templateId: values.templateId,
    data: values.data,
  };
}
