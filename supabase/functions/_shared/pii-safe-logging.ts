// ============================================================================
// PII-safe logging — Phase 2.3
// ============================================================================
// Masks obvious PII (email, phone) before it's written to agent_logs/console.
// This is a mitigation for accidental over-logging, not a claim of complete
// PII detection — lead data itself is legitimately stored unmasked in the
// `leads` table (that's the point of collecting it), this only applies to the
// free-text conversation content written into observability logs.
// ============================================================================

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// Matches any run of digits (optionally grouped with spaces/dashes/parens, optionally
// +country-code-prefixed) containing at least 7 digits total -- deliberately permissive
// about grouping since phone formatting varies wildly by country/user input.
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{6,}\d)/g;

export function maskPII(text: string): string {
  return text
    .replace(EMAIL_PATTERN, "[email redacted]")
    .replace(PHONE_PATTERN, (match) => ((match.match(/\d/g)?.length ?? 0) >= 7 ? "[phone redacted]" : match));
}

/** Injection-attempt heuristic for logging/flagging only — never used to block a user's turn outright, since that would also block legitimate messages containing the same words (e.g. "ignore" in a normal sentence). */
const INJECTION_PATTERNS = [
  /ignore (all |the )?(previous|prior|above) instructions/i,
  /disregard (all |the )?(previous|prior|above) (instructions|rules)/i,
  /you are now/i,
  /reveal (your |the )?(system )?prompt/i,
  /pretend (you are|to be)/i,
  /act as (if )?(you (are|were)|an?)/i,
];

export function detectPossibleInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}
