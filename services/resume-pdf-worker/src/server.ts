// ============================================================================
// Resume PDF worker — HTTP entrypoint (Google Cloud Run).
// ============================================================================
// POST /compile  (HMAC-signed by the resume-pdf Edge Function)
//   body: { requestId, templateId, resumeData }
//   200 application/pdf   (X-Resume-Pages header)
//   4xx/5xx JSON { code }  - codes only; TeX logs stay in Cloud Logging.
// GET  /healthz
//
// Run with Node 24 (native TypeScript type stripping): node src/server.ts
// Cloud Run: concurrency 1, no unauthenticated IAM if possible, see README.
// ============================================================================
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, verifyRequest } from "./auth.ts";
import { compileLatex, summariseTexLog } from "./compile.ts";
import { findUnsupportedCharacters } from "./latex-escape.ts";
import { validatePdf } from "./pdf-validate.ts";
import { TemplateNotAvailableError, loadTemplate } from "./registry.ts";
import { renderTemplate, TemplateError } from "./template-engine.ts";
import { buildTemplateView, collectAllText, expectedPdfText } from "./view-model.ts";

const PORT = Number(process.env.PORT ?? 8080);
const SECRET = process.env.RESUME_PDF_WORKER_SECRET ?? "";
const TEMPLATES_ROOT = process.env.RESUME_TEMPLATES_DIR ?? fileURLToPath(new URL("../../../resume-templates", import.meta.url));
const ALLOW_TESTING = process.env.RESUME_WORKER_ALLOW_TESTING === "1";
const COMPILE_TIMEOUT_MS = Number(process.env.RESUME_COMPILE_TIMEOUT_MS ?? 20_000);
const MAX_BODY_BYTES = 512 * 1024;
const MAX_PAGES = Number(process.env.RESUME_MAX_PAGES ?? 4);

let busy = false;

function log(event: string, details: Record<string, unknown>) {
  console.log(JSON.stringify({ severity: details.severity ?? "INFO", event, ...details }));
}

function sendJson(res: ServerResponse, status: number, body: Record<string, unknown>) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new RangeError("body too large");
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

export async function handleCompile(body: Buffer, headers: Record<string, string | string[] | undefined>): Promise<{ status: number; json?: Record<string, unknown>; pdf?: Buffer; pages?: number }> {
  const header = (name: string) => {
    const v = headers[name];
    return Array.isArray(v) ? v[0] : v;
  };
  if (!(await verifyRequest(SECRET, body, header(TIMESTAMP_HEADER), header(SIGNATURE_HEADER)))) return { status: 401, json: { code: "UNAUTHORIZED" } };

  let parsed: unknown;
  try {
    parsed = JSON.parse(body.toString("utf8"));
  } catch {
    return { status: 400, json: { code: "INVALID_REQUEST" } };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { status: 400, json: { code: "INVALID_REQUEST" } };
  const payload = parsed as { requestId?: unknown; templateId?: unknown; resumeData?: unknown };
  const requestId = typeof payload.requestId === "string" ? payload.requestId.slice(0, 64) : "unknown";
  if (typeof payload.templateId !== "string") return { status: 400, json: { code: "INVALID_REQUEST" } };

  let template;
  try {
    template = await loadTemplate(TEMPLATES_ROOT, payload.templateId, ALLOW_TESTING);
  } catch (error) {
    if (error instanceof TemplateNotAvailableError) return { status: 404, json: { code: "TEMPLATE_NOT_AVAILABLE" } };
    throw error;
  }

  const engine = template.meta.compiler;
  const { view, data } = buildTemplateView(payload.resumeData, engine);
  const unsupported = findUnsupportedCharacters(collectAllText(data), engine);
  if (unsupported.length > 0) return { status: 422, json: { code: "UNSUPPORTED_CHARACTERS", characters: unsupported.slice(0, 10) } };

  let source: string;
  try {
    source = renderTemplate(template.body, view);
  } catch (error) {
    log("template_render_failed", { severity: "ERROR", requestId, templateId: template.meta.id, message: error instanceof TemplateError ? error.message : "unknown" });
    return { status: 500, json: { code: "TEMPLATE_ERROR" } };
  }

  const started = Date.now();
  const result = await compileLatex({ engine, templateDir: template.dir, assets: template.meta.assets, mainFile: template.meta.mainFile, source, timeoutMs: COMPILE_TIMEOUT_MS });
  if (!result.ok) {
    log("compile_failed", { severity: "ERROR", requestId, templateId: template.meta.id, code: result.code, tex: summariseTexLog(result.log) });
    return { status: result.code === "COMPILE_TIMEOUT" ? 504 : 500, json: { code: result.code } };
  }

  const headings = ["Education", "Experience", "Projects", "Skills"].filter((h) => (view[`has${h === "Experience" ? "AnyExperience" : h}`] ?? false) === true);
  const validation = await validatePdf(result.pdf, expectedPdfText(data), headings, MAX_PAGES);
  if (!validation.ok) {
    log("pdf_validation_failed", { severity: "WARNING", requestId, templateId: template.meta.id, reason: validation.reason, missing: validation.missing, pages: validation.pages });
    return { status: 422, json: { code: `PDF_${validation.reason}`, missing: validation.missing, pages: validation.pages } };
  }
  log("compiled", { requestId, templateId: template.meta.id, ms: Date.now() - started, pages: validation.pages, bytes: result.pdf.length, outOfOrder: validation.outOfOrder });
  return { status: 200, pdf: result.pdf, pages: validation.pages };
}

export function startServer() {
  if (SECRET.length < 32) {
    console.error("RESUME_PDF_WORKER_SECRET must be set (>= 32 chars). Refusing to start.");
    process.exit(1);
  }
  const handle = async (req: IncomingMessage, res: ServerResponse) => {
    try {
      if (req.method === "GET" && req.url === "/healthz") return sendJson(res, 200, { ok: true });
      if (req.method !== "POST" || req.url !== "/compile") return sendJson(res, 404, { code: "NOT_FOUND" });
      if (busy) return sendJson(res, 503, { code: "BUSY" });
      busy = true;
      try {
        const result = await handleCompile(await readBody(req), req.headers);
        if (result.pdf) {
          res.writeHead(200, { "Content-Type": "application/pdf", "Content-Length": result.pdf.length, "X-Resume-Pages": String(result.pages ?? 0), "Cache-Control": "no-store" });
          return res.end(result.pdf);
        }
        return sendJson(res, result.status, result.json ?? {});
      } finally {
        busy = false;
      }
    } catch (error) {
      if (error instanceof RangeError) return sendJson(res, 413, { code: "TOO_LARGE" });
      log("unhandled", { severity: "ERROR", message: error instanceof Error ? error.message : "unknown" });
      return sendJson(res, 500, { code: "INTERNAL" });
    }
  };
  const server = createServer((req, res) => {
    void handle(req, res);
  });
  server.requestTimeout = 60_000;
  server.listen(PORT, () => log("listening", { port: PORT, templatesRoot: TEMPLATES_ROOT }));
  process.on("SIGTERM", () => server.close(() => process.exit(0)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) startServer();
