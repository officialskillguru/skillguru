// ============================================================================
// End-to-end template verification against a RUNNING worker container.
// ============================================================================
//   docker run --rm -d -p 8080:8080 -e RESUME_PDF_WORKER_SECRET=$SECRET \
//     -e RESUME_WORKER_ALLOW_TESTING=1 --name rpw resume-pdf-worker:dev
//   RESUME_PDF_WORKER_SECRET=$SECRET OUT_DIR=./out node services/resume-pdf-worker/scripts/verify-templates.ts
//
// Sends HMAC-signed /compile requests (the real production path: render ->
// sandboxed pdfLaTeX -> pdftotext validation) for every registered template
// and fixture, writes the PDFs to OUT_DIR, and exits non-zero on any failure.
// ============================================================================
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { signRequest } from "../src/auth.ts";
import { FIXTURES } from "../src/fixtures.ts";
import { loadRegistry } from "../src/registry.ts";

const WORKER_URL = process.env.WORKER_URL ?? "http://localhost:8080";
const SECRET = process.env.RESUME_PDF_WORKER_SECRET ?? "";
const OUT_DIR = process.env.OUT_DIR ?? "resume-pdf-verify";
const ROOT = fileURLToPath(new URL("../../../resume-templates", import.meta.url));

if (SECRET.length < 32) {
  console.error("Set RESUME_PDF_WORKER_SECRET (same value as the container).");
  process.exit(2);
}

await mkdir(OUT_DIR, { recursive: true });
const templates = await loadRegistry(ROOT);
let failures = 0;

for (const template of templates) {
  for (const [fixtureName, resumeData] of Object.entries(FIXTURES)) {
    const body = JSON.stringify({ requestId: `verify-${template.id}-${fixtureName}`, templateId: template.id, resumeData });
    const ts = Math.floor(Date.now() / 1000);
    const started = Date.now();
    const res = await fetch(`${WORKER_URL}/compile`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-sg-timestamp": String(ts), "x-sg-signature": await signRequest(SECRET, body, ts) },
      body,
    });
    const ms = Date.now() - started;
    if (res.ok && res.headers.get("content-type")?.startsWith("application/pdf")) {
      const pdf = Buffer.from(await res.arrayBuffer());
      const file = join(OUT_DIR, `${template.id}-${fixtureName}.pdf`);
      await writeFile(file, pdf);
      console.log(`PASS  ${template.id.padEnd(12)} ${fixtureName.padEnd(15)} pages=${res.headers.get("x-resume-pages")} bytes=${pdf.length} ${ms}ms`);
    } else {
      failures++;
      console.log(`FAIL  ${template.id.padEnd(12)} ${fixtureName.padEnd(15)} HTTP ${res.status} ${await res.text()}`);
    }
  }
}

console.log(failures === 0 ? "\nAll templates compiled and passed PDF text validation." : `\n${failures} failure(s).`);
process.exit(failures === 0 ? 0 : 1);
