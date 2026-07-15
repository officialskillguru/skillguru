
import type { SupabaseClient, Session } from "@supabase/supabase-js";
import { logger } from "@/config/logger";
import { type Result, ok, fail, AuthenticationError, UnexpectedError } from "@/utils/result";

export class SessionService {
  constructor(private readonly client: SupabaseClient) {}

  async restoreSession(): Promise<Result<Session | null>> {
    try {
      const { data, error } = await this.client.auth.getSession();
      if (error) return fail(new AuthenticationError(error.message, error.name, undefined, error));
      
      if (data.session) {
        // Validate expiration
        const expiresAt = data.session.expires_at ? data.session.expires_at * 1000 : 0;
        if (Date.now() > expiresAt) {
          logger.warn("Session expired during restore");
          return ok(null);
        }
      }
      return ok(data.session);
    } catch (err: unknown) {
      logger.error("Failed to restore session", err);
      return fail(new UnexpectedError("Failed to restore session", "An unexpected error occurred during restore session", undefined, err));
    }
  }

  async refreshSession(): Promise<Result<Session>> {
    try {
      const { data, error } = await this.client.auth.refreshSession();
      if (error) return fail(new AuthenticationError(error.message, error.name, undefined, error));
      if (!data.session) return fail(new AuthenticationError("No session returned after refresh", "SESSION_REFRESH_EMPTY"));
      return ok(data.session);
    } catch (err: unknown) {
      logger.error("Failed to refresh session", err);
      return fail(new UnexpectedError("Failed to refresh session", "An unexpected error occurred during refresh session", undefined, err));
    }
  }

  async logoutEverywhere(): Promise<Result<void>> {
    try {
      const { error } = await this.client.auth.signOut({ scope: "global" });
      if (error) return fail(new AuthenticationError(error.message, error.name, undefined, error));
      return ok(undefined);
    } catch (err: unknown) {
      logger.error("Failed to logout globally", err);
      return fail(new UnexpectedError("Failed to logout globally", "An unexpected error occurred during logout globally", undefined, err));
    }
  }
}

