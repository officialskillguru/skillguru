import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { BookOpen, Eye, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { getExtendedSupabaseClient } from "@/services/_shared";
import { DataTable } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";

interface Assignment {
  id: string;
  course_id: string;
  lesson_id: string | null;
  title: string;
  description: string | null;
  instructions: string | null;
  due_date: string | null;
  max_score: number | null;
  passing_score: number | null;
  status: string;
  created_at: string;
  course?: { title: string } | null;
  submission_count?: number;
}

interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string | null;
  file_urls: string[] | null;
  score: number | null;
  feedback: string | null;
  status: string;
  submitted_at: string;
  graded_at: string | null;
  student?: { full_name: string; email: string } | null;
}

async function fetchAssignments(search: string, page: number) {
  const supabase = getExtendedSupabaseClient();
  const offset = (page - 1) * 20;
  let query = supabase
    .from("assignments")
    .select("*, course:courses(title)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + 19);
  if (search) query = query.ilike("title", `%${search}%`);
  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as Assignment[]) ?? [], count: count ?? 0 };
}

async function fetchSubmissions(assignmentId: string) {
  const supabase = getExtendedSupabaseClient();
  const { data, error } = await supabase
    .from("assignment_submissions")
    .select("*, student:profiles!assignment_submissions_student_id_fkey(full_name, email)")
    .eq("assignment_id", assignmentId)
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return (data as AssignmentSubmission[]) ?? [];
}

function SubmissionsPanel({ assignment, onClose }: { assignment: Assignment; onClose: () => void }) {
  const qc = useQueryClient();
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [scoreInput, setScoreInput] = useState("");
  const [feedbackInput, setFeedbackInput] = useState("");

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["assignment-submissions", assignment.id],
    queryFn: () => fetchSubmissions(assignment.id),
  });

  const grade = useMutation({
    mutationFn: async ({ id, score, feedback }: { id: string; score: number; feedback: string }) => {
      const supabase = getExtendedSupabaseClient();
      const { error } = await supabase
        .from("assignment_submissions")
        .update({ score, feedback, status: "graded", graded_at: new Date().toISOString() } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Submission graded");
      setGradingId(null);
      void qc.invalidateQueries({ queryKey: ["assignment-submissions", assignment.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-foreground/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 60 }}
        className="flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-base font-black text-foreground">{assignment.title}</h2>
            <p className="text-xs text-muted-foreground">{submissions.length} submissions · Max: {assignment.max_score} pts</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <BookOpen className="mb-4 size-10 text-muted-foreground" aria-hidden="true" />
              <p className="font-semibold text-foreground">No submissions yet</p>
            </div>
          ) : submissions.map((sub: AssignmentSubmission) => (
            <div key={sub.id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-foreground">{sub.student?.full_name ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{sub.student?.email}</p>
                </div>
                <Badge
                  variant={
                    sub.status === "graded" ? "success" :
                    sub.status === "submitted" ? "info" :
                    sub.status === "rejected" ? "destructive" :
                    "muted"
                  }
                  className="capitalize"
                >
                  {sub.status}
                </Badge>
              </div>
              {sub.content && (
                <p className="text-sm text-muted-foreground bg-muted rounded-lg p-3 mt-2 max-h-20 overflow-y-auto">{sub.content}</p>
              )}
              {sub.status === "graded" && sub.score !== null && (
                <p className="mt-2 text-sm font-semibold text-success">
                  Score: {sub.score} / {assignment.max_score}
                  {sub.feedback && <span className="ml-2 font-normal text-muted-foreground">— {sub.feedback}</span>}
                </p>
              )}
              {sub.status === "submitted" && (
                gradingId === sub.id ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Score"
                        value={scoreInput}
                        onChange={e => setScoreInput(e.target.value)}
                        min={0}
                        max={assignment.max_score ?? undefined}
                      />
                      <input
                        className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Feedback…"
                        value={feedbackInput}
                        onChange={e => setFeedbackInput(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => grade.mutate({ id: sub.id, score: Number(scoreInput), feedback: feedbackInput })}
                        disabled={grade.isPending || !scoreInput}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground disabled:opacity-50"
                      >
                        {grade.isPending ? "Grading…" : "Submit Grade"}
                      </button>
                      <button
                        onClick={() => setGradingId(null)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setGradingId(sub.id); setScoreInput(""); setFeedbackInput(""); }}
                    className="mt-2 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20"
                  >
                    Grade Submission
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminAssignmentsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Assignment | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-assignments", search, page],
    queryFn: () => fetchAssignments(search, page),
  });

  const assignments = data?.data ?? [];
  const count = data?.count ?? 0;

  const columns = useMemo<ColumnDef<Assignment>[]>(
    () => [
      {
        id: "title",
        accessorFn: (row) => row.title,
        header: "Title",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-foreground">{row.original.title}</p>
            {row.original.description && (
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{row.original.description}</p>
            )}
          </div>
        ),
      },
      {
        id: "course",
        header: "Course",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.course?.title ?? "—"}</span>,
      },
      {
        id: "due_date",
        header: "Due Date",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.due_date ? new Date(row.original.due_date).toLocaleDateString() : "No deadline"}
          </span>
        ),
      },
      {
        id: "max_score",
        header: "Max Score",
        cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.max_score ?? "—"} pts</span>,
      },
      {
        id: "status",
        header: "Type",
        cell: ({ row }) => <Badge variant="info" className="capitalize">{row.original.status}</Badge>,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <button
            onClick={() => setSelected(row.original)}
            className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Eye className="size-3" aria-hidden="true" /> View Submissions
          </button>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-black text-foreground">Assignments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View all assignments, grade submissions, and track progress. {count} total assignments.
        </p>
      </div>

      <label htmlFor="assignment-search" className="sr-only">Search assignments</label>
      <input
        id="assignment-search"
        className="h-10 w-full max-w-sm rounded-xl border border-border bg-card px-3.5 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
        placeholder="Search assignments…"
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1); }}
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <DataTable columns={columns} data={assignments} exportFilename="assignments_export" />
      )}

      <AnimatePresence>
        {selected && <SubmissionsPanel assignment={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}
