import { logger } from "@/config/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthTelemetryEvent =
  | "signup_started"
  | "signup_success"
  | "signup_failed"
  | "signup_rate_limited"
  | "login_started"
  | "login_success"
  | "login_failed"
  | "resend_started"
  | "resend_success"
  | "resend_failed"
  | "duplicate_submit_blocked"
  | "cooldown_blocked";

export interface AuthTelemetryPayload {
  event: AuthTelemetryEvent;
  requestId: string;
  durationMs?: number;
  /** Opaque user identifier — never a raw email */
  userIdentifier?: string;
  errorCode?: string;
  metadata?: Record<string, unknown>;
}

// ─── Hashing ──────────────────────────────────────────────────────────────────

/**
 * Hashes an email to a non-reversible identifier for telemetry.
 * Uses a simple djb2 hash — fast and sufficient for log correlation.
 * NOT cryptographic. Never used for security decisions.
 */
export function hashEmailForTelemetry(email: string): string {
  let hash = 5381;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) + hash + email.charCodeAt(i)) | 0;
  }
  return `usr_${(hash >>> 0).toString(36)}`;
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

/**
 * Unified telemetry for auth operations.
 *
 * Combines structured console logging with analytics event dispatch.
 * AuthService prepares the userIdentifier (hashed) — this class never
 * touches raw emails or passwords.
 */
export class AuthTelemetry {
  /**
   * Logs a structured auth event and dispatches an analytics event.
   */
  log(payload: AuthTelemetryPayload): void {
    const { event, requestId, durationMs, userIdentifier, errorCode, metadata } = payload;

    // Structured console log
    const logData: Record<string, unknown> = {
      requestId,
      ...(durationMs !== undefined && { durationMs: Math.round(durationMs) }),
      ...(userIdentifier && { userIdentifier }),
      ...(errorCode && { errorCode }),
      ...(metadata && { metadata }),
    };

    const prefix = `[Auth] ${event}`;

    if (event.includes("failed") || event.includes("rate_limited")) {
      logger.warn(prefix, logData);
    } else if (event.includes("blocked")) {
      logger.info(prefix, logData);
    } else {
      logger.debug(prefix, logData);
    }

    // Dispatch analytics event via existing custom event mechanism
    this.dispatchAnalytics(event, logData);
  }

  /** Convenience: starts a timer and returns a function that returns elapsed ms */
  startTimer(): () => number {
    const start = performance.now();
    return () => performance.now() - start;
  }

  private dispatchAnalytics(event: AuthTelemetryEvent, props: Record<string, unknown>): void {
    try {
      window.dispatchEvent(
        new CustomEvent("skill-guru:auth-event", {
          detail: { event, ...props, timestamp: new Date().toISOString() },
        })
      );
    } catch {
      // Analytics should never break auth flow
    }
  }
}

/** Singleton instance */
export const authTelemetry = new AuthTelemetry();
