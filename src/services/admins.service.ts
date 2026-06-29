// Remove this directive after running `supabase gen types` to sync database schema.
import type { AccountStatus, AppRole, Inserts, Tables, Updates } from "@/types/database";

import {
  assertServiceResponse,
  getSupabaseClientOrThrow,
  normalizeSearchTerm,
  paginationRange,
  type ListParams,
  type PaginatedResult,
} from "./_shared";

export type AdminAccount = Tables<"admin_accounts">;

export type AdminListParams = ListParams & {
  role?: AppRole | "all";
  status?: AccountStatus | "all";
};

export async function listAdmins(params: AdminListParams = {}): Promise<PaginatedResult<AdminAccount>> {
  const supabase = getSupabaseClientOrThrow();
  const { page, pageSize, from, to } = paginationRange(params);
  const search = normalizeSearchTerm(params.search);

  let query = supabase.from("admin_accounts").select("*", { count: "exact" });

  if (search) {
    query = query.or(`name.ilike.${search},email.ilike.${search}`);
  }

  if (params.role && params.role !== "all") {
    query = query.eq("role", params.role);
  }

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data, error, count } = await query
    .order(params.sortBy ?? "created_at", { ascending: params.sortDirection === "asc" })
    .range(from, to);
  assertServiceResponse(error);

  return { data: data ?? [], count: count ?? 0, page, pageSize };
}

export async function upsertAdmin(input: Inserts<"admin_accounts">) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("admin_accounts").upsert(input).select("*").single();
  assertServiceResponse(error);
  return data;
}

export type CreateAdminInput = {
  fullName: string;
  email: string;
  password: string;
  role: AppRole;
};

export async function createAdminUser(input: CreateAdminInput) {
  const supabase = getSupabaseClientOrThrow();
  const response = await supabase.functions.invoke<AdminAccount>("admin-users", {
    body: input,
  });
  const { data, error } = response as { data: AdminAccount | null; error: unknown };
  assertServiceResponse(error);

  if (!data) {
    throw new Error("Admin account was not returned.");
  }

  return data;
}

export async function updateAdmin(id: string, input: Updates<"admin_accounts">) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("admin_accounts").update(input).eq("id", id).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function assignAdminRole(id: string, role: AppRole) {
  return updateAdmin(id, { role });
}

export async function disableAdmin(id: string) {
  return updateAdmin(id, { status: "disabled" });
}

export async function deleteAdmin(id: string) {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("admin_accounts").delete().eq("id", id);
  assertServiceResponse(error);
}
