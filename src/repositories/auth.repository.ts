import type { SupabaseClient, Session, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { type Result, ok, fail, type AppError } from "@/utils/result";
import { AuthErrorMapper } from "@/utils/AuthErrorMapper";
import type { IAuthRepository } from "./interfaces/IAuthRepository";
import type { LoginFormData, SignupFormData } from "@/schemas/auth.schema";

export class AuthRepository implements IAuthRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  /**
   * Maps a raw Supabase error through AuthErrorMapper.
   * Preserves the original error object so the mapper can inspect
   * status codes, error codes, and messages.
   */
  private mapError(error: unknown): AppError {
    return AuthErrorMapper.map(error);
  }

  async signIn({ email, password }: LoginFormData): Promise<Result<{ user: User; session: Session }>> {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({ email, password });
      if (error) return fail(this.mapError(error));
      if (!data.user || !data.session) {
        return fail(this.mapError({ message: "Session could not be established.", status: 500 }));
      }

      // Best-effort — a login_history logging failure must never fail the login itself.
      void (async () => {
        try {
          await this.client.rpc("log_login_event", { p_user_agent: navigator.userAgent });
        } catch {
          // intentionally swallowed
        }
      })();

      return ok({ user: data.user, session: data.session });
    } catch (err: unknown) {
      return fail(this.mapError(err));
    }
  }

  async signUp({ email, password, fullName, role }: SignupFormData): Promise<Result<{ user: User; session: Session | null }>> {
    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
          },
        },
      });
      
      if (error) {
        return fail(this.mapError(error));
      }
      if (!data.user) {
        return fail(this.mapError({ message: "User creation failed.", status: 500 }));
      }
      return ok({ user: data.user, session: data.session });
    } catch (err: unknown) {
      return fail(this.mapError(err));
    }
  }

  async signOut(): Promise<Result<void>> {
    try {
      const { error } = await this.client.auth.signOut();
      if (error) return fail(this.mapError(error));
      return ok(undefined);
    } catch (err: unknown) {
      return fail(this.mapError(err));
    }
  }

  async resetPassword(email: string): Promise<Result<void>> {
    try {
      const { error } = await this.client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) return fail(this.mapError(error));
      return ok(undefined);
    } catch (err: unknown) {
      return fail(this.mapError(err));
    }
  }

  async resendVerificationEmail(email: string): Promise<Result<void>> {
    try {
      const { error } = await this.client.auth.resend({
        type: "signup",
        email,
      });
      if (error) return fail(this.mapError(error));
      return ok(undefined);
    } catch (err: unknown) {
      return fail(this.mapError(err));
    }
  }

  async getSession(): Promise<Result<Session | null>> {
    try {
      const { data, error } = await this.client.auth.getSession();
      if (error) return fail(this.mapError(error));
      return ok(data.session);
    } catch (err: unknown) {
      return fail(this.mapError(err));
    }
  }

  async getUser(): Promise<Result<User | null>> {
    try {
      const { data, error } = await this.client.auth.getUser();
      if (error) return fail(this.mapError(error));
      return ok(data.user);
    } catch (err: unknown) {
      return fail(this.mapError(err));
    }
  }
}
