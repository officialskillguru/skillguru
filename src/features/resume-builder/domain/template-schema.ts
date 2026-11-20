// ============================================================================
// Template registry schema - shared by the web app (templates.ts) and the PDF
// worker (services/resume-pdf-worker/src/registry.ts). No JSON import here so
// Node can load it directly.
// ============================================================================
import { z } from "zod";

export const RESUME_SECTIONS = [
  "personal",
  "summary",
  "education",
  "experience",
  "projects",
  "skills",
  "certifications",
  "achievements",
  "languages",
  "additional",
] as const;

export const templateMetadataSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}$/),
  name: z.string().min(1).max(80),
  description: z.string().max(400),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  status: z.enum(["active", "testing", "disabled"]),
  category: z.string().max(60).optional(),
  mainFile: z.string().regex(/^[A-Za-z0-9_.-]+\.tex$/),
  bodyTemplate: z.string().regex(/^[A-Za-z0-9_.-]+$/),
  compiler: z.enum(["pdflatex", "xelatex", "lualatex"]),
  assets: z.array(z.string().regex(/^[A-Za-z0-9_./-]+$/).refine((p) => !p.includes(".."), "no parent paths")).default([]),
  previewImage: z.string().max(200).optional(),
  supportedSections: z.array(z.enum(RESUME_SECTIONS)).min(1),
  requiredPackages: z.array(z.string()).default([]),
  requiredFonts: z.array(z.string()).default([]),
  license: z.object({
    name: z.string().min(1),
    url: z.string().optional(),
    attribution: z.string().optional(),
    commercialUseReviewed: z.boolean(),
  }),
  ats: z.object({
    singleColumn: z.boolean(),
    notes: z.string().max(500),
    lastValidatedAt: z.string().optional(),
  }),
});

export type ResumeTemplateMetadata = z.infer<typeof templateMetadataSchema>;

export const registrySchema = z.object({
  registryVersion: z.literal(1),
  templates: z.array(templateMetadataSchema),
});
