import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { AuthRepository } from "@/repositories/auth.repository";

function makeClient() {
  const auth = {
    signUp: vi.fn().mockResolvedValue({ data: { user: { id: "u1" }, session: null }, error: null }),
    resend: vi.fn().mockResolvedValue({ data: {}, error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
  };
  return { auth, client: { auth } as unknown as SupabaseClient<Database> };
}

describe("AuthRepository email redirects", () => {
  const origin = window.location.origin;

  it("signUp sends confirmation links to /auth/callback on the current origin", async () => {
    const { auth, client } = makeClient();
    await new AuthRepository(client).signUp({
      email: "a@b.co",
      password: "Password123!",
      fullName: "A B",
      role: "student",
    } as never);
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "a@b.co",
      password: "Password123!",
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        // Existing metadata (role, name) is still passed unchanged.
        data: { full_name: "A B", role: "student" },
      },
    });
  });

  it("resend verification uses the same callback URL", async () => {
    const { auth, client } = makeClient();
    await new AuthRepository(client).resendVerificationEmail("a@b.co");
    expect(auth.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "a@b.co",
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
  });

  it("password recovery links land on /reset-password", async () => {
    const { auth, client } = makeClient();
    await new AuthRepository(client).resetPassword("a@b.co");
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("a@b.co", { redirectTo: `${origin}/reset-password` });
  });
});
