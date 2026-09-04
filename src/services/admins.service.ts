import type { Inserts, Tables, Updates } from "@/types/database";
import { getSupabaseClientOrThrow, type PaginatedResult } from "./_shared";

export type AdminAccount = Tables<"profiles">;

export type AdminListParams = unknown;

/** Lists real profiles holding the `admin` role — scoped via roles/user_roles, same pattern as students.service.ts/mentors.service.ts. */
export async function listAdmins(_params: AdminListParams = {}): Promise<PaginatedResult<AdminAccount>> {
  const supabase = getSupabaseClientOrThrow();

  const { data: adminRole } = await supabase.from("roles").select("id").eq("code", "admin").maybeSingle();
  if (!adminRole) return { data: [], count: 0, page: 1, pageSize: 100, totalPages: 0 };

  const { data: adminUserRoles } = await supabase.from("user_roles").select("user_id").eq("role_id", adminRole.id).is("revoked_at", null);
  const adminIds = (adminUserRoles ?? []).map((ur) => ur.user_id);
  if (adminIds.length === 0) return { data: [], count: 0, page: 1, pageSize: 100, totalPages: 0 };

  const { data, error, count } = await supabase.from("profiles").select("*", { count: "exact" }).in("id", adminIds);
  if (error) throw error;

  const admins = data ?? [];
  return { data: admins, count: count ?? admins.length, page: 1, pageSize: Math.max(admins.length, 1), totalPages: 1 };
}

export function upsertAdmin(_input: Inserts<"profiles">): Promise<never> {
  return Promise.reject(new Error("Admin upsert disabled during schema sync"));
}

export type CreateAdminInput = {
  fullName: string;
  email: string;
  password: string;
  role: string;
};

export function createAdminUser(_input: CreateAdminInput): Promise<never> {
  return Promise.reject(new Error("createAdminUser not fully implemented on existing db"));
}

export function updateAdmin(_id: string, _input: Updates<"profiles">): Promise<never> {
  return Promise.reject(new Error("Admin update disabled during schema sync"));
}

export function assignAdminRole(_id: string, _role: string): Promise<never> {
  return Promise.reject(new Error("Admin role assignment disabled during schema sync"));
}

export function disableAdmin(_id: string): Promise<never> {
  return Promise.reject(new Error("Disable admin not supported on current schema"));
}

export function deleteAdmin(_id: string): Promise<never> {
  return Promise.reject(new Error("Delete admin disabled during schema sync"));
}
