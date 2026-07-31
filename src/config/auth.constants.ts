/**
 * Centralized authentication configuration.
 *
 * All auth-related constants live here. No magic numbers elsewhere.
 * Structured for future additions (password reset, MFA, OAuth)
 * without requiring architectural changes.
 */
export const AuthConfig = {
  cooldown: {
    /** Cooldown after signup rate limit (ms) */
    signup: 60_000,
    /** Cooldown after resend rate limit (ms) */
    resend: 60_000,
  },

  resend: {
    /** Maximum number of resend attempts before hard-blocking */
    maxAttempts: 3,
  },

  validation: {
    /** Minimum password length enforced client-side */
    passwordMinLength: 8,
  },
} as const;

/** Operations that SingleFlight and CooldownStore track independently */
export type AuthOperation = "signup" | "signin" | "resend" | "reset_password";
