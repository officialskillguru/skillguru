import type { AuthOperation } from "@/config/auth.constants";

/**
 * Prevents concurrent execution of the same auth operation.
 *
 * Keyed by operation type so that e.g. a resend doesn't block login.
 * Not shared across browser tabs (this is intentional — sessionStorage
 * isolation means each tab manages its own in-flight state).
 */
export class SingleFlight {
  private readonly locks = new Map<AuthOperation, boolean>();

  /**
   * Attempts to acquire the lock for the given operation.
   * Returns `true` if acquired, `false` if already running.
   */
  acquire(key: AuthOperation): boolean {
    if (this.locks.get(key)) {
      return false;
    }
    this.locks.set(key, true);
    return true;
  }

  /** Releases the lock for the given operation. */
  release(key: AuthOperation): void {
    this.locks.delete(key);
  }

  /** Returns whether the given operation is currently in flight. */
  isRunning(key: AuthOperation): boolean {
    return this.locks.get(key) === true;
  }
}
