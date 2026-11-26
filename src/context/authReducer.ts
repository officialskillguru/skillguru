import type { AuthAction, ExtendedAuthContextState } from "./AuthContextObj";

export const initialAuthState: ExtendedAuthContextState = {
  status: "INITIALIZING",
  loadingState: "IDLE",
  session: null,
  user: null,
  authUser: null,
  error: null,
};

export function authReducerBase(state: ExtendedAuthContextState, action: AuthAction): ExtendedAuthContextState {
  switch (action.type) {
    case "START_AUTH":
      return { ...state, status: "AUTHENTICATING", error: null };
    case "AUTH_SUCCESS":
      // A token refresh, or a sign-in event relayed from another tab, for the
      // user who is already loaded only refreshes the session. Dropping back to
      // LOADING_PROFILE would make every protected route show a loader and
      // unmount the page, wiping in-progress state (checkout, class room, editors).
      if (state.status === "READY" && state.authUser && state.user?.id === action.payload.user.id) {
        return { ...state, session: action.payload.session, user: action.payload.user, error: null };
      }
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
      return { ...initialAuthState, status: "SESSION_EXPIRED" };
    case "LOGOUT":
      return { ...initialAuthState, status: "UNAUTHENTICATED" };
    case "ERROR":
      return { ...state, status: "ERROR", error: action.payload };
    default:
      return state;
  }
}
