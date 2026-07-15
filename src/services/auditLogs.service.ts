export class AuditLogsService {
  async fetchAuditLogs(): Promise<unknown[]> {
    return [];
  }
}

export const auditLogsService = new AuditLogsService();

export type AuditLogListParams = unknown;
export const listAuditLogs = async (p?: unknown): Promise<unknown[]> => [];

