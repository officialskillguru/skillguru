import type { IAuthRepository } from "@/repositories/interfaces/IAuthRepository";
import type { LoginFormData, SignupFormData } from "@/schemas/auth.schema";
import { type Result, ok, fail, AuthenticationError, UnexpectedError } from "@/utils/result";
import { supabase } from "@/lib/supabase/client";
import { AuthRepository } from "@/repositories/auth.repository";
import { AuditService } from "./AuditService";
import { AuthErrorMapper } from "@/utils/AuthErrorMapper";

export class AuthService {
  constructor(
    private readonly authRepository: IAuthRepository = new AuthRepository(supabase)
  ) {}

  async login(credentials: LoginFormData): Promise<Result<void>> {
    const result = await this.authRepository.signIn(credentials);
    
    if (!result.success) {
      void AuditService.log({
        table_name: "auth",
        record_id: "00000000-0000-0000-0000-000000000000",
        action: "login_failed",
        new_data: { email: credentials.email, reason: result.error.message }
      });
      return fail(AuthErrorMapper.map(result.error.originalError || result.error));
    }
    
    void AuditService.log({
      table_name: "auth",
      record_id: result.data.user.id,
      user_id: result.data.user.id,
      action: "login"
    });
    return ok(undefined);
  }

  async signup(credentials: SignupFormData): Promise<Result<void>> {
    // We intentionally don't send `role` to supabase.auth.signUp metadata 
    // because the trigger (handle_new_user) auto-assigns the student role.
    const result = await this.authRepository.signUp(credentials);
    
    if (!result.success) {
      void AuditService.log({
        table_name: "auth",
        record_id: "00000000-0000-0000-0000-000000000000",
        action: "signup_failed",
        new_data: { email: credentials.email, reason: result.error.message }
      });
      return fail(AuthErrorMapper.map(result.error.originalError || result.error));
    }

    void AuditService.log({
      table_name: "auth",
      record_id: result.data.user.id,
      user_id: result.data.user.id,
      action: "signup"
    });
    return ok(undefined);
  }

  async logout(): Promise<Result<void>> {
    const result = await this.authRepository.signOut();
    if (!result.success) {
      return fail(AuthErrorMapper.map(result.error.originalError || result.error));
    }
    void AuditService.log({
      table_name: "auth",
      record_id: "00000000-0000-0000-0000-000000000000",
      action: "logout"
    });
    return ok(undefined);
  }

  async resetPassword(email: string): Promise<Result<void>> {
    const result = await this.authRepository.resetPassword(email);
    if (!result.success) {
      void AuditService.log({
        table_name: "auth",
        record_id: "00000000-0000-0000-0000-000000000000",
        action: "password_reset_request_failed",
        new_data: { email, reason: result.error.message }
      });
      return fail(AuthErrorMapper.map(result.error.originalError || result.error));
    }
    void AuditService.log({
      table_name: "auth",
      record_id: "00000000-0000-0000-0000-000000000000",
      action: "password_reset_request",
      new_data: { email }
    });
    return ok(undefined);
  }
}

export const authService = new AuthService();
