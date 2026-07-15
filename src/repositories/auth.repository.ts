import type { SupabaseClient, Session, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { type Result, ok, fail, AuthenticationError, type UnexpectedError } from "@/utils/result";
import type { IAuthRepository } from "./interfaces/IAuthRepository";
import type { LoginFormData, SignupFormData } from "@/schemas/auth.schema";

export class AuthRepository implements IAuthRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  private mapError(error: unknown, context: string): UnexpectedError | AuthenticationError {
    const err = error as Record<string, unknown>;
    const message = typeof err?.message === "string" ? err.message : "An unexpected authentication error occurred.";
    const code = typeof err?.code === "string" ? err.code : "AUTH_ERROR";
    
    return new AuthenticationError(
      message,
      `Supabase auth error during ${context}: ${code}`,
      "Please verify your credentials or try again later.",
      error
    );
  }

  async signIn({ email, password }: LoginFormData): Promise<Result<{ user: User; session: Session }>> {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({ email, password });
      if (error) return fail(this.mapError(error, "signIn"));
      if (!data.user || !data.session) {
        return fail(
          new AuthenticationError(
            "Session could not be established.",
            "Supabase returned success but missing user or session.",
            "Please try logging in again."
          )
        );
      }
      return ok({ user: data.user, session: data.session });
    } catch (err: unknown) {
      return fail(this.mapError(err, "signIn"));
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
        return fail(this.mapError(error, "signUp"));
      }
      if (!data.user) {
        return fail(
          new AuthenticationError(
            "User creation failed.",
            "Supabase signUp succeeded but returned no user object.",
            "Please try signing up again."
          )
        );
      }
      return ok({ user: data.user, session: data.session });
    } catch (err: unknown) {
      return fail(this.mapError(err, "signUp"));
    }
  }

  async signOut(): Promise<Result<void>> {
    try {
      const { error } = await this.client.auth.signOut();
      if (error) return fail(this.mapError(error, "signOut"));
      return ok(undefined);
    } catch (err: unknown) {
      return fail(this.mapError(err, "signOut"));
    }
  }

  async resetPassword(email: string): Promise<Result<void>> {
    try {
      const { error } = await this.client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) return fail(this.mapError(error, "resetPassword"));
      return ok(undefined);
    } catch (err: unknown) {
      return fail(this.mapError(err, "resetPassword"));
    }
  }

  async getSession(): Promise<Result<Session | null>> {
    try {
      const { data, error } = await this.client.auth.getSession();
      if (error) return fail(this.mapError(error, "getSession"));
      return ok(data.session);
    } catch (err: unknown) {
      return fail(this.mapError(err, "getSession"));
    }
  }

  async getUser(): Promise<Result<User | null>> {
    try {
      const { data, error } = await this.client.auth.getUser();
      if (error) return fail(this.mapError(error, "getUser"));
      return ok(data.user);
    } catch (err: unknown) {
      return fail(this.mapError(err, "getUser"));
    }
  }
}
