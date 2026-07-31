import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";
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
    if (typeof error === "object" && error !== null && "message" in error) {
      throw new Error(String((error as Record<string, unknown>).message));
    }
    const message =
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as Record<string, unknown>).message === "string"
        ? (error as Record<string, string>).message
        : "Unknown error";
    throw error instanceof Error ? error : new Error(message);
  }
}

export function normalizeSearchTerm(search?: string) {
  const term = search?.trim();
  if (!term) return null;
  // Whitespace is replaced with the ilike wildcard rather than left as a literal space:
  // supabase-js encodes query param values via URLSearchParams, which turns " " into "+",
  // and PostgREST does not decode "+" back to a space - a literal space here would silently
  // never match anything for any multi-word search term.
  const escaped = term.replaceAll("%", "\\%").replaceAll("_", "\\_").replaceAll(/\s+/g, "%");
  return `%${escaped}%`;
}

/**
 * @deprecated database.types.ts now covers the full live schema. Use
 * getSupabaseClientOrThrow() instead. Kept as an alias only until all call
 * sites are migrated off the untyped client.
 */
export const getExtendedSupabaseClient = getSupabaseClientOrThrow;
