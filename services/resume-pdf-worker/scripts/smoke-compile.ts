// ============================================================================
// Build-time smoke compile (run inside the worker image during `docker build`).
// ============================================================================
// Renders every registered template with every fixture, compiles it with the
// same sandboxed compileLatex() the server uses, and runs the same PDF text
// validation. Any failure fails the image build, so an image whose TeX
// installation is missing a package can never be deployed.
// ============================================================================
import { fileURLToPath } from "node:url";
import { compileLatex, summariseTexLog } from "../src/compile.ts";
import { FIXTURES } from "../src/fixtures.ts";
import { renderedHeadings, validatePdf } from "../src/pdf-validate.ts";
import { loadRegistry, loadTemplate } from "../src/registry.ts";
import { renderTemplate } from "../src/template-engine.ts";
import { buildTemplateView, expectedPdfText } from "../src/view-model.ts";

const ROOT = process.env.RESUME_TEMPLATES_DIR ?? fileURLToPath(new URL("../../../resume-templates", import.meta.url));
let failures = 0;

for (const meta of await loadRegistry(ROOT)) {
  const template = await loadTemplate(ROOT, meta.id, true);
  for (const [name, fixture] of Object.entries(FIXTURES)) {
    const { view, data } = buildTemplateView(fixture, meta.compiler);
    const source = renderTemplate(template.body, view);
    const result = await compileLatex({ engine: meta.compiler, templateDir: template.dir, assets: meta.assets, mainFile: meta.mainFile, source, timeoutMs: 60_000 });
    if (!result.ok) {
      failures++;
      console.log(`FAIL ${meta.id} ${name}: ${result.code}\n${summariseTexLog(result.log)}`);
      continue;
    }
    const check = await validatePdf(result.pdf, expectedPdfText(data), renderedHeadings(source), 4);
    if (!check.ok) {
      failures++;
      console.log(`FAIL ${meta.id} ${name}: ${check.reason} missing=${check.missing.join(",")} pages=${check.pages}`);
      continue;
    }
    if (check.outOfOrder.length) {
      failures++;
      console.log(`FAIL ${meta.id} ${name}: headings missing or out of reading order: ${check.outOfOrder.join(", ")}`);
      continue;
    }
    console.log(`PASS ${meta.id} ${name}: pages=${check.pages} bytes=${result.pdf.length}`);
  }
}
process.exit(failures === 0 ? 0 : 1);
