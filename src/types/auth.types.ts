import type { Session, User } from "@supabase/supabase-js";


export type AuthState = 
  | "INITIALIZING"
  | "AUTHENTICATING"
  | "LOADING_PROFILE"
  | "READY"
  | "UNAUTHENTICATED"
  | "WAITING_EMAIL_CONFIRMATION"
  | "LOGOUT"
  | "SESSION_EXPIRED"
  | "ERROR";

export type AuthLoadingState = 
  | "IDLE"
  | "LOGIN_LOADING"
  | "SIGNUP_LOADING"
  | "LOGOUT_LOADING"
  | "PASSWORD_RESET_LOADING";

import type { AuthUser } from "@/domain/auth/models/Profile";
export type { AuthUser };

// Re-exporting Domain Models for legacy compat if needed, but best practice is to import directly
export type { Profile, MentorProfile, StudentProfile } from "@/domain/auth/models/Profile";


export type AuthContextState = {
  status: AuthState;
  loadingState: AuthLoadingState;
  session: Session | null;
  user: User | null;
  authUser: AuthUser | null;
  error: Error | null;
};
