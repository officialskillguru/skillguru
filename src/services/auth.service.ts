// Remove this directive after running `supabase gen types` to sync database schema.
import type { AppRole, Inserts, Tables, Updates } from "@/types/database";

import { assertServiceResponse, getSupabaseClientOrThrow } from "./_shared";

export type UserProfile = Tables<"users">;

export type SignInInput = {
  email: string;
  password: string;
  remember?: boolean;
};

export async function signInAdmin({ email, password }: SignInInput) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  assertServiceResponse(error);

  if (data.user) {
    await supabase.from("activity_logs").insert({
      user_id: data.user.id,
      action: "login",
      metadata: { email },
    });
  }

  return data;
}

export async function signOutCurrentUser() {
  const supabase = getSupabaseClientOrThrow();
  const session = await supabase.auth.getSession();
  const userId = session.data.session?.user.id ?? null;

  if (userId) {
    await supabase.from("activity_logs").insert({ user_id: userId, action: "logout" });
  }

  const { error } = await supabase.auth.signOut();
  assertServiceResponse(error);
}

export async function sendPasswordReset(email: string, redirectTo?: string) {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
  assertServiceResponse(error);
}

export async function updatePassword(password: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.auth.updateUser({ password });
  assertServiceResponse(error);

  if (data.user) {
    await supabase.from("activity_logs").insert({ user_id: data.user.id, action: "password_change" });
  }

  return data;
}

export async function getCurrentUserProfile() {
  const supabase = getSupabaseClientOrThrow();
  const user = await supabase.auth.getUser();
  assertServiceResponse(user.error);

  if (!user.data.user) {
    return null;
  }

  const { data, error } = await supabase.from("users").select("*").eq("id", user.data.user.id).maybeSingle();
  assertServiceResponse(error);
  return data;
}

export async function updateCurrentUserProfile(input: Updates<"users">) {
  const supabase = getSupabaseClientOrThrow();
  const user = await supabase.auth.getUser();
  assertServiceResponse(user.error);

  if (!user.data.user) {
    throw new Error("No authenticated user found.");
  }

  const payload: Inserts<"users"> = {
    id: user.data.user.id,
    email: user.data.user.email ?? undefined,
    ...input,
  };
  const { data, error } = await supabase.from("users").upsert(payload).select("*").single();
  assertServiceResponse(error);

  await supabase.from("activity_logs").insert({
    user_id: user.data.user.id,
    action: "profile_update",
  });

  return data;
}

export async function getCurrentUserRoles(): Promise<AppRole[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.rpc("current_user_roles");
  assertServiceResponse(error);

  return (data ?? []).filter((role): role is AppRole =>
    [
      "admin",
      "counsellor",
      "sales",
      "content_manager",
      "super_admin",
      "editor",
      "mentor_manager",
      "course_manager",
      "crm_manager",
    ].includes(role),
  );
}
