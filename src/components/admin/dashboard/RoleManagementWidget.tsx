import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/common/DataTable";
import { getExtendedSupabaseClient } from "@/services/_shared";

interface RoleSummary {
  id: string;
  role: string;
  description: string | null;
  users: number;
}

async function fetchRoleSummary(): Promise<RoleSummary[]> {
  const supabase = getExtendedSupabaseClient();
  const [{ data: roles, error: rolesError }, { data: userRoles, error: userRolesError }] = await Promise.all([
    supabase.from("roles").select("id, name, description"),
    supabase.from("user_roles").select("role_id"),
  ]);
  if (rolesError) throw rolesError;
  if (userRolesError) throw userRolesError;

  const countByRoleId = new Map<string, number>();
  (userRoles ?? []).forEach((ur) => countByRoleId.set(ur.role_id, (countByRoleId.get(ur.role_id) ?? 0) + 1));

  return (roles ?? []).map((r) => ({
    id: r.id,
    role: r.name,
    description: r.description,
    users: countByRoleId.get(r.id) ?? 0,
  }));
}

export function RoleManagementWidget() {
  const { data: roles = [], isLoading } = useQuery({ queryKey: ["dashboard", "role-summary"], queryFn: fetchRoleSummary });

  const columns = useMemo<ColumnDef<RoleSummary>[]>(
    () => [
      { accessorKey: "role", header: "Role", cell: ({ row }) => <span className="font-semibold text-slate-900 text-sm">{row.original.role}</span> },
      { accessorKey: "description", header: "Description", cell: ({ row }) => <span className="text-slate-500 text-sm">{row.original.description ?? "—"}</span> },
      { accessorKey: "users", header: "Total Users", cell: ({ row }) => <span className="text-slate-900 text-sm">{row.original.users.toLocaleString()}</span> },
    ],
    []
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">Role Management Overview</h2>
        <Link to="/admin/users/roles" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
          View all roles
        </Link>
      </div>
      <div className="p-0 flex-1">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="[&>div]:border-0 [&_th]:bg-white [&_th]:text-slate-500 [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wider [&_th]:font-bold [&_td]:py-4 [&_tr:last-child_td]:border-b-0">
            <DataTable columns={columns} data={roles} hidePagination={true} hideToolbar={true} />
          </div>
        )}
      </div>
    </div>
  );
}
