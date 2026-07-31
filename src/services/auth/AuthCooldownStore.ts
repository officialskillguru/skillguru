import type { AuthOperation } from "@/config/auth.constants";
import { AuthConfig } from "@/config/auth.constants";

const STORAGE_KEY_PREFIX = "skillguru:auth:cooldown:";

/**
 * Persists per-operation cooldown timestamps in sessionStorage.
 *
 * Survives page refresh within the same tab. Each tab maintains its own
 * cooldown state (sessionStorage is tab-scoped). Cross-tab coordination
 * is explicitly out of scope — if needed in the future, migrate to
 * localStorage + BroadcastChannel.
 */
export class AuthCooldownStore {
  private getKey(operation: AuthOperation): string {
    return `${STORAGE_KEY_PREFIX}${operation}`;
  }

  /**
   * Sets a cooldown for the given operation.
   * Defaults to the configured cooldown for the operation, or 60s.
   */
  setCooldown(operation: AuthOperation, ms?: number): void {
    const duration = ms ?? this.getDefaultCooldown(operation);
    const until = Date.now() + duration;
    try {
      sessionStorage.setItem(this.getKey(operation), String(until));
    } catch {
      // sessionStorage may be unavailable (private browsing, quota).
      // Silently degrade — cooldown will only last in-memory for this page load.
    }
  }

  /** Returns remaining cooldown in ms. 0 if expired or not set. */
  getRemainingMs(operation: AuthOperation): number {
    const raw = this.readTimestamp(operation);
    if (raw === null) return 0;
    return Math.max(0, raw - Date.now());
  }

  /** Returns true if the operation is currently in cooldown. */
  isCoolingDown(operation: AuthOperation): boolean {
    return this.getRemainingMs(operation) > 0;
  }

  /** Clears cooldown for the given operation. */
  clear(operation: AuthOperation): void {
    try {
      sessionStorage.removeItem(this.getKey(operation));
    } catch {
      // Ignore — same rationale as setCooldown.
    }
  }

  private readTimestamp(operation: AuthOperation): number | null {
    try {
      const raw = sessionStorage.getItem(this.getKey(operation));
      if (raw === null) return null;
      const ts = Number(raw);
      return Number.isFinite(ts) ? ts : null;
    } catch {
      return null;
    }
  }

  private getDefaultCooldown(operation: AuthOperation): number {
    switch (operation) {
      case "signup":
        return AuthConfig.cooldown.signup;
      case "resend":
        return AuthConfig.cooldown.resend;
      default:
        return 60_000;
    }
  }
}
