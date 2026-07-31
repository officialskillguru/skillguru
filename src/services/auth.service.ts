import type { IAuthRepository } from "@/repositories/interfaces/IAuthRepository";
import { loginSchema, signupSchema, type LoginFormData, type SignupFormData } from "@/schemas/auth.schema";
import { type Result, ok, fail, RateLimitError, AuthenticationError, ValidationError } from "@/utils/result";
import { supabase } from "@/lib/supabase/client";
import { AuthRepository } from "@/repositories/auth.repository";
import { SingleFlight } from "./auth/SingleFlight";
import { AuthCooldownStore } from "./auth/AuthCooldownStore";
import { normalizeSignupInput, normalizeLoginInput, normalizeEmail } from "./auth/normalizeAuthInput";
import { authTelemetry, hashEmailForTelemetry } from "./auth/AuthTelemetry";

/**
 * AuthService orchestrates all authentication operations.
 *
 * Responsibilities:
 * - Input normalization (before validation/API call)
 * - Single-flight request locking (prevents duplicate submissions)
 * - Cooldown enforcement (prevents hitting Supabase rate limits)
 * - Telemetry (structured logging + analytics, never raw secrets)
 *
 * This service never:
 * - Imports React
 * - Shows toasts
 * - Navigates
 * - Manipulates UI state
 */
export class AuthService {
  private readonly singleFlight = new SingleFlight();
  private readonly cooldownStore = new AuthCooldownStore();

  constructor(
    private readonly authRepository: IAuthRepository = new AuthRepository(supabase)
  ) {}

  // ─── Signup ───────────────────────────────────────────────────────────────

  async signup(rawCredentials: SignupFormData): Promise<Result<void>> {
    const requestId = crypto.randomUUID();
    const elapsed = authTelemetry.startTimer();
    const userIdentifier = hashEmailForTelemetry(rawCredentials.email);

    authTelemetry.log({ event: "signup_started", requestId, userIdentifier });

    // 1. Normalize input
    const normalized = normalizeSignupInput(rawCredentials);

    // 2. Validate with Zod
    const validationResult = signupSchema.safeParse(normalized);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors[0]?.message || "Invalid input";
      authTelemetry.log({
        event: "signup_failed",
        requestId,
        durationMs: elapsed(),
        userIdentifier,
        errorCode: "VALIDATION_ERROR",
      });
      return fail(
        new ValidationError(errorMessage, "VALIDATION_ERROR", "Check your inputs and try again.")
      );
    }
    const validatedData = validationResult.data;

    // 3. Check cooldown — don't contact Supabase if cooling down
    if (this.cooldownStore.isCoolingDown("signup")) {
      const remainingMs = this.cooldownStore.getRemainingMs("signup");
      authTelemetry.log({
        event: "cooldown_blocked",
        requestId,
        userIdentifier,
        metadata: { remainingMs },
      });
      return fail(
        new RateLimitError(
          "Too many verification emails requested. Please wait before trying again.",
          "COOLDOWN_ACTIVE",
          remainingMs,
          "Wait for the cooldown period to expire."
        )
      );
    }

    // 3. Single-flight lock — prevent duplicate submissions
    if (!this.singleFlight.acquire("signup")) {
      authTelemetry.log({
        event: "duplicate_submit_blocked",
        requestId,
        userIdentifier,
      });
      return fail(
        new AuthenticationError(
          "A signup request is already in progress.",
          "DUPLICATE_SUBMIT",
          "Please wait for the current request to complete."
        )
      );
    }

    // 5. Execute signup
    try {
      const result = await this.authRepository.signUp(validatedData);

      if (!result.success) {
        // If rate limited, activate cooldown
        if (result.error instanceof RateLimitError) {
          this.cooldownStore.setCooldown("signup", result.error.retryAfterMs);
          authTelemetry.log({
            event: "signup_rate_limited",
            requestId,
            durationMs: elapsed(),
            userIdentifier,
            errorCode: result.error.code,
          });
        } else {
          authTelemetry.log({
            event: "signup_failed",
            requestId,
            durationMs: elapsed(),
            userIdentifier,
            errorCode: result.error.code,
          });
        }
        return result;
      }

      authTelemetry.log({
        event: "signup_success",
        requestId,
        durationMs: elapsed(),
        userIdentifier,
      });
      return ok(undefined);
    } finally {
      this.singleFlight.release("signup");
    }
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async login(rawCredentials: LoginFormData): Promise<Result<void>> {
    const requestId = crypto.randomUUID();
    const elapsed = authTelemetry.startTimer();
    const userIdentifier = hashEmailForTelemetry(rawCredentials.email);

    authTelemetry.log({ event: "login_started", requestId, userIdentifier });

    // 1. Normalize input
    const normalized = normalizeLoginInput(rawCredentials);

    // 2. Validate with Zod
    const validationResult = loginSchema.safeParse(normalized);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors[0]?.message || "Invalid input";
      authTelemetry.log({
        event: "login_failed",
        requestId,
        durationMs: elapsed(),
        userIdentifier,
        errorCode: "VALIDATION_ERROR",
      });
      return fail(
        new ValidationError(errorMessage, "VALIDATION_ERROR", "Check your inputs and try again.")
      );
    }
    const validatedData = validationResult.data;

