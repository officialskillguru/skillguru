import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Award, X, Eye, ExternalLink, KeyRound, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { DataTable } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { useStudents, useStudentMutations } from "@/hooks/useAdminData";
import { getExtendedSupabaseClient } from "@/services/_shared";
import { certificateViewRoute } from "@/lib/routes";
import type { Student } from "@/services/students.service";

interface EnrollmentSummary {
  studentId: string;
  enrollmentCount: number;
  activeCount: number;
  completedCount: number;
  avgProgress: number;
  certificateCount: number;
  enrollments: {
    id: string;
    courseTitle: string;
    status: string;
    progress: number;
    certificateId: string | null;
  }[];
}

async function fetchEnrollmentSummaries(studentIds: string[]): Promise<Map<string, EnrollmentSummary>> {
  const supabase = getExtendedSupabaseClient();
  const summaries = new Map<string, EnrollmentSummary>();
  if (studentIds.length === 0) return summaries;

  const { data, error } = await supabase
    .from("enrollments")
    .select("id, student_id, status, courses(title), course_progress(completion_percentage), certificates(id)")
    .in("student_id", studentIds);
  if (error) throw error;

  for (const row of (data ?? []) as unknown as {
    id: string;
    student_id: string;
    status: string;
    courses: { title: string } | null;
    course_progress: { completion_percentage: number } | { completion_percentage: number }[] | null;
    certificates: { id: string } | { id: string }[] | null;
  }[]) {
    const progressRow = Array.isArray(row.course_progress) ? row.course_progress[0] : row.course_progress;
    const certRow = Array.isArray(row.certificates) ? row.certificates[0] : row.certificates;
    const existing = summaries.get(row.student_id) ?? {
      studentId: row.student_id,
      enrollmentCount: 0,
      activeCount: 0,
      completedCount: 0,
      avgProgress: 0,
      certificateCount: 0,
      enrollments: [],
    };
    existing.enrollmentCount += 1;
    if (row.status === "active") existing.activeCount += 1;
    if (row.status === "completed") existing.completedCount += 1;
    if (certRow) existing.certificateCount += 1;
    existing.enrollments.push({
      id: row.id,
      courseTitle: row.courses?.title ?? "Unknown course",
      status: row.status,
      progress: progressRow?.completion_percentage ?? 0,
      certificateId: certRow?.id ?? null,
    });
    summaries.set(row.student_id, existing);
  }

  for (const summary of summaries.values()) {
    const total = summary.enrollments.reduce((sum, e) => sum + e.progress, 0);
    summary.avgProgress = summary.enrollments.length > 0 ? Math.round(total / summary.enrollments.length) : 0;
  }

  return summaries;
}

const STATUS_BADGE: Record<string, "success" | "info" | "warning" | "muted"> = {
  active: "info",
  completed: "success",
  expired: "warning",
  cancelled: "muted",
};

