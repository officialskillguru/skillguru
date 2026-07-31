import { getSupabaseClientOrThrow, normalizeSearchTerm, type ListParams } from "./_shared";

export interface AuditLogEntry {
  id: string;
  created_at: string;
  action: string;
  entity_type: string;
  details: unknown;
  actor: { full_name: string; email: string } | null;
}

export type AuditLogListParams = ListParams & {
  entityType?: string;
  entityId?: string;
};

export async function listAuditLogs(params: AuditLogListParams = {}): Promise<{ data: AuditLogEntry[]; count: number }> {
  const { page = 1, pageSize = 30, search, entityType, entityId } = params;
  const supabase = getSupabaseClientOrThrow();
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("audit_logs")
    .select("*, actor:profiles!audit_logs_actor_id_fkey(full_name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (entityType && entityType !== "all") query = query.eq("entity_type", entityType);
  if (entityId) query = query.eq("entity_id", entityId);
  const normalizedSearch = normalizeSearchTerm(search);
  if (normalizedSearch) query = query.or(`action.ilike.${normalizedSearch},entity_type.ilike.${normalizedSearch}`);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []) as unknown as AuditLogEntry[], count: count ?? 0 };
}
