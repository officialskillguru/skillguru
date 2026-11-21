// ============================================================================
// Generated-PDF validation (ATS readability gate).
// ============================================================================
// A PDF is only accepted if it is a real, non-trivial PDF whose text layer
// (extracted with Mozilla pdf.js, the same kind of text extraction ATS
// parsers rely on) contains the student's key details and the section
// headings in a sensible reading order. Pure Node: no system PDF tools needed.
// ============================================================================
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export type PdfExpectation = { label: string; text: string };
export type PdfValidation = {
  ok: boolean;
  pages: number;
  missing: string[];
  outOfOrder: string[];
  reason: "OK" | "NOT_A_PDF" | "TOO_SMALL" | "TOO_LARGE" | "NO_TEXT" | "MISSING_TEXT" | "TOO_MANY_PAGES" | "EXTRACTION_FAILED";
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
  // Each heading must appear AFTER the previous one (searching forward, so the same
  // word earlier in body text, e.g. "experience" in a summary, can't satisfy it).
  const outOfOrder: string[] = [];
  let cursor = 0;
  for (const heading of orderedHeadings) {
    const at = hay.indexOf(normaliseExtracted(heading), cursor);
    if (at < 0) outOfOrder.push(heading);
    else cursor = at + 1;
  }
  return { missing, outOfOrder };
}

/** Section headings a rendered template actually prints, in document order (plain-word headings only). */
export function renderedHeadings(source: string): string[] {
  return [...source.matchAll(/\\(?:section|sectitle)\{([^{}\\]*)\}/g)].map((m) => m[1]!.trim()).filter((h) => /^[A-Za-z][A-Za-z &]*$/.test(h));
}

/** Extracts the text layer page by page (reading order as stored in the PDF). */
export async function extractPdfText(pdf: Uint8Array, timeoutMs = 15_000): Promise<{ pages: number; text: string }> {
  const task = getDocument({
    data: new Uint8Array(pdf), // pdf.js takes ownership of the buffer
    isEvalSupported: false, // never evaluate code from a PDF
    disableFontFace: true,
    useSystemFonts: false,
    stopAtErrors: true,
    verbosity: 0,
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("pdf text extraction timed out")), timeoutMs);
  });
  try {
    const doc = await Promise.race([task.promise, timeout]);
    let text = "";
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      for (const item of content.items) {
        if ("str" in item) text += item.str + (item.hasEOL ? "\n" : " ");
      }
      text += "\n";
    }
    const pages = doc.numPages;
    await doc.destroy();
    return { pages, text };
  } finally {
    clearTimeout(timer);
    await task.destroy().catch(() => undefined);
  }
}

export async function validatePdf(pdf: Buffer, expectations: PdfExpectation[], orderedHeadings: string[], maxPages = 4): Promise<PdfValidation> {
  const base = { pages: 0, missing: [] as string[], outOfOrder: [] as string[] };
  if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") return { ...base, ok: false, reason: "NOT_A_PDF" };
  if (pdf.length < 1024) return { ...base, ok: false, reason: "TOO_SMALL" };
  if (pdf.length > MAX_BYTES) return { ...base, ok: false, reason: "TOO_LARGE" };

  let extracted: { pages: number; text: string };
  try {
    extracted = await extractPdfText(pdf);
  } catch {
    return { ...base, ok: false, reason: "EXTRACTION_FAILED" };
  }
  const { pages, text } = extracted;
  if (pages > maxPages) return { ...base, pages, ok: false, reason: "TOO_MANY_PAGES" };
  if (normaliseExtracted(text).length < 20) return { ...base, pages, ok: false, reason: "NO_TEXT" };
  const { missing, outOfOrder } = checkExtractedText(text, expectations, orderedHeadings);
  return { ok: missing.length === 0, pages, missing, outOfOrder, reason: missing.length ? "MISSING_TEXT" : "OK" };
}
