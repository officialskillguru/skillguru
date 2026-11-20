// ============================================================================
// LaTeX escaping for untrusted student text.
// ============================================================================
// Every value that reaches a template goes through one of these functions, so
// a student can never inject a LaTeX command: backslashes, braces and all
// other special characters become printable text.
// ============================================================================

export type LatexEngine = "pdflatex" | "xelatex" | "lualatex";

const SPECIALS: Record<string, string> = {
  "\\": "\\textbackslash{}",
  "{": "\\{",
  "}": "\\}",
  $: "\\$",
  "&": "\\&",
  "#": "\\#",
  "%": "\\%",
  _: "\\_",
  "^": "\\textasciicircum{}",
  "~": "\\textasciitilde{}",
  "<": "\\textless{}",
  ">": "\\textgreater{}",
  "|": "\\textbar{}",
  "[": "{[}",
  "]": "{]}",
};

/** Symbols pdfLaTeX cannot typeset by default, mapped to safe equivalents (meaning preserved). */
const PDFLATEX_REPLACEMENTS: Record<string, string> = {
  "₹": "INR ",
  "•": "-",
  "→": "->",
  "✓": "",
  "★": "*",
};

/**
 * Escapes arbitrary text for use inside a LaTeX document body.
 * Newlines and tabs collapse to single spaces (structure comes from the
 * template, never from student input); control characters are removed.
 */
export function escapeLatex(input: string, engine: LatexEngine = "pdflatex"): string {
  let text = input.normalize("NFC").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‍﻿]/g, "");
  text = text.replace(/\s+/g, " ").trim();
  if (engine === "pdflatex") {
    text = text.replace(/[₹•→✓★]/g, (c) => PDFLATEX_REPLACEMENTS[c] ?? c);
  }
  let out = "";
  for (const ch of text) out += SPECIALS[ch] ?? ch;
  // "--" / "---" / "``" ligatures would silently change what the student typed.
  return out.replace(/-(?=-)/g, "-{}").replace(/`(?=`)/g, "`{}").replace(/'(?=')/g, "'{}");
}

/**
 * Prepares a URL for \href{...}. Only http(s) URLs are allowed; anything else
 * yields "" (the template's <<#flag>> guard then omits the link). Characters
 * that are special to LaTeX are percent-encoded or escaped.
 */
export function escapeUrl(input: string): string {
  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    return "";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
  return parsed
    .toString()
    .replace(/[\\{}^~|<>"`\s]/g, (c) => encodeURIComponent(c))
    .replace(/%/g, "\\%")
    .replace(/#/g, "\\#")
    .replace(/&/g, "\\&")
    .replace(/_/g, "\\_");
}

/** "https://www.linkedin.com/in/aarav/" -> "linkedin.com/in/aarav" (escaped for display). */
export function displayUrl(input: string, engine: LatexEngine = "pdflatex"): string {
  const plain = input.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "");
  return escapeLatex(plain, engine);
}

/**
 * Characters the selected engine cannot typeset with the template's fonts.
 * pdfLaTeX (T1/utf8) covers Latin scripts and common punctuation; other
 * scripts (e.g. Devanagari) need a XeLaTeX/LuaLaTeX template with a suitable font.
 */
export function findUnsupportedCharacters(text: string, engine: LatexEngine): string[] {
  if (engine !== "pdflatex") return [];
  const bad = new Set<string>();
  for (const ch of text.normalize("NFC")) {
    const cp = ch.codePointAt(0) ?? 0;
    const ok =
      cp <= 0x024f || // Basic Latin, Latin-1, Latin Extended-A/B
      (cp >= 0x2010 && cp <= 0x2027) || // dashes, quotes, ellipsis
      cp === 0x20ac || // €
      ch in PDFLATEX_REPLACEMENTS ||
      /\s/.test(ch);
    if (!ok) bad.add(ch);
  }
  return [...bad];
}
