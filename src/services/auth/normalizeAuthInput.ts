/**
 * Normalizes authentication input before validation or API calls.
 *
 * Applied to every auth entry point: signup, login, resend, forgot password.
 * Ensures the repository always receives canonical data.
 *
 * Operations:
 * - Trim leading/trailing whitespace
 * - Lowercase email
 * - Strip zero-width Unicode characters (U+200B–U+200D, U+FEFF)
 * - Collapse multiple consecutive spaces to one
 */

/** Regex matching zero-width Unicode characters */
const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF]/g;

/** Regex matching multiple consecutive whitespace characters */
const MULTI_SPACE_REGEX = /\s{2,}/g;

function sanitize(value: string): string {
  return value.replace(ZERO_WIDTH_REGEX, "").replace(MULTI_SPACE_REGEX, " ").trim();
}

/**
 * Normalizes an email address for auth operations.
 * Used by signup, login, resend, and forgot-password.
 */
export function normalizeEmail(email: string): string {
  return sanitize(email).toLowerCase();
}

/**
 * Normalizes a full name (trim, collapse whitespace, strip zero-width).
 */
export function normalizeName(name: string): string {
  return sanitize(name);
}

/**
 * Normalizes a complete set of signup credentials.
 */
export function normalizeSignupInput(input: {
  email: string;
  fullName: string;
  password: string;
  role: string;
}): { email: string; fullName: string; password: string; role: string } {
  return {
    email: normalizeEmail(input.email),
    fullName: normalizeName(input.fullName),
    password: input.password, // Never mutate passwords
    role: input.role,
  };
}

/**
 * Normalizes login credentials.
 */
export function normalizeLoginInput(input: {
  email: string;
  password: string;
}): { email: string; password: string } {
  return {
    email: normalizeEmail(input.email),
    password: input.password, // Never mutate passwords
  };
}
