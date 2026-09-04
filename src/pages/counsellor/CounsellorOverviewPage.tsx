import { useQuery } from "@tanstack/react-query";
import { BookOpen, Briefcase, UserCog, Users } from "lucide-react";

import { usePageMeta } from "@/hooks/usePageMeta";
import { getSupabaseClientOrThrow } from "@/services/_shared";
import { Skeleton } from "@/components/ui/skeleton";

async function fetchCounts() {
  const supabase = getSupabaseClientOrThrow();
  const { data: userResp } = await supabase.auth.getUser();
  const callerId = userResp.user?.id;

  // profiles' own RLS policy scopes SELECT to rows where
  // user_has_role(id, 'student') OR id = caller (the "view your own profile"
  // clause) for a caller holding students.read - so a direct count needs to
  // exclude the caller's own row to avoid an off-by-one, but is otherwise
  // the real, correctly-scoped student count. A user_roles-based count used
  // to be here and was a real bug: user_roles' own RLS only lets a caller
  // read their OWN row (or an admin read any row), so a real counsellor's
  // count only ever reflected whether their own (often-revoked) student-
  // role row existed - not the actual student population - confirmed live
  // (0 via user_roles vs 9 real student profiles visible to the same
  // counsellor session).
  let studentsQuery = supabase.from("profiles").select("id", { count: "exact", head: true });
  if (callerId) studentsQuery = studentsQuery.neq("id", callerId);

  const [students, mentors, courses, openJobs] = await Promise.all([
    studentsQuery,
    supabase.from("mentor_profiles").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("courses").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("job_postings").select("id", { count: "exact", head: true }).eq("status", "open").is("deleted_at", null),
  ]);

  return {
    students: students.count ?? 0,
    mentors: mentors.count ?? 0,
    courses: courses.count ?? 0,
    openJobs: openJobs.count ?? 0,
  };
}

export default function CounsellorOverviewPage() {
  usePageMeta("Counsellor Dashboard");
  const { data, isLoading } = useQuery({ queryKey: ["counsellor-overview-counts"], queryFn: fetchCounts });

  const cards = [
    { label: "Students", value: data?.students, icon: Users },
    { label: "Mentors", value: data?.mentors, icon: UserCog },
    { label: "Courses", value: data?.courses, icon: BookOpen },
    { label: "Open Job Postings", value: data?.openJobs, icon: Briefcase },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Operational overview across students, mentors, courses, and opportunities.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{c.label}</p>
                <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
              </div>
              {isLoading ? (
                <Skeleton className="mt-2 h-8 w-16" />
              ) : (
                <p className="mt-1 text-3xl font-black text-foreground">{c.value}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
