import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";

export type AppSupabaseClient = SupabaseClient<Database>;

export function getSupabaseClient() {
  return createSupabaseBrowserClient();
}

export function requireSupabaseClient() {
  const client = createSupabaseBrowserClient();

  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  return client;
}

export async function getCurrentSession() {
  const client = requireSupabaseClient();
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

export async function getCurrentUser() {
  const client = requireSupabaseClient();
  const { data, error } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user;
}

export function getPublicStorageUrl(bucket: string, path: string) {
  const client = requireSupabaseClient();
  return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export * from "@/lib/supabase/auth";
export * from "@/lib/supabase/browser";
