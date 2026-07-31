import type { Result, AppError } from "@/utils/result";
import type { Session, User } from "@supabase/supabase-js";
import type { LoginFormData, SignupFormData } from "@/schemas/auth.schema";

export interface IAuthRepository {
  signIn(credentials: LoginFormData): Promise<Result<{ user: User; session: Session }, AppError>>;
  signUp(credentials: SignupFormData): Promise<Result<{ user: User; session: Session | null }, AppError>>;
  signOut(): Promise<Result<void, AppError>>;
  resetPassword(email: string): Promise<Result<void, AppError>>;
  resendVerificationEmail(email: string): Promise<Result<void, AppError>>;
  getSession(): Promise<Result<Session | null, AppError>>;
  getUser(): Promise<Result<User | null, AppError>>;
}
