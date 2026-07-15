import { BaseRepository, type PaginationOptions, type PaginatedResponse } from "./base.repository";
import { supabase } from "@/lib/supabase/client";
import { type Result, ok, fail, DatabaseError, UnexpectedError } from "@/utils/result";
import type { Database } from "@/types/database.types";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export interface StudentFilters {
  search?: string;
  status?: string;
  dateRange?: { start: string; end: string };
}

export class AdminRepository extends BaseRepository<"profiles"> {
  constructor() {
    super(supabase, "profiles");
  }

  async getStudents(filters: StudentFilters, options: PaginationOptions): Promise<Result<PaginatedResponse<ProfileRow>>> {
    return ok({ data: [], count: 0, page: 1, limit: 10, totalPages: 0 });
  }

  async updateStudentStatus(studentId: string, status: string): Promise<Result<void>> {
    return fail(new UnexpectedError("Feature stubbed", "stubbed"));
  }

  async search(query: string, options: PaginationOptions): Promise<Result<PaginatedResponse<ProfileRow>>> {
    return this.getStudents({ search: query }, options);
  }
}

export const adminRepository = new AdminRepository();
