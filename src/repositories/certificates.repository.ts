import { BaseRepository, type PaginationOptions, type PaginatedResponse } from "./base.repository";
import { supabase } from "@/lib/supabase/client";
import { type Result, ok, fail, DatabaseError, UnexpectedError } from "@/utils/result";
import type { Database } from "@/types/database.types";

type CertificateRow = Database["public"]["Tables"]["certificates"]["Row"];

export class CertificatesRepository extends BaseRepository<"certificates"> {
  constructor() {
    super(supabase, "certificates");
  }

  async search(query: string, options: PaginationOptions): Promise<Result<PaginatedResponse<CertificateRow>>> {
    try {
      const { page, limit } = options;
      const offset = (page - 1) * limit;

      const { data, error, count } = await this.client
        .from(this.tableName)
        .select("*", { count: "exact" })
        .ilike("certificate_number", `%${query}%`)
        .range(offset, offset + limit - 1);

      if (error) return fail(new DatabaseError("Failed to search certificates", String(error), undefined, error));
      
      const totalCount = count || 0;
      return ok({
        data: data || [],
        count: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      });
    } catch (err: unknown) {
      return fail(new UnexpectedError("Unexpected error", String(err), undefined, err));
    }
  }

  async getStudentCertificates(studentId: string, options: PaginationOptions): Promise<Result<PaginatedResponse<CertificateRow & { courses: Database["public"]["Tables"]["courses"]["Row"] | null }>>> {
    return fail(new UnexpectedError("Feature stubbed", "drift"));
  }

  async getByHash(hash: string): Promise<Result<CertificateRow>> {
    try {
      const { data, error } = await this.client
        .from("certificates")
        .select("*")
        .eq("verification_code", hash)
        .single();
      
      if (error) return fail(new DatabaseError("Failed to get by hash", String(error), undefined, error));
      return ok(data);
    } catch (err: unknown) {
      return fail(new UnexpectedError("Unexpected error", String(err), undefined, err));
    }
  }
}

export const certificatesRepository = new CertificatesRepository();
