import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";

export type SupabaseBrowserClient = SupabaseClient<Database>;

export type ListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
};

export type PaginatedResult<TRecord> = {
  data: TRecord[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function getSupabaseClientOrThrow() {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  return supabase;
}

export function paginationRange(params: Pick<ListParams, "page" | "pageSize">) {
  const page = Math.max(params.page ?? 1, 1);
  const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return { page, pageSize, from, to };
}

export function assertServiceResponse(error: unknown): asserts error is null {
  if (error) {
    if (typeof error === 'object' && error !== null && 'message' in error) {
      throw new Error(String((error as Record<string, unknown>).message));
    }
    const message = typeof error === 'object' && error !== null && 'message' in error && typeof (error as Record<string, unknown>).message === 'string' 
      ? (error as Record<string, string>).message 
      : "Unknown error";
    throw error instanceof Error ? error : new Error(message);
  }
}

export function normalizeSearchTerm(search?: string) {
  const term = search?.trim();
  return term ? `%${term.replaceAll("%", "\\%").replaceAll("_", "\\_")}%` : null;
}
