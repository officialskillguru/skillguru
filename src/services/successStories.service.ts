
import {
  assertServiceResponse,
  getSupabaseClientOrThrow,
  normalizeSearchTerm,
  paginationRange,
  type ListParams,
  type PaginatedResult,
} from "./_shared";

export type SuccessStory = {
  id: number;
  title: string;
  job_role: string | null;
  company_name: string | null;
  image_url: string | null;
  full_story: string | null;
  package: string | null;
  published: boolean;
  featured: boolean;
  created_at: string;
};

import type { Database } from "@/types/database.types";
type UnsafeTableName = keyof Database["public"]["Tables"];

export type SuccessStoryListParams = ListParams & {
  published?: boolean | "all";
  featured?: boolean;
};

export async function listSuccessStories(params: SuccessStoryListParams = {}): Promise<PaginatedResult<SuccessStory>> {
  return { data: [], count: 0, page: 1, pageSize: 10, totalPages: 0 };
}

export async function createSuccessStory(input: Partial<SuccessStory>) {
  throw new Error("success_stories table removed");
}

export async function updateSuccessStory(id: number, input: Partial<SuccessStory>) {
  throw new Error("success_stories table removed");
}

export async function deleteSuccessStory(id: number) {
  throw new Error("success_stories table removed");
}

export async function setSuccessStoryStatus(id: number, published: boolean) {
  throw new Error("success_stories table removed");
}

