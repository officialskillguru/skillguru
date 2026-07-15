import type { Inserts, Tables, Updates } from "@/types/database";
import { type PaginatedResult } from "./_shared";

export type AdminAccount = Tables<"profiles">;

export type AdminListParams = unknown;

export async function listAdmins(params: AdminListParams = {}): Promise<PaginatedResult<AdminAccount>> {
  return { data: [], count: 0, page: 1, pageSize: 10, totalPages: 0 };
}

export async function upsertAdmin(input: Inserts<"profiles">) {
  throw new Error("Admin upsert disabled during schema sync");
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

export async function updateAdmin(id: string, input: Updates<"profiles">) {
  throw new Error("Admin update disabled during schema sync");
}

export async function assignAdminRole(id: string, role: string) {
  throw new Error("Admin role assignment disabled during schema sync");
}

export async function disableAdmin(id: string) {
  throw new Error("Disable admin not supported on current schema");
}

export async function deleteAdmin(id: string) {
  throw new Error("Delete admin disabled during schema sync");
}
