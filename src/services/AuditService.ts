export class AuditService {
  static async log(metadata?: unknown): Promise<void> {
    // Audit logs are feature flagged or removed in current schema
  }
}
export const auditService = new AuditService();