    // 3. Single-flight lock
    if (!this.singleFlight.acquire("signin")) {
      authTelemetry.log({
        event: "duplicate_submit_blocked",
        requestId,
        userIdentifier,
      });
      return fail(
        new AuthenticationError(
          "A login request is already in progress.",
          "DUPLICATE_SUBMIT",
          "Please wait for the current request to complete."
        )
      );
    }

    // 4. Execute login
    try {
      const result = await this.authRepository.signIn(validatedData);

      if (!result.success) {
        authTelemetry.log({
          event: "login_failed",
          requestId,
          durationMs: elapsed(),
          userIdentifier,
          errorCode: result.error.code,
        });
        return result;
      }

      authTelemetry.log({
        event: "login_success",
        requestId,
        durationMs: elapsed(),
        userIdentifier,
      });
      return ok(undefined);
    } finally {
      this.singleFlight.release("signin");
    }
  }

  // ─── Resend Verification Email ────────────────────────────────────────────

  async resendVerificationEmail(rawEmail: string): Promise<Result<void>> {
    const requestId = crypto.randomUUID();
    const elapsed = authTelemetry.startTimer();
    const email = normalizeEmail(rawEmail);
    const userIdentifier = hashEmailForTelemetry(email);

    authTelemetry.log({ event: "resend_started", requestId, userIdentifier });

    // 1. Check cooldown
    if (this.cooldownStore.isCoolingDown("resend")) {
      const remainingMs = this.cooldownStore.getRemainingMs("resend");
      authTelemetry.log({
        event: "cooldown_blocked",
        requestId,
        userIdentifier,
        metadata: { remainingMs },
      });
      return fail(
        new RateLimitError(
          "Please wait before requesting another verification email.",
          "RESEND_COOLDOWN_ACTIVE",
          remainingMs,
          "Wait for the cooldown period to expire."
        )
      );
    }

    // 2. Single-flight lock
    if (!this.singleFlight.acquire("resend")) {
      authTelemetry.log({
        event: "duplicate_submit_blocked",
        requestId,
        userIdentifier,
      });
      return fail(
        new AuthenticationError(
          "A resend request is already in progress.",
          "DUPLICATE_SUBMIT",
          "Please wait for the current request to complete."
        )
      );
    }

    // 3. Execute resend
    try {
      const result = await this.authRepository.resendVerificationEmail(email);

      if (!result.success) {
        if (result.error instanceof RateLimitError) {
          this.cooldownStore.setCooldown("resend", result.error.retryAfterMs);
        }
        authTelemetry.log({
          event: "resend_failed",
          requestId,
          durationMs: elapsed(),
          userIdentifier,
          errorCode: result.error.code,
        });
        return result;
      }

      // Successful resend — start cooldown to prevent rapid-fire
      this.cooldownStore.setCooldown("resend");

      authTelemetry.log({
        event: "resend_success",
        requestId,
        durationMs: elapsed(),
        userIdentifier,
      });
      return ok(undefined);
    } finally {
      this.singleFlight.release("resend");
    }
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  async logout(): Promise<Result<void>> {
    return await this.authRepository.signOut();
  }

  // ─── Reset Password ───────────────────────────────────────────────────────

  async resetPassword(rawEmail: string): Promise<Result<void>> {
    const email = normalizeEmail(rawEmail);
    return await this.authRepository.resetPassword(email);
  }

  // ─── Cooldown State (read-only, for UI consumption via context) ──────────

  /** Returns remaining cooldown in ms for the given operation. */
  getCooldownRemainingMs(operation: "signup" | "resend"): number {
    return this.cooldownStore.getRemainingMs(operation);
  }

  /** Returns whether the given operation is currently cooling down. */
  isCoolingDown(operation: "signup" | "resend"): boolean {
    return this.cooldownStore.isCoolingDown(operation);
  }
}

export const authService = new AuthService();
