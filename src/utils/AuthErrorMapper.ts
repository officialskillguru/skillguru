import { AuthenticationError, UnexpectedError, AppError } from "@/utils/result";

export class AuthErrorMapper {
  static map(error: unknown): AppError {
    const err = (error || {}) as Record<string, unknown>;
    const status = err.status || err.statusCode;
    const code = err.code;
    const message = (err.message as string) || "An unknown error occurred.";

    // Network errors
    if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
      return new UnexpectedError(
        "Network connection failed.",
        "NetworkError",
        "Please check your internet connection and try again."
      );
    }

    // Rate Limiting (429)
    if (status === 429) {
      return new AuthenticationError(
        "Too many requests. Please wait a moment.",
        "RATE_LIMIT_EXCEEDED",
        "Try again in a few minutes."
      );
    }

    // Invalid Credentials (400)
    if (status === 400 && message.includes("Invalid login credentials")) {
      return new AuthenticationError(
        "Incorrect email or password.",
        "INVALID_CREDENTIALS",
        "Check your email and password and try again."
      );
    }

    // Email already in use
    if (status === 400 && message.includes("User already registered")) {
      return new AuthenticationError(
        "An account with this email already exists.",
        "EMAIL_EXISTS",
        "Please log in instead."
      );
    }

    // Unconfirmed email
    if (status === 400 && message.includes("Email not confirmed")) {
      return new AuthenticationError(
        "Please confirm your email address.",
        "EMAIL_NOT_CONFIRMED",
        "Check your inbox for a confirmation link."
      );
    }

    // Missing profile or table errors
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
      return new AppError(
        "This record already exists.",
        "CONFLICT_ERROR",
        "UNIQUE_VIOLATION",
        "Try using a different value."
      );
    }

    return new UnexpectedError(
      "An unexpected authentication error occurred.",
      "UNKNOWN_AUTH_ERROR",
      "Please contact support if the issue persists.",
      error
    );
  }
}
