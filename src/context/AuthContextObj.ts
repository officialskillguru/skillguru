import { createContext } from "react";
import type { AuthContextState, AuthUser } from "@/types/auth.types";
import type { Session, User } from "@supabase/supabase-js";
import type { LoginFormData, SignupFormData } from "@/schemas/auth.schema";
import type { Result } from "@/utils/result";
import type { AppError } from "@/utils/result";

export type ExtendedAuthContextState = AuthContextState;

export type AuthAction = 
  | { type: "START_AUTH" }
  | { type: "AUTH_SUCCESS"; payload: { session: Session; user: User } }
  | { type: "AUTH_FAIL" }
  | { type: "IDENTITY_LOADED"; payload: { authUser: AuthUser } }
  | { type: "WAITING_EMAIL_CONFIRMATION"; payload: { email: string } }
  | { type: "SESSION_EXPIRED" }
  | { type: "LOGOUT" }
  | { type: "ERROR"; payload: AppError };

export const AuthContext = createContext<{ 
  state: ExtendedAuthContextState; 
  dispatch: React.Dispatch<AuthAction>;
  login: (credentials: LoginFormData) => Promise<Result<void>>;
  signupStudent: (credentials: SignupFormData) => Promise<Result<void>>;
  logout: () => Promise<Result<void>>;
  resetPassword: (email: string) => Promise<Result<void>>;
  resendVerification: (email: string) => Promise<Result<void>>;
} | null>(null);
