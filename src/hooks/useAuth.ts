import { useContext } from "react";
import { AuthContext } from "@/context/AuthContextObj";

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthContext must be used within an AuthProvider");
  return context;
}

export function useAuth() {
  const { state, login, signupStudent, logout, resetPassword } = useAuthContext();

  return {
    // State
    status: state.status,
    session: state.session,
    user: state.user,
    authUser: state.authUser,
    error: state.error,

    // Derived flags for convenience (but state machine is primary)
    isInitializing: state.status === "INITIALIZING",
    isAuthenticating: state.status === "AUTHENTICATING",
    isReady: state.status === "READY",
    
    // Auth Methods
    login,
    signupStudent,
    logout,
    resetPassword
  };
}
