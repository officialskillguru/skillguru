import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Clock, CheckCircle, Upload, Send, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { getExtendedSupabaseClient } from "@/services/_shared";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

interface Assignment {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  due_date: string | null;
  max_score: number | null;
  passing_score: number | null;
  status: string;
  course?: { title: string } | null;
  my_submission?: {
    id: string;
    assignment_id: string;
    content: string | null;
    status: string;
    score: number | null;
    feedback: string | null;
    submitted_at: string;
  } | null;
}

async function fetchMyAssignments(userId: string) {
  const supabase = getExtendedSupabaseClient();

  // Get courses the student is enrolled in
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", userId)
    .eq("status", "active");

  const courseIds = (enrollments ?? []).map((e: { course_id: string }) => e.course_id);
  if (!courseIds.length) return [];

  const { data: assignments, error } = await supabase
    .from("assignments")
    .select(`
      *,
      course:courses(title)
    `)
    .in("course_id", courseIds)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) throw error;

  // Get student's submissions for these assignments
  const assignmentIds = (assignments ?? []).map((a: { id: string }) => a.id);
  const { data: submissions } = await supabase
    .from("assignment_submissions")
    .select("*")
    .eq("student_id", userId)
    .in("assignment_id", assignmentIds);

  const submissionMap = new Map<string, NonNullable<Assignment["my_submission"]>>(
    ((submissions ?? []) as unknown as NonNullable<Assignment["my_submission"]>[]).map((s) => [s.assignment_id, s])
  );

  return ((assignments ?? []) as unknown as Assignment[]).map((a) => ({
    ...a,
    my_submission: submissionMap.get(a.id) ?? null,
  }));
}

function SubmitModal({ assignment, onClose }: { assignment: Assignment; onClose: () => void }) {
  const qc = useQueryClient();
  const { session } = useAuth();
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      const supabase = getExtendedSupabaseClient();
      const { error } = await supabase
        .from("assignment_submissions")
        .insert({
          assignment_id: assignment.id,
          student_id: session?.user?.id,
          content: content || null,
          file_url: url || null,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assignment submitted successfully!");
      void qc.invalidateQueries({ queryKey: ["my-assignments"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-lg font-black text-foreground">Submit Assignment</h2>
            <p className="text-xs text-muted-foreground">{assignment.title}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          {assignment.instructions && (
            <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
              <p className="mb-1 text-xs font-bold text-foreground">Instructions</p>
              <p className="text-sm text-foreground/80">{assignment.instructions}</p>
            </div>
          )}
          <div>
            <label htmlFor="assignment-answer" className="mb-1.5 block text-xs font-bold text-muted-foreground">Your Answer</label>
            <textarea
              id="assignment-answer"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={6}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write your answer here…"
            />
          </div>
          <div>
            <label htmlFor="assignment-url" className="mb-1.5 block text-xs font-bold text-muted-foreground">Submission URL (GitHub, Google Drive, etc.)</label>
            <input
              id="assignment-url"
              type="url"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://github.com/yourusername/project"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-border p-5">
          <button onClick={onClose} className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Cancel</button>
          <button
            onClick={() => submit.mutate()}
            disabled={submit.isPending || (!content && !url)}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
          >
            <Send className="size-4" aria-hidden="true" />
            {submit.isPending ? "Submitting…" : "Submit"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AssignmentsPage() {
  const { session } = useAuth();
  const [selected, setSelected] = useState<Assignment | null>(null);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["my-assignments", session?.user?.id],
    queryFn: () => fetchMyAssignments(session!.user.id),
    enabled: !!session?.user?.id,
  });

  const pending = assignments.filter((a: Assignment) => !a.my_submission);
  const submitted = assignments.filter((a: Assignment) => a.my_submission);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-black text-foreground">Assignments</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {pending.length} pending · {submitted.length} submitted
        </p>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-black uppercase tracking-wider text-muted-foreground">Pending Submissions</h2>
          <div className="space-y-3">
            {pending.map((a: Assignment) => {
              const isOverdue = a.due_date && new Date(a.due_date) < new Date();
              return (
                <div key={a.id} className={`rounded-2xl border p-4 ${isOverdue ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.course?.title} · Max {a.max_score} pts</p>
                      {a.due_date && (
                        <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${isOverdue ? "text-destructive-text" : "text-warning"}`}>
                          <Clock className="size-3" aria-hidden="true" />
                          Due: {new Date(a.due_date).toLocaleDateString()}
                          {isOverdue && " (Overdue)"}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setSelected(a)}
                      className="flex-none flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-black text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <Upload className="size-3" aria-hidden="true" /> Submit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submitted */}
      {submitted.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-black uppercase tracking-wider text-muted-foreground">Submitted Assignments</h2>
          <div className="space-y-3">
            {submitted.map((a: Assignment) => {
              const sub = a.my_submission!;
              const isGraded = sub.status === "graded";
              const passed = isGraded && sub.score !== null && sub.score >= (a.passing_score ?? 0);
              return (
                <div key={a.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.course?.title}</p>
                      <div className="mt-2 flex items-center gap-3 flex-wrap">
                        <Badge variant={isGraded ? (passed ? "success" : "destructive") : "info"} className="gap-1.5">
                          {isGraded ? <CheckCircle className="size-3" aria-hidden="true" /> : <Clock className="size-3" aria-hidden="true" />}
                          {sub.status}
                        </Badge>
                        {isGraded && sub.score !== null && (
                          <span className="text-sm font-bold text-foreground">
                            {sub.score} / {a.max_score} pts
                          </span>
                        )}
                      </div>
                      {sub.feedback && (
                        <p className="mt-2 text-sm text-muted-foreground italic">"{sub.feedback}"</p>
                      )}
                    </div>
                    <p className="flex-none text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(sub.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isLoading && assignments.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <BookOpen className="mb-4 size-12 text-muted-foreground" aria-hidden="true" />
          <p className="font-semibold text-foreground">No assignments yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Assignments from your courses will appear here.</p>
        </div>
      )}

      <AnimatePresence>
        {selected && <SubmitModal assignment={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}
