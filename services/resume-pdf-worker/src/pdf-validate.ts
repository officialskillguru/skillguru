// ============================================================================
// Generated-PDF validation (ATS readability gate).
// ============================================================================
// A PDF is only accepted if it is a real, non-trivial PDF whose text layer
// (extracted with poppler's pdftotext, the same kind of extraction ATS
// parsers rely on) contains the student's key details and the section
// headings in a sensible reading order.
// ============================================================================
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type PdfExpectation = { label: string; text: string };
export type PdfValidation = {
  ok: boolean;
  pages: number;
  missing: string[];
  outOfOrder: string[];
  reason: "OK" | "NOT_A_PDF" | "TOO_SMALL" | "TOO_LARGE" | "NO_TEXT" | "MISSING_TEXT" | "TOO_MANY_PAGES" | "EXTRACTOR_MISSING";
};

const MAX_BYTES = 5 * 1024 * 1024;

/** Lower-case, collapse whitespace, unify dashes/quotes so extraction quirks don't cause false failures. */
export function normaliseExtracted(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[‐-―]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

/** Pure check of extracted text against expectations; exported for tests. */
export function checkExtractedText(
  extracted: string,
  expectations: PdfExpectation[],
  orderedHeadings: string[],
): { missing: string[]; outOfOrder: string[] } {
  const hay = normaliseExtracted(extracted);
  const compact = hay.replace(/[\s()-]/g, "");
  const missing = expectations
    .filter((e) => {
      const needle = normaliseExtracted(e.text);
      // Phone numbers/emails may be split or reflowed by extraction; compare without separators too.
      return !hay.includes(needle) && !compact.includes(needle.replace(/[\s()-]/g, ""));
    })
    .map((e) => e.label);
  const positions = orderedHeadings.map((h) => ({ h, i: hay.indexOf(normaliseExtracted(h)) })).filter((p) => p.i >= 0);
  const outOfOrder: string[] = [];
  for (let k = 1; k < positions.length; k++) if (positions[k]!.i < positions[k - 1]!.i) outOfOrder.push(positions[k]!.h);
  return { missing, outOfOrder };
}

function exec(cmd: string, args: string[], timeoutMs: number): Promise<{ code: number | null; stdout: string; missing: boolean }> {
  return new Promise((resolve) => {
    let stdout = "";
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "ignore"] });
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stdout.on("data", (c: Buffer) => {
      if (stdout.length < 2_000_000) stdout += c.toString("utf8");
    });
    child.on("error", (e: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      resolve({ code: null, stdout, missing: e.code === "ENOENT" });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, missing: false });
    });
  });
}

export async function validatePdf(pdf: Buffer, expectations: PdfExpectation[], orderedHeadings: string[], maxPages = 4): Promise<PdfValidation> {
  const base = { pages: 0, missing: [] as string[], outOfOrder: [] as string[] };
  if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") return { ...base, ok: false, reason: "NOT_A_PDF" };
  if (pdf.length < 1024) return { ...base, ok: false, reason: "TOO_SMALL" };
  if (pdf.length > MAX_BYTES) return { ...base, ok: false, reason: "TOO_LARGE" };

  const dir = await mkdtemp(join(tmpdir(), "pdfcheck-"));
  try {
    const file = join(dir, "resume.pdf");
    await writeFile(file, pdf);
    const info = await exec("pdfinfo", [file], 10_000);
    if (info.missing) return { ...base, ok: false, reason: "EXTRACTOR_MISSING" };
    const pages = Number(/Pages:\s+(\d+)/.exec(info.stdout)?.[1] ?? "0");
    if (pages > maxPages) return { ...base, pages, ok: false, reason: "TOO_MANY_PAGES" };
    const text = await exec("pdftotext", ["-enc", "UTF-8", file, "-"], 15_000);
    if (text.missing) return { ...base, pages, ok: false, reason: "EXTRACTOR_MISSING" };
    if (normaliseExtracted(text.stdout).length < 20) return { ...base, pages, ok: false, reason: "NO_TEXT" };
    const { missing, outOfOrder } = checkExtractedText(text.stdout, expectations, orderedHeadings);
    return { ok: missing.length === 0, pages, missing, outOfOrder, reason: missing.length ? "MISSING_TEXT" : "OK" };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
