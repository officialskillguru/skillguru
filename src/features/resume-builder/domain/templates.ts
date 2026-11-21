// ============================================================================
// Resume template registry (read side).
// ============================================================================
// resume-templates/registry.json is the single list of approved LaTeX
// templates, shared with the PDF worker. Only templates whose status is
// "active" (compiled + text-extraction tested) and licence-reviewed are offered
// to students. With none available the UI says so honestly instead of showing
// placeholder templates.
// ============================================================================
import registryJson from "../../../../resume-templates/registry.json";
import { registrySchema, type ResumeTemplateMetadata } from "./template-schema";

export { RESUME_SECTIONS, templateMetadataSchema, type ResumeTemplateMetadata } from "./template-schema";

function loadRegistry(raw: unknown): ResumeTemplateMetadata[] {
  const parsed = registrySchema.safeParse(raw);
  if (!parsed.success) {
    // A malformed registry must never take the builder down; it simply offers no templates.
    console.error("[resume-templates] registry.json failed validation", parsed.error.issues);
    return [];
  }
  return parsed.data.templates;
}

const ALL_TEMPLATES = loadRegistry(registryJson);

/** Templates students can pick (compiled and validated). */
export function getActiveTemplates(templates: ResumeTemplateMetadata[] = ALL_TEMPLATES): ResumeTemplateMetadata[] {
  return templates.filter((t) => t.status === "active" && t.license.commercialUseReviewed);
}

export function getTemplateById(id: string | null | undefined, templates: ResumeTemplateMetadata[] = ALL_TEMPLATES): ResumeTemplateMetadata | null {
  if (!id) return null;
  return templates.find((t) => t.id === id) ?? null;
}

export function isTemplateSelectable(id: string | null | undefined): boolean {
  return !!id && getActiveTemplates().some((t) => t.id === id);
}

/** Display name for a stored template id, including ids that are no longer offered. */
export function templateDisplayName(id: string | null | undefined): string {
  if (!id) return "No template selected";
  const t = getTemplateById(id);
  if (!t) return "Template unavailable";
  return t.status === "active" ? t.name : `${t.name} (unavailable)`;
}

export { loadRegistry as _loadRegistryForTests };
