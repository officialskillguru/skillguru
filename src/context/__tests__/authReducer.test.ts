import type { Session, User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { authReducerBase, initialAuthState } from "../authReducer";
import type { ExtendedAuthContextState } from "../AuthContextObj";

const user = (id: string) => ({ id }) as User;
const session = (id: string, token: string) => ({ access_token: token, user: user(id) }) as Session;

const ready: ExtendedAuthContextState = {
  ...initialAuthState,
  status: "READY",
  session: session("u1", "old-token"),
  user: user("u1"),
  authUser: { profile: { id: "u1" } } as ExtendedAuthContextState["authUser"],
};

describe("authReducerBase AUTH_SUCCESS", () => {
  it("keeps a READY session mounted when the same user's token refreshes", () => {
    const next = authReducerBase(ready, { type: "AUTH_SUCCESS", payload: { session: session("u1", "new-token"), user: user("u1") } });
    expect(next.status).toBe("READY");
    expect(next.authUser).toBe(ready.authUser);
    expect(next.session?.access_token).toBe("new-token");
  });

  it("reloads the identity when a different user signs in", () => {
    const next = authReducerBase(ready, { type: "AUTH_SUCCESS", payload: { session: session("u2", "t"), user: user("u2") } });
    expect(next.status).toBe("LOADING_PROFILE");
    expect(next.user?.id).toBe("u2");
  });

  it("loads the identity on first sign-in", () => {
    const next = authReducerBase(initialAuthState, { type: "AUTH_SUCCESS", payload: { session: session("u1", "t"), user: user("u1") } });
    expect(next.status).toBe("LOADING_PROFILE");
  });
});
