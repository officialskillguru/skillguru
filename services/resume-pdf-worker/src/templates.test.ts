// @vitest-environment node
// Renders every registered template with representative data (no TeX needed).
// Full compilation + PDF text extraction is verified in the worker image:
//   node services/resume-pdf-worker/scripts/verify-templates.ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FIXTURES } from "./fixtures.ts";
import { loadRegistry, loadTemplate } from "./registry.ts";
import { renderTemplate } from "./template-engine.ts";
import { buildTemplateView } from "./view-model.ts";

const ROOT = fileURLToPath(new URL("../../../resume-templates", import.meta.url));
const registry = await loadRegistry(ROOT);

/** Braces balanced, ignoring escaped \{ \} and comments. */
function braceBalance(tex: string): number {
  let depth = 0;
  for (const line of tex.split("\n")) {
    const code = line.replace(/(^|[^\\])%.*$/, "$1").replace(/\\[{}]/g, "");
    for (const ch of code) {
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      if (depth < 0) return depth;
    }
  }
  return depth;
}

function envBalance(tex: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const m of tex.matchAll(/\\(begin|end)\{([a-zA-Z*]+)\}/g)) counts[m[2]!] = (counts[m[2]!] ?? 0) + (m[1] === "begin" ? 1 : -1);
  return Object.fromEntries(Object.entries(counts).filter(([, v]) => v !== 0));
}

describe("registry", () => {
  it("lists the integrated templates with honest licence status", () => {
    expect(registry.map((t) => t.id)).toEqual(["classic-ats", "modern-lato", "simple-cv"]);
    expect(registry.find((t) => t.id === "simple-cv")?.license.commercialUseReviewed).toBe(false);
    for (const t of registry) expect(readFileSync(`${ROOT}/${t.id}/LICENSE`, "utf8").length).toBeGreaterThan(20);
  });

  it("refuses to compile an unreviewed-licence template for students", async () => {
    await expect(loadTemplate(ROOT, "simple-cv", false)).rejects.toThrow(/licence not reviewed/);
    await expect(loadTemplate(ROOT, "simple-cv", true)).resolves.toBeTruthy();
  });
});

describe.each(registry.map((t) => t.id))("template %s", (id) => {
  it.each(Object.keys(FIXTURES))("renders %s into well-formed LaTeX", async (fixture) => {
    const template = await loadTemplate(ROOT, id, true);
    const { view } = buildTemplateView(FIXTURES[fixture as keyof typeof FIXTURES], template.meta.compiler);
    const tex = renderTemplate(template.body, view);

    expect(tex).not.toMatch(/<<\s*[#^/]?\s*[A-Za-z0-9_.]+\s*>>/); // no unresolved markers
    expect(braceBalance(tex)).toBe(0);
    expect(envBalance(tex)).toEqual({});
    expect(tex).toMatch(/\\begin\{document\}[\s\S]*\\end\{document\}\s*$/);
    // Only one \end{document}: injected "\end{document}" text must have been escaped.
    expect(tex.match(/\\end\{document\}/g)).toHaveLength(1);
    // Injection attempts arrive as printable text only.
    expect(tex).not.toMatch(/\\input\{\/etc|\\write18|\\immediate|\\def\\x|\^\^5c/);
    // Lists never open empty (LaTeX error "missing \item").
    expect(tex).not.toMatch(/\\begin\{itemize\}(\[[^\]]*\])?\s*\\end\{itemize\}/);
    expect(tex).not.toMatch(/\\resumeItemListStart\s*\\resumeItemListEnd/);
  });

  it("omits headings for empty sections", async () => {
    const template = await loadTemplate(ROOT, id, true);
    const tex = renderTemplate(template.body, buildTemplateView(FIXTURES.minimal, template.meta.compiler).view);
    for (const heading of ["Education", "Experience", "Internships", "Projects", "Certifications", "Achievements", "Languages", "Positions", "Summary"]) {
      expect(tex).not.toMatch(new RegExp(`\\\\(sectitle|section)\\{${heading}\\}`));
    }
    expect(tex).toMatch(/Riya Patel/);
    expect(tex).toMatch(/Excel/);
  });
});
