// @vitest-environment node
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { signWorkerRequest } from "../../../supabase/functions/_shared/pdf-worker-client.ts";
import { signRequest, verifyRequest } from "./auth.ts";
import { compileLatex } from "./compile.ts";
import { displayUrl, escapeLatex, escapeUrl, findUnsupportedCharacters } from "./latex-escape.ts";
import { checkExtractedText } from "./pdf-validate.ts";
import { TemplateNotAvailableError, loadTemplate } from "./registry.ts";
import { TemplateError, renderTemplate, safe } from "./template-engine.ts";
import { buildTemplateView, expectedPdfText, formatDateRange } from "./view-model.ts";

describe("escapeLatex", () => {
  it("escapes every LaTeX special character", () => {
    expect(escapeLatex("A & B 100% $5 #1 a_b {x} ~ ^ \\")).toBe(
      "A \\& B 100\\% \\$5 \\#1 a\\_b \\{x\\} \\textasciitilde{} \\textasciicircum{} \\textbackslash{}",
    );
  });

  it("neutralises command injection attempts", () => {
    const attacks = ["\\input{/etc/passwd}", "\\write18{rm -rf /}", "\\immediate\\write18{id}", "}\\end{document}", "\\def\\x{y}\\x", "^^5cinput{/etc/passwd}"];
    for (const attack of attacks) {
      // Remove every escape sequence we emit; nothing LaTeX-active may remain.
      const residue = escapeLatex(attack).replace(/\\(textbackslash|textasciicircum|textasciitilde|textless|textgreater|textbar)\{\}|\\[{}$&#%_]|\{\[\}|\{\]\}/g, "");
      expect(residue).not.toMatch(/[\\{}]/);
    }
  });

  it("collapses newlines, strips control characters and keeps Unicode names", () => {
    expect(escapeLatex("Line1\nLine2\t\u0007x")).toBe("Line1 Line2 x");
    expect(escapeLatex("Zoë Ñúñez — Āryan")).toBe("Zoë Ñúñez — Āryan");
    expect(escapeLatex("Pay ₹500")).toBe("Pay INR 500");
    expect(escapeLatex("C--D ``q''")).toBe("C-{}-D `{}`q'{}'");
  });

  it("detects characters pdfLaTeX cannot print", () => {
    expect(findUnsupportedCharacters("Aarav Sharma, Zoë", "pdflatex")).toEqual([]);
    expect(findUnsupportedCharacters("आरव", "pdflatex").length).toBeGreaterThan(0);
    expect(findUnsupportedCharacters("आरव", "xelatex")).toEqual([]);
  });
});

describe("escapeUrl", () => {
  it("allows only http(s) and escapes LaTeX-special URL characters", () => {
    expect(escapeUrl("javascript:alert(1)")).toBe("");
    expect(escapeUrl("file:///etc/passwd")).toBe("");
    expect(escapeUrl("not a url")).toBe("");
    expect(escapeUrl("https://example.com/a_b?x=1&y=2#top")).toBe("https://example.com/a\\_b?x=1\\&y=2\\#top");
    expect(escapeUrl("https://example.com/{x}\\y")).not.toMatch(/[{}]|\\(?![%#&_])/);
    expect(displayUrl("https://www.linkedin.com/in/aarav_s/")).toBe("linkedin.com/in/aarav\\_s");
  });
});

describe("template engine", () => {
  it("renders variables, lists, nested sections and inverted sections", () => {
    const tpl = "<<name>>|<<#items>>[<<.>>]<</items>>|<<#jobs>><<title>>@<<org>>;<</jobs>>|<<^none>>empty<</none>>|<<#flag>>yes<</flag>>";
    const out = renderTemplate(tpl, {
      name: safe("A"),
      items: [safe("x"), safe("y")],
      jobs: [{ title: safe("Dev"), org: safe("Acme") }],
      none: [],
      flag: true,
    });
    expect(out).toBe("A|[x][y]|Dev@Acme;|empty|yes");
  });

  it("refuses raw (unescaped) values and malformed templates", () => {
    expect(() => renderTemplate("<<name>>", { name: "\\evil" as never })).toThrow(TemplateError);
    expect(() => renderTemplate("<<#a>>x", {})).toThrow(/Unclosed/);
    expect(() => renderTemplate("<</a>>", {})).toThrow(/Unexpected closing/);
  });

  it("leaves LaTeX braces in the template untouched", () => {
    expect(renderTemplate("\\section{<<h>>}", { h: safe("Skills") })).toBe("\\section{Skills}");
  });
});

const sample = {
  personal: { fullName: "Aarav Sharma", email: "aarav@example.com", phone: "+91 98765 43210", city: "Pune", country: "India", linkedin: "https://linkedin.com/in/aarav", github: "" },
  summary: { summary: "Final-year BCA student & web developer.\n\nLoves 100% clean code.", objective: "" },
  education: [
    { id: "e1", institution: "Pune University", degree: "BCA", startDate: "2022", endDate: "2025", cgpa: "8.4" },
    { id: "e2", institution: "City School", degree: "HSC", endDate: "2022" },
  ],
  experience: [
    { id: "x1", kind: "job", title: "Support Associate", organization: "Acme_Co", startDate: "2024-06", current: true, responsibilities: "- Responded to customer inquiries\n- Resolved issues", technologies: ["Excel"] },
    { id: "x2", kind: "internship", title: "Web Intern", organization: "StartUp", startDate: "2023-05", endDate: "2023-07", responsibilities: "Built pages" },
  ],
  projects: [{ id: "p1", name: "Attendance App", description: "Developed an attendance app", technologies: ["React", "Node.js", "MongoDB"], repoUrl: "https://github.com/a/b" }],
  skills: [{ id: "s1", category: "Programming Languages", items: ["Python", "C#", "C++"] }, { id: "s2", category: "Empty", items: [] }],
  certifications: [],
  additional: [{ id: "a1", kind: "volunteering", title: "NSS Volunteer" }],
};

describe("view model", () => {
  it("escapes everything, supports multiple entries, and flags empty sections", () => {
    const { view } = buildTemplateView(sample, "pdflatex");
    const tpl = "<<#education>><<institution>>;<</education>>|<<#experience>><<organization>>:<<#bullets>>*<<.>><</bullets>><</experience>>|<<#internships>><<title>><</internships>>|<<#skills>><<category>>=<<items>>;<</skills>>|<<#hasCertifications>>CERTS<</hasCertifications>>|<<#additional>><<heading>><</additional>>|<<#summaryParagraphs>>[<<.>>]<</summaryParagraphs>>";
    expect(renderTemplate(tpl, view)).toBe(
      "Pune University;City School;|Acme\\_Co:*Responded to customer inquiries*Resolved issues|Web Intern|Programming Languages=Python, C\\#, C++;||Volunteering|[Final-year BCA student \\& web developer.][Loves 100\\% clean code.]",
    );
    expect(view.hasCertifications).toBe(false);
    expect(view.hasLinks).toBe(true);
  });

  it("survives corrupted stored data instead of crashing", () => {
    const { view } = buildTemplateView({ personal: { fullName: 42 }, education: "nope", projects: [{ id: "p", name: "Ok" }, { bad: true }] }, "pdflatex");
    expect(view.hasEducation).toBe(false);
    expect((view.projects as unknown[]).length).toBe(1);
  });

  it("formats date ranges", () => {
    expect(formatDateRange("2024-06", "", true)).toBe("Jun 2024 – Present");
    expect(formatDateRange("2022", "2025", false)).toBe("2022 – 2025");
    expect(formatDateRange("", "2025-03", false)).toBe("Mar 2025");
  });

  it("lists the strings the PDF text layer must contain", () => {
    const { data } = buildTemplateView(sample, "pdflatex");
    expect(expectedPdfText(data).map((e) => e.label)).toEqual(["name", "email", "phone", "skills", "experience", "education"]);
  });
});

describe("HMAC auth", () => {
  const secret = "s".repeat(40);
  it("accepts a valid signature produced by the Deno Edge Function client", async () => {
    const body = JSON.stringify({ templateId: "x" });
    const ts = Math.floor(Date.now() / 1000);
    const fromDeno = await signWorkerRequest(secret, body, ts);
    expect(fromDeno).toBe(await signRequest(secret, body, ts));
    expect(await verifyRequest(secret, body, String(ts), fromDeno)).toBe(true);
  });

  it("rejects tampered bodies, stale timestamps, wrong secrets and weak secrets", async () => {
    const ts = Math.floor(Date.now() / 1000);
    const sig = await signRequest(secret, "body", ts);
    expect(await verifyRequest(secret, "body2", String(ts), sig)).toBe(false);
    expect(await verifyRequest(secret, "body", String(ts - 600), await signRequest(secret, "body", ts - 600))).toBe(false);
    expect(await verifyRequest("t".repeat(40), "body", String(ts), sig)).toBe(false);
    expect(await verifyRequest("short", "body", String(ts), await signRequest("short", "body", ts))).toBe(false);
    expect(await verifyRequest(secret, "body", null, sig)).toBe(false);
  });
});

describe("PDF text validation", () => {
  it("finds expected text despite extraction reflow and checks heading order", () => {
    const extracted = "AARAV SHARMA\naarav@example.com | +91 98765\n43210\nEDUCATION\nPune University\nEXPERIENCE\nAcme\nSKILLS\nPython";
    const ok = checkExtractedText(extracted, [{ label: "name", text: "Aarav Sharma" }, { label: "phone", text: "+91 98765 43210" }, { label: "skills", text: "Python" }], ["Education", "Experience", "Skills"]);
    expect(ok).toEqual({ missing: [], outOfOrder: [] });
    const bad = checkExtractedText("SKILLS Python EDUCATION", [{ label: "email", text: "a@b.com" }], ["Education", "Skills"]);
    expect(bad).toEqual({ missing: ["email"], outOfOrder: ["Skills"] });
  });
});

describe("registry loading", () => {
  let root: string;
  const base = {
    name: "Test", description: "", version: "1.0.0", mainFile: "resume.tex", bodyTemplate: "body.tex.tpl", compiler: "pdflatex",
    supportedSections: ["personal"], license: { name: "MIT", commercialUseReviewed: true }, ats: { singleColumn: true, notes: "" },
  };
  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "tpl-"));
    await mkdir(join(root, "good"));
    await writeFile(join(root, "good", "body.tex.tpl"), "x");
    await writeFile(
      join(root, "registry.json"),
      JSON.stringify({
        registryVersion: 1,
        templates: [
          { ...base, id: "good", status: "active" },
          { ...base, id: "draft", status: "testing" },
        ],
      }),
    );
  });
  afterAll(() => rm(root, { recursive: true, force: true }));

  it("loads active templates and refuses unknown, inactive or malformed ids", async () => {
    await expect(loadTemplate(root, "good", false)).resolves.toMatchObject({ body: "x" });
    await expect(loadTemplate(root, "missing", false)).rejects.toThrow(TemplateNotAvailableError);
    await expect(loadTemplate(root, "draft", false)).rejects.toThrow(TemplateNotAvailableError);
    await expect(loadTemplate(root, "draft", true)).rejects.toThrow(/missing template file/);
    await expect(loadTemplate(root, "../etc", false)).rejects.toThrow(TemplateNotAvailableError);
  });

  it("rejects a registry that declares a path-escaping asset (schema level)", async () => {
    const badRoot = await mkdtemp(join(tmpdir(), "tpl-bad-"));
    await writeFile(
      join(badRoot, "registry.json"),
      JSON.stringify({ registryVersion: 1, templates: [{ ...base, id: "escape", status: "active", assets: ["sub/../../registry.json"] }] }),
    );
    await expect(loadTemplate(badRoot, "escape", false)).rejects.toThrow(/no parent paths/);
    await rm(badRoot, { recursive: true, force: true });
  });
});

describe("compileLatex", () => {
  it("reports ENGINE_MISSING instead of crashing when the engine is absent (e.g. a dev laptop)", async () => {
    const result = await compileLatex({ engine: "pdflatex", templateDir: tmpdir(), assets: [], mainFile: "resume.tex", source: "\\documentclass{article}\\begin{document}x\\end{document}", timeoutMs: 20_000 });
    // On a machine/container with TeX Live installed this compiles instead; both are valid outcomes.
    if (!result.ok) expect(["ENGINE_MISSING", "COMPILE_FAILED"]).toContain(result.code);
    else expect(result.pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  it("rejects asset paths that escape the template directory", async () => {
    await expect(compileLatex({ engine: "pdflatex", templateDir: tmpdir(), assets: ["../x"], mainFile: "resume.tex", source: "", timeoutMs: 1000 })).rejects.toThrow(/escapes/);
  });
});

describe("server.handleCompile", () => {
  it("rejects unsigned requests and unknown templates", async () => {
    vi.stubEnv("RESUME_PDF_WORKER_SECRET", "k".repeat(40));
    vi.resetModules();
    const { handleCompile } = await import("./server.ts");
    const body = Buffer.from(JSON.stringify({ requestId: "r", templateId: "does-not-exist", resumeData: sample }));
    expect((await handleCompile(body, {})).status).toBe(401);
    const ts = Math.floor(Date.now() / 1000);
    const sig = await signRequest("k".repeat(40), body, ts);
    const res = await handleCompile(body, { "x-sg-timestamp": String(ts), "x-sg-signature": sig });
    expect(res).toMatchObject({ status: 404, json: { code: "TEMPLATE_NOT_AVAILABLE" } });
    vi.unstubAllEnvs();
  });
});
