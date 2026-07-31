import { BaseRepository, type PaginationOptions, type PaginatedResponse } from "./base.repository";
import { supabase } from "@/lib/supabase/client";
import { type Result, ok, fail, DatabaseError, UnexpectedError } from "@/utils/result";
import type { Database } from "@/types/database.types";

type CertificateRow = Database["public"]["Tables"]["certificates"]["Row"];

export type CertificateWithDetails = CertificateRow & {
  template: Database["public"]["Tables"]["certificate_templates"]["Row"] | null;
  course: Database["public"]["Tables"]["courses"]["Row"] | null;
  student: { id: string; full_name: string | null } | null;
};

// Shape returned by the public verify_certificate_by_code RPC — deliberately
// narrower than CertificateWithDetails since anonymous verification only
// needs to prove authenticity, not expose the full certificate row.
export type PublicCertificateVerification = {
  certificate_number: string;
  issued_at: string;
  course: { title: string } | null;
  student: { full_name: string | null } | null;
};

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
    try {
      const { page, limit } = options;
      const offset = (page - 1) * limit;

      const { data, error, count } = await this.client
        .from("certificates")
        .select("*, enrollment:enrollments!inner(student_id, courses(*))", { count: "exact" })
        .eq("enrollment.student_id", studentId)
        .order("issued_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) return fail(new DatabaseError("Failed to load certificates", String(error), undefined, error));

      const totalCount = count ?? 0;
      const mapped = (data ?? []).map((row) => {
        const { enrollment, ...cert } = row as CertificateRow & {
          enrollment: { courses: Database["public"]["Tables"]["courses"]["Row"] | null } | null;
        };
        return { ...cert, courses: enrollment?.courses ?? null };
      });

      return ok({ data: mapped, count: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) });
    } catch (err: unknown) {
      return fail(new UnexpectedError("Unexpected error", String(err), undefined, err));
    }
  }

  private async getWithDetailsBy(column: "id" | "verification_code", value: string): Promise<Result<CertificateWithDetails>> {
    try {
      const { data, error } = await this.client
        .from("certificates")
        .select("*, template:certificate_templates(*), enrollment:enrollments(courses(*), student:profiles!enr_student_fk(id, full_name))")
        .eq(column, value)
        .maybeSingle();

      if (error) return fail(new DatabaseError("Failed to load certificate", String(error), undefined, error));
      if (!data) return fail(new DatabaseError("Certificate not found", "not_found"));

      const { enrollment, template, ...cert } = data as CertificateRow & {
        template: Database["public"]["Tables"]["certificate_templates"]["Row"] | null;
        enrollment: {
          courses: Database["public"]["Tables"]["courses"]["Row"] | null;
          student: { id: string; full_name: string | null } | null;
        } | null;
      };

      return ok({
        ...cert,
        template,
        course: enrollment?.courses ?? null,
        student: enrollment?.student ?? null,
      });
    } catch (err: unknown) {
      return fail(new UnexpectedError("Unexpected error", String(err), undefined, err));
    }
  }

  async getByHash(hash: string): Promise<Result<PublicCertificateVerification>> {
    try {
      const { data, error } = await this.client.rpc("verify_certificate_by_code", { p_code: hash });

      if (error) return fail(new DatabaseError("Failed to verify certificate", String(error), undefined, error));

      const match = data?.[0];
      if (!match) return fail(new DatabaseError("Certificate not found", "not_found"));

      return ok({
        certificate_number: match.certificate_number,
        issued_at: match.issued_at,
        course: match.course_title ? { title: match.course_title } : null,
        student: { full_name: match.student_name ?? null },
      });
    } catch (err: unknown) {
      return fail(new UnexpectedError("Unexpected error", String(err), undefined, err));
    }
  }

  async getCertificateWithDetails(id: string): Promise<Result<CertificateWithDetails>> {
    return this.getWithDetailsBy("id", id);
  }
}

export const certificatesRepository = new CertificatesRepository();
