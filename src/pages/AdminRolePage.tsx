import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Shield, Users, Lock, Clock, ArrowRight } from "lucide-react";
import { GsapReveal } from "@/components/motion/gsap-reveal";
import { listAdmins } from "@/services/admins.service";
import { listAuditLogs, type AuditLogEntry } from "@/services/auditLogs.service";
import { getExtendedSupabaseClient } from "@/services/_shared";

interface RolePermissionRow {
  roleId: string;
  roleName: string;
  permissions: { slug: string; name: string; module: string }[];
}

async function fetchRolePermissions(): Promise<RolePermissionRow[]> {
  const supabase = getExtendedSupabaseClient();

  const { data: roles, error: rolesError } = await supabase.from("roles").select("id, name");
  if (rolesError) throw rolesError;

  const { data: rolePermissions, error: rpError } = await supabase
    .from("role_permissions")
    .select("role_id, permission_id")
    .eq("is_active", true);
  if (rpError) throw rpError;

  const { data: permissions, error: permsError } = await supabase
    .from("permissions")
    .select("id, slug, name, module")
    .eq("is_active", true);
  if (permsError) throw permsError;

  const permissionMap = new Map((permissions ?? []).map((p) => [p.id, p]));

  return (roles ?? []).map((role) => {
    const permissionIds = (rolePermissions ?? [])
      .filter((rp) => rp.role_id === role.id)
      .map((rp) => rp.permission_id);
    const rolePerms = permissionIds
      .map((id) => permissionMap.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    return { roleId: role.id, roleName: role.name, permissions: rolePerms };
  });
}

export default function AdminRolePage() {
  const [activeSettingsTab, setActiveSettingsTab] = useState<"roles" | "operators" | "audit">("roles");

  const { data: rolePermissions, isLoading: loadingRoles } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: fetchRolePermissions,
  });

  const { data: adminsData, isLoading: loadingAdmins } = useQuery({
    queryKey: ["admin-operators"],
    queryFn: () => listAdmins(),
  });
  const operators = adminsData?.data ?? [];

  const { data: recentAuditLogs, isLoading: loadingAudit } = useQuery({
    queryKey: ["role-page-audit-logs"],
    queryFn: () => listAuditLogs({ pageSize: 10 }),
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <GsapReveal direction="up" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary dark:text-cyan-200">
            System Security & Operators Registry
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Review real role-to-permission mappings, admin operator accounts, and recent system audit activity.
          </p>
        </div>
      </GsapReveal>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { id: "roles", label: "Permissions Matrix", icon: Shield },
          { id: "operators", label: "Operations Users", count: operators.length, icon: Users },
          { id: "audit", label: "System Audit Logs", count: recentAuditLogs?.data.length, icon: Lock },
        ].map((tb) => {
          const TabIcon = tb.icon;
          return (
            <button
              key={tb.id}
              onClick={() => setActiveSettingsTab(tb.id as typeof activeSettingsTab)}
              className={[
                "py-3.5 px-5 text-xs font-black border-b-2 transition-all flex items-center gap-2",
                activeSettingsTab === tb.id
                  ? "border-primary text-primary dark:border-cyan-400 dark:text-cyan-300"
                  : "border-transparent text-muted-foreground hover:text-primary",
              ].join(" ")}
            >
              <TabIcon className="size-4" aria-hidden="true" />
              <span>{tb.label}</span>
              {tb.count !== undefined && (
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[9px]">{tb.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Permissions Matrix Tab */}
      {activeSettingsTab === "roles" && (
        <GsapReveal direction="up" className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
          <p className="border-b border-border px-6 py-3 text-[11px] font-bold text-muted-foreground">
            Read-only view of the real <code>role_permissions</code> table — this reflects what's actually enforced, not an editable proposal. Editing role permissions is not yet built.
          </p>
          {loadingRoles ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}
            </div>
          ) : !rolePermissions || rolePermissions.length === 0 ? (
            <p className="p-12 text-center text-sm font-semibold text-muted-foreground">No roles found.</p>
          ) : (
            <div className="divide-y divide-border">
              {rolePermissions.map((role) => (
                <div key={role.roleId} className="px-6 py-4">
                  <p className="text-sm font-black text-foreground capitalize">{role.roleName}</p>
                  {role.permissions.length === 0 ? (
                    <p className="mt-1.5 text-xs font-semibold text-muted-foreground">No permissions assigned.</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {role.permissions.map((p) => (
                        <span
                          key={p.slug}
                          title={p.slug}
                          className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground"
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </GsapReveal>
      )}

      {/* Operators Tab */}
      {activeSettingsTab === "operators" && (
        <GsapReveal direction="up" className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4">Full Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingAdmins ? (
                  <tr><td colSpan={3} className="py-12 text-center text-sm font-semibold text-muted-foreground">Loading operators...</td></tr>
                ) : operators.length === 0 ? (
                  <tr><td colSpan={3} className="py-12 text-center text-sm font-semibold text-muted-foreground">No admin accounts found.</td></tr>
                ) : (
                  operators.map((op) => (
                    <tr key={op.id} className="text-xs hover:bg-muted/30">
                      <td className="px-6 py-4.5 font-black text-foreground">{op.full_name}</td>
                      <td className="px-6 py-4.5 text-muted-foreground font-semibold">{op.email}</td>
                      <td className="px-6 py-4.5 text-muted-foreground">{new Date(op.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GsapReveal>
      )}

      {/* Audit Logs Tab */}
      {activeSettingsTab === "audit" && (
        <GsapReveal direction="up" className="space-y-4">
          <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Actor</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Entity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {loadingAudit ? (
                    <tr><td colSpan={4} className="py-12 text-center text-sm font-semibold text-muted-foreground">Loading recent activity...</td></tr>
                  ) : !recentAuditLogs || recentAuditLogs.data.length === 0 ? (
                    <tr><td colSpan={4} className="py-12 text-center text-sm font-semibold text-muted-foreground">No audit logs found.</td></tr>
                  ) : (
                    recentAuditLogs.data.map((log: AuditLogEntry) => (
                      <tr key={log.id} className="hover:bg-muted/30">
                        <td className="px-6 py-4.5 font-bold text-muted-foreground flex items-center gap-2">
                          <Clock className="size-3.5" aria-hidden="true" />
                          <span>{new Date(log.created_at).toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4.5 font-black text-foreground">{log.actor?.full_name ?? "System"}</td>
                        <td className="px-6 py-4.5 font-semibold text-muted-foreground">{log.action}</td>
                        <td className="px-6 py-4.5 text-muted-foreground capitalize">{log.entity_type}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <Link
            to="/admin/audit-logs"
            className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card py-4 text-xs font-black text-primary hover:bg-muted"
          >
            View Full Audit Log <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </GsapReveal>
      )}
    </div>
  );
}
