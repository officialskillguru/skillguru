import { type Result } from "@/utils/result";
import { certificatesRepository } from "@/repositories/certificates.repository";
import type { Database } from "@/types/database.types";
import type { PaginationOptions, PaginatedResponse } from "@/repositories/base.repository";
import { type AppError } from "@/utils/result";

type CertificateRow = Database["public"]["Tables"]["certificates"]["Row"];

export class CertificateService {
  async getStudentCertificates(studentId: string, options: PaginationOptions): Promise<Result<PaginatedResponse<CertificateRow & { courses: Database["public"]["Tables"]["courses"]["Row"] | null }>, AppError>> {
    return certificatesRepository.getStudentCertificates(studentId, options);
  }

  async verifyCertificate(hash: string): Promise<Result<CertificateRow, AppError>> {
    return certificatesRepository.getByHash(hash);
  }

  async searchCertificates(query: string, options: PaginationOptions): Promise<Result<PaginatedResponse<CertificateRow>, AppError>> {
    return certificatesRepository.search(query, options);
  }
}

export const certificateService = new CertificateService();
