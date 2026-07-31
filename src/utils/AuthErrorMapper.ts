import { AuthenticationError, UnexpectedError, RateLimitError, ConflictError, ValidationError } from "@/utils/result";
import type { AppError } from "@/utils/result";
import { AuthConfig } from "@/config/auth.constants";

export class AuthErrorMapper {
  static map(error: unknown): AppError {
    const err = (error || {}) as Record<string, unknown>;
    const status = err.status || err.statusCode;
    const code = typeof err.code === "string" ? err.code : "";
    const message = (err.message as string) || "An unknown error occurred.";

    // ── Rate Limiting ──────────────────────────────────────────────────────

    // Supabase: over_email_send_rate_limit
    if (code === "over_email_send_rate_limit" || (status === 429 && message.includes("email rate limit"))) {
      return new RateLimitError(
        "Too many verification emails requested. Please wait before trying again.",
        "OVER_EMAIL_SEND_RATE_LIMIT",
        AuthConfig.cooldown.resend,
        "Wait for the cooldown period to expire.",
        error
      );
    }

    // Supabase: over_request_rate_limit (general 429)
    if (status === 429 || code === "over_request_rate_limit") {
      return new RateLimitError(
        "Too many requests. Please wait a moment.",
        "OVER_REQUEST_RATE_LIMIT",
        AuthConfig.cooldown.signup,
        "Try again in a few minutes.",
        error
      );
    }

    // ── Network Errors ─────────────────────────────────────────────────────

    if (message.includes("Failed to fetch") || message.includes("NetworkError") || message.includes("network")) {
      return new UnexpectedError(
        "Network connection failed.",
        "NetworkError",
        "Please check your internet connection and try again."
      );
    }

    // ── Conflict: Duplicate Email ──────────────────────────────────────────

    if (status === 400 && message.includes("User already registered")) {
      return new ConflictError(
        "An account with this email already exists.",
        "EMAIL_EXISTS",
        "Please sign in instead."
      );
    }

    // ── Validation ─────────────────────────────────────────────────────────

    if (code === "email_address_invalid" || (status === 422 && message.toLowerCase().includes("email"))) {
      return new ValidationError(
        "Please enter a valid email address.",
        "EMAIL_ADDRESS_INVALID",
        "Check the email format and try again."
      );
    }

    if (code === "weak_password" || message.toLowerCase().includes("weak_password") || message.toLowerCase().includes("password")) {
      if (status === 422 || (status === 400 && message.toLowerCase().includes("password"))) {
        return new ValidationError(
          `Password must be at least ${AuthConfig.validation.passwordMinLength} characters.`,
          "WEAK_PASSWORD",
          "Choose a stronger password."
        );
      }
    }

    // ── Invalid Credentials (Login) ────────────────────────────────────────

    if (status === 400 && message.includes("Invalid login credentials")) {
      return new AuthenticationError(
        "Incorrect email or password.",
        "INVALID_CREDENTIALS",
        "Check your email and password and try again."
      );
    }

    // ── Unconfirmed Email ──────────────────────────────────────────────────

    if (status === 400 && message.includes("Email not confirmed")) {
      return new AuthenticationError(
        "Please confirm your email address.",
        "EMAIL_NOT_CONFIRMED",
        "Check your inbox for a confirmation link."
      );
    }

    // ── Database Errors ────────────────────────────────────────────────────

    if (code === "42P01") {
      // Postgres Undefined Table
      return new UnexpectedError(
        "A system component is currently unavailable.",
        "TABLE_MISSING",
        "This feature is under maintenance. Try again later."
      );
    }

    if (code === "23505") {
      // Postgres Unique Violation
      return new ConflictError(
        "This record already exists.",
        "UNIQUE_VIOLATION",
        "Try using a different value."
      );
    }

    // ── Fallback ───────────────────────────────────────────────────────────

    return new UnexpectedError(
      "An unexpected authentication error occurred.",
      "UNKNOWN_AUTH_ERROR",
      "Please contact support if the issue persists.",
      error
    );
  }
}
