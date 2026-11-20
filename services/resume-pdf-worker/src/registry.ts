// ============================================================================
// Approved template loading (worker side).
// ============================================================================
// Reads resume-templates/registry.json from the image, validates it with the
// shared schema, and checks every declared file exists inside the template's
// own folder. A template can only be compiled if it is "active" (or "testing"
// when RESUME_WORKER_ALLOW_TESTING=1 for QA). Student requests can only name a
// template id; they can never supply template source.
// ============================================================================
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, normalize, sep } from "node:path";
import { registrySchema, type ResumeTemplateMetadata } from "../../../src/features/resume-builder/domain/template-schema.ts";

export type LoadedTemplate = { meta: ResumeTemplateMetadata; dir: string; body: string };

export class TemplateNotAvailableError extends Error {}

export async function loadRegistry(templatesRoot: string): Promise<ResumeTemplateMetadata[]> {
  const raw: unknown = JSON.parse(await readFile(join(templatesRoot, "registry.json"), "utf8"));
  return registrySchema.parse(raw).templates;
}

export async function loadTemplate(templatesRoot: string, id: string, allowTesting: boolean): Promise<LoadedTemplate> {
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(id)) throw new TemplateNotAvailableError("invalid id");
  const meta = (await loadRegistry(templatesRoot)).find((t) => t.id === id);
  if (!meta) throw new TemplateNotAvailableError("unknown template");
  if (!(meta.status === "active" || (allowTesting && meta.status === "testing"))) throw new TemplateNotAvailableError("template not active");

  const dir = normalize(join(templatesRoot, meta.id));
  const inside = (rel: string) => {
    const p = normalize(join(dir, rel));
    if (!p.startsWith(dir + sep)) throw new TemplateNotAvailableError(`path escapes template folder: ${rel}`);
    if (!existsSync(p)) throw new TemplateNotAvailableError(`missing template file: ${rel}`);
    return p;
  };
  const body = await readFile(inside(meta.bodyTemplate), "utf8");
  for (const asset of meta.assets) inside(asset);
  return { meta, dir, body };
}
