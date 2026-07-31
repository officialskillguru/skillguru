import { useEffect, useReducer, type ReactNode, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { logger } from "@/config/logger";
import { authService } from "@/services/auth.service";
import { identityService } from "@/services/IdentityService";
import type { LoginFormData, SignupFormData } from "@/schemas/auth.schema";
import { type Result, ok, UnexpectedError } from "@/utils/result";

import { AuthContext, type AuthAction, type ExtendedAuthContextState } from "./AuthContextObj";

const initialState: ExtendedAuthContextState = {
  status: "INITIALIZING",
  loadingState: "IDLE",
  session: null,
  user: null,
  authUser: null,
  error: null,
};

function authReducerBase(state: ExtendedAuthContextState, action: AuthAction): ExtendedAuthContextState {
  switch (action.type) {
    case "START_AUTH":
      return { ...state, status: "AUTHENTICATING", error: null };
    case "AUTH_SUCCESS":
      return {
        ...state,
        status: "LOADING_PROFILE",
        session: action.payload.session,
        user: action.payload.user,
        error: null,
      };
    case "AUTH_FAIL":
      return { ...state, status: "UNAUTHENTICATED", session: null, user: null, authUser: null };
    case "WAITING_EMAIL_CONFIRMATION":
      return { ...state, status: "WAITING_EMAIL_CONFIRMATION", error: null };
    case "IDENTITY_LOADED":
      return {
        ...state,
        status: "READY",
        authUser: action.payload.authUser,
      };
    case "SESSION_EXPIRED":
      return { ...initialState, status: "SESSION_EXPIRED" };
    case "LOGOUT":
      return { ...initialState, status: "UNAUTHENTICATED" };
    case "ERROR":
      return { ...state, status: "ERROR", error: action.payload };
    default:
      return state;
  }
}

function authReducer(state: ExtendedAuthContextState, action: AuthAction): ExtendedAuthContextState {
  const nextState = authReducerBase(state, action);
  logger.debug(`[Auth] Transition: ${state.status} → ${nextState.status}`, { action: action.type });
  return nextState;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const processSession = useCallback((session: Session | null) => {
    if (!session) {
      dispatch({ type: "AUTH_FAIL" });
      return;
    }
    dispatch({ type: "AUTH_SUCCESS", payload: { session, user: session.user } });
  }, []);

  // Listen to Supabase Auth events
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logger.debug(`[Auth] Supabase event: ${event}`);
      if (event === "SIGNED_OUT") {
        dispatch({ type: "LOGOUT" });
        return;
      }
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        void processSession(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [processSession]);

  // Load Identity when Session exists
  useEffect(() => {
    async function fetchIdentity() {
      if (state.status === "LOADING_PROFILE" && state.user) {
        try {
          const result = await identityService.loadCurrentUser();
          if (!result.success) {
            dispatch({ type: "ERROR", payload: result.error });
            return;
          }
          dispatch({ type: "IDENTITY_LOADED", payload: { authUser: result.data } });
        } catch (err: unknown) {
          logger.error("Failed to fetch identity", err);
          dispatch({ type: "ERROR", payload: new UnexpectedError("Failed to fetch identity", "fetchIdentity_exception", "Try again", err) });
        }
      }
    }

    void fetchIdentity();
  }, [state.status, state.user]);

  // ── Public Context Methods ──────────────────────────────────────────────
  // Context delegates to AuthService. Context never navigates.

  const login = useCallback(async (credentials: LoginFormData): Promise<Result<void>> => {
    dispatch({ type: "START_AUTH" });
    const result = await authService.login(credentials);
    if (!result.success) {
      dispatch({ type: "AUTH_FAIL" });
      return result;
    }
    // Supabase onAuthStateChange will fire SIGNED_IN and drive the state machine
    return ok(undefined);
  }, []);

  const signupStudent = useCallback(async (credentials: SignupFormData): Promise<Result<void>> => {
    dispatch({ type: "START_AUTH" });
    const result = await authService.signup(credentials);
    if (!result.success) {
      dispatch({ type: "AUTH_FAIL" });
      return result;
    }
    // Dispatch WAITING_EMAIL_CONFIRMATION — UI decides whether to navigate.
    // If Supabase has email confirmation disabled, onAuthStateChange will fire
    // SIGNED_IN and override this state. That's correct and expected.
    dispatch({ type: "WAITING_EMAIL_CONFIRMATION", payload: { email: credentials.email } });
    return ok(undefined);
  }, []);

  const logout = useCallback(async (): Promise<Result<void>> => {
    dispatch({ type: "LOGOUT" });
    return await authService.logout();
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<Result<void>> => {
    return await authService.resetPassword(email);
  }, []);

  const resendVerification = useCallback(async (email: string): Promise<Result<void>> => {
    return await authService.resendVerificationEmail(email);
  }, []);

  return (
    <AuthContext.Provider value={{ state, dispatch, login, signupStudent, logout, resetPassword, resendVerification }}>
      {children}
    </AuthContext.Provider>
  );
}