function StudentDrawer({ student, summary, onClose }: Readonly<{ student: Student; summary: EnrollmentSummary | undefined; onClose: () => void }>) {
  const mutations = useStudentMutations();
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [newEmailInput, setNewEmailInput] = useState("");

  const handleSetPassword = () => {
    if (newPasswordInput.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    mutations.setPassword.mutate(
      { id: student.id, password: newPasswordInput },
      {
        onSuccess: () => {
          toast.success(`Password updated for ${student.full_name ?? "this student"}. Share it with them directly — it will not be shown again.`);
          setNewPasswordInput("");
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to set password."),
      }
    );
  };

  const handleForceReset = () => {
    mutations.forcePasswordChange.mutate(student.id, {
      onSuccess: () => toast.success(`${student.full_name ?? "This student"} will be required to set a new password at next login.`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to force a password reset."),
    });
  };

  const handleForceLogout = () => {
    if (!window.confirm(`Sign ${student.full_name ?? "this student"} out of every active session immediately?`)) return;
    mutations.forceLogout.mutate(student.id, {
      onSuccess: () => toast.success(`${student.full_name ?? "Student"} has been signed out everywhere.`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to force logout."),
    });
  };

  const handleChangeEmail = () => {
    const trimmed = newEmailInput.trim();
    if (!trimmed || !trimmed.includes("@")) {
      toast.error("Enter a valid email address.");
      return;
    }
    if (!window.confirm(`Change ${student.full_name ?? "this student"}'s login email to ${trimmed}? They'll use it to sign in immediately — no confirmation email is sent.`)) return;
    mutations.changeEmail.mutate(
      { id: student.id, newEmail: trimmed },
      {
        onSuccess: () => {
          toast.success(`Login email updated to ${trimmed}.`);
          setNewEmailInput("");
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to change email."),
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/40 backdrop-blur-xs">
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close" />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <h3 className="text-lg font-black text-foreground">{student.full_name ?? "Unnamed Student"}</h3>
            <p className="text-xs font-semibold text-muted-foreground">{student.email}</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-muted-foreground hover:bg-muted" aria-label="Close drawer">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border p-3 text-center">
              <p className="text-[10px] font-black uppercase text-muted-foreground">Enrollments</p>
              <p className="mt-1 text-xl font-black text-foreground">{summary?.enrollmentCount ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border p-3 text-center">
              <p className="text-[10px] font-black uppercase text-muted-foreground">Avg Progress</p>
              <p className="mt-1 text-xl font-black text-primary">{summary?.avgProgress ?? 0}%</p>
            </div>
            <div className="rounded-xl border border-border p-3 text-center">
              <p className="text-[10px] font-black uppercase text-muted-foreground">Certificates</p>
              <p className="mt-1 text-xl font-black text-emerald-600">{summary?.certificateCount ?? 0}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Security</h4>
            <div className="rounded-xl border border-border p-4">
              <h5 className="text-xs font-black uppercase tracking-wider text-foreground mb-1">Set New Password</h5>
              <p className="text-xs font-semibold text-muted-foreground mb-3">
                Sets the student's password directly. No approval, OTP, or reset email is sent.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="New password (min. 8 characters)"
                  aria-label="New password"
                  className="h-10 flex-1 rounded-lg border border-border bg-muted px-3 text-sm outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleSetPassword}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
                >
                  <KeyRound className="size-3.5" aria-hidden="true" /> Set Password
                </button>
              </div>
              <button
                type="button"
                onClick={handleForceReset}
                className="mt-3 flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-foreground hover:bg-accent/10"
              >
                <KeyRound className="size-3.5" aria-hidden="true" /> Force Password Change on Next Login
              </button>
            </div>

            <div className="rounded-xl border border-border p-4">
              <h5 className="text-xs font-black uppercase tracking-wider text-foreground mb-1">Change Login Email</h5>
              <p className="text-xs font-semibold text-muted-foreground mb-3">
                Updates the email used to sign in directly — confirmed immediately, no confirmation email sent.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newEmailInput}
                  onChange={(e) => setNewEmailInput(e.target.value)}
                  placeholder="new-email@example.com"
                  aria-label="New login email"
                  className="h-10 flex-1 rounded-lg border border-border bg-muted px-3 text-sm outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
                >
                  <KeyRound className="size-3.5" aria-hidden="true" /> Change Email
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4">
              <h5 className="text-xs font-black uppercase tracking-wider text-foreground mb-1">Sessions</h5>
              <p className="text-xs font-semibold text-muted-foreground mb-3">
                Immediately invalidate every active session for this student.
              </p>
              <button
                type="button"
                onClick={handleForceLogout}
                className="flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-800 hover:bg-amber-200"
              >
                <LogOut className="size-3.5" aria-hidden="true" /> Force Logout Everywhere
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Courses</h4>
            {!summary || summary.enrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No enrollments yet.</p>
            ) : (
              summary.enrollments.map((e) => (
                <div key={e.id} className="rounded-xl border border-border p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-foreground">{e.courseTitle}</p>
                    <Badge variant={STATUS_BADGE[e.status] ?? "muted"} className="capitalize">{e.status}</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${e.progress}%` }} />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">{e.progress}%</span>
                  </div>
                  {e.certificateId && (
                    <Link
                      to={certificateViewRoute(e.certificateId)}
                      className="mt-2 flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                    >
                      <Award className="size-3.5" /> View certificate <ExternalLink className="size-3" />
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-5 text-xs font-black text-muted-foreground hover:bg-muted">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminStudentsPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [page, setPage] = useState(1);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);

  const { data: studentsData, isLoading } = useStudents({ search: search || undefined, page, pageSize: 20 });
  const students = useMemo(() => studentsData?.data ?? [], [studentsData]);
  const studentIds = useMemo(() => students.map((s) => s.id), [students]);

  const { data: summaries } = useQuery({
    queryKey: ["admin-students-summary", studentIds],
    queryFn: () => fetchEnrollmentSummaries(studentIds),
    enabled: studentIds.length > 0,
  });

  const columns = useMemo<ColumnDef<Student>[]>(
    () => [
      {
        id: "name",
        accessorFn: (row) => row.full_name ?? "",
        header: "Student",
        cell: ({ row }) => {
          const s = row.original;
          const label = s.full_name ?? "Unnamed";
          return (
            <div className="flex items-center gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-xs font-black text-primary">
                {label.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold text-foreground">{label}</p>
                <p className="truncate text-[11px] font-semibold text-muted-foreground">{s.email}</p>
              </div>
            </div>
          );
        },
      },
      {
        id: "enrollments",
        header: "Enrollments",
        cell: ({ row }) => {
          const summary = summaries?.get(row.original.id);
          return <span className="font-bold text-foreground">{summary?.enrollmentCount ?? 0}</span>;
        },
      },
      {
        id: "progress",
        header: "Avg Progress",
        cell: ({ row }) => {
          const summary = summaries?.get(row.original.id);
          const pct = summary?.avgProgress ?? 0;
          return (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs font-bold text-muted-foreground">{pct}%</span>
            </div>
          );
        },
      },
      {
        id: "certificates",
        header: "Certificates",
        cell: ({ row }) => {
          const summary = summaries?.get(row.original.id);
          const count = summary?.certificateCount ?? 0;
          return count > 0 ? (
            <Badge variant="success" className="gap-1"><Award className="size-3" /> {count}</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          );
        },
      },
      {
        id: "joined",
        header: "Joined",
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-muted-foreground">
            {row.original.created_at ? new Date(row.original.created_at).toLocaleDateString() : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <button
            onClick={() => setActiveStudent(row.original)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Eye className="size-3.5" /> View
          </button>
        ),
      },
    ],
    [summaries]
  );

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Students</h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          Real enrollment, progress, and certificate data for every student on the platform.
        </p>
      </div>

      <input
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        placeholder="Search students by name, email, phone, or city..."
        className="h-10 w-full max-w-sm rounded-xl border border-border bg-card px-3.5 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
      />

      <DataTable columns={columns} data={students} exportFilename="students_export" isLoading={isLoading} />

      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground">
          Page {page} of {studentsData?.totalPages || 1} — {studentsData?.count ?? 0} total students
        </p>
        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50"
          >
            Prev
          </button>
          <button
            disabled={page >= (studentsData?.totalPages || 1)}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <AnimatePresence>
        {activeStudent && (
          <StudentDrawer student={activeStudent} summary={summaries?.get(activeStudent.id)} onClose={() => setActiveStudent(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
