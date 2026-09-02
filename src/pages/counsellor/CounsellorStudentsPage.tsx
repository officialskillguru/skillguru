import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";

import { usePageMeta } from "@/hooks/usePageMeta";
import { getSupabaseClientOrThrow } from "@/services/_shared";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

interface StudentRow {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  created_at: string;
}

function initials(name: string | null | undefined) {
  const source = name?.trim();
  if (!source) return "?";
  const parts = source.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

async function fetchStudents(search: string): Promise<StudentRow[]> {
  const supabase = getSupabaseClientOrThrow();

  const { data: studentRole } = await supabase.from("roles").select("id").eq("code", "student").maybeSingle();
  if (!studentRole) return [];

  const { data: memberships } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role_id", studentRole.id)
    .is("revoked_at", null)
    .limit(200);

  const ids = (memberships ?? []).map((m) => m.user_id);
  if (ids.length === 0) return [];

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, phone, created_at")
    .in("id", ids)
    .order("created_at", { ascending: false })
    .limit(100);

  if (search.trim()) {
    query = query.or(`full_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export default function CounsellorStudentsPage() {
  usePageMeta("Students");
  const [search, setSearch] = useState("");
  const { data: students, isLoading } = useQuery({
    queryKey: ["counsellor-students", search],
    queryFn: () => fetchStudents(search),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Students</h1>
        <p className="text-sm text-muted-foreground">Search and review student accounts you're authorized to manage.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <label htmlFor="student-search" className="sr-only">Search students</label>
        <Input
          id="student-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : !students || students.length === 0 ? (
        <EmptyState
          icon={<Users className="size-8" aria-hidden="true" />}
          title="No students found"
          description={search ? "No students match your search." : "No student accounts are visible yet."}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3">Name</th>
                <th scope="col" className="px-4 py-3">Email</th>
                <th scope="col" className="px-4 py-3">Phone</th>
                <th scope="col" className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs">{initials(s.full_name)}</AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-foreground">{s.full_name ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
