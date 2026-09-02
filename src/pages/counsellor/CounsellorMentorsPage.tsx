import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Star, Trash2, UserCog } from "lucide-react";

import { usePageMeta } from "@/hooks/usePageMeta";
import { getSupabaseClientOrThrow } from "@/services/_shared";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

interface MentorRow {
  id: string;
  full_name: string | null;
  email: string;
  headline: string | null;
  status: string | null;
}

interface CourseAssignmentRow {
  id: string;
  course_id: string;
  is_primary: boolean;
  status: string;
  courses: { title: string } | null;
}

interface CourseOption {
  id: string;
  title: string;
}

function initials(name: string | null | undefined) {
  const source = name?.trim();
  if (!source) return "?";
  const parts = source.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

async function fetchMentors(): Promise<MentorRow[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data: profiles, error: profilesError } = await supabase
    .from("mentor_profiles")
    .select("id, headline, status")
    .is("deleted_at", null)
    .order("status", { ascending: true });
  if (profilesError) throw profilesError;
  const ids = (profiles ?? []).map((m) => m.id);
  if (ids.length === 0) return [];

  const { data: people, error: peopleError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ids);
  if (peopleError) throw peopleError;

  const byId = new Map(people?.map((p) => [p.id, p]));
  return (profiles ?? []).map((m) => ({
    id: m.id,
    headline: m.headline,
    status: m.status,
    full_name: byId.get(m.id)?.full_name ?? null,
    email: byId.get(m.id)?.email ?? "",
  }));
}

async function fetchCourseAssignments(mentorId: string): Promise<CourseAssignmentRow[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("course_mentors")
    .select("id, course_id, is_primary, status, courses(title)")
    .eq("mentor_id", mentorId)
    .order("is_primary", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function fetchAllCourses(): Promise<CourseOption[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("courses").select("id, title").is("deleted_at", null).order("title");
  if (error) throw error;
  return data ?? [];
}

export default function CounsellorMentorsPage() {
  usePageMeta("Mentor Management");
  const queryClient = useQueryClient();
  const [selectedMentorId, setSelectedMentorId] = useState<string | null>(null);
  const [courseToAssign, setCourseToAssign] = useState("");

  const { data: mentors, isLoading: mentorsLoading } = useQuery({ queryKey: ["counsellor-mentors"], queryFn: fetchMentors });
  const { data: allCourses } = useQuery({ queryKey: ["counsellor-all-courses"], queryFn: fetchAllCourses });

  const selectedMentor = useMemo(() => mentors?.find((m) => m.id === selectedMentorId) ?? null, [mentors, selectedMentorId]);

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["counsellor-mentor-assignments", selectedMentorId],
    queryFn: () => fetchCourseAssignments(selectedMentorId!),
    enabled: !!selectedMentorId,
  });

  const assignedCourseIds = new Set((assignments ?? []).map((a) => a.course_id));
  const assignableCourses = (allCourses ?? []).filter((c) => !assignedCourseIds.has(c.id));

  const assignMutation = useMutation({
    mutationFn: async ({ mentorId, courseId }: { mentorId: string; courseId: string }) => {
      const supabase = getSupabaseClientOrThrow();
      const { error } = await supabase.from("course_mentors").insert({ mentor_id: mentorId, course_id: courseId, is_primary: false });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mentor assigned to course.");
      setCourseToAssign("");
      void queryClient.invalidateQueries({ queryKey: ["counsellor-mentor-assignments", selectedMentorId] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to assign mentor.";
      if (message.includes("inactive/suspended")) {
        toast.error("This mentor is inactive or suspended and can't be newly assigned to a course.");
      } else if (message.includes("duplicate key")) {
        toast.error("This mentor is already assigned to that course.");
      } else {
        toast.error(message);
      }
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const supabase = getSupabaseClientOrThrow();
      const { error } = await supabase.from("course_mentors").delete().eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mentor removed from course.");
      void queryClient.invalidateQueries({ queryKey: ["counsellor-mentor-assignments", selectedMentorId] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Failed to remove assignment."),
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async ({ assignmentId, courseId }: { assignmentId: string; courseId: string }) => {
      const supabase = getSupabaseClientOrThrow();
      // Clear any existing primary on this course first (partial unique index allows only one).
      const { error: clearError } = await supabase.from("course_mentors").update({ is_primary: false }).eq("course_id", courseId).eq("is_primary", true);
      if (clearError) throw clearError;
      const { error } = await supabase.from("course_mentors").update({ is_primary: true }).eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Primary instructor updated.");
      void queryClient.invalidateQueries({ queryKey: ["counsellor-mentor-assignments", selectedMentorId] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Failed to update primary instructor."),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Mentor Management</h1>
        <p className="text-sm text-muted-foreground">View mentor profiles and manage which courses each mentor teaches.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">All Mentors</p>
          </div>
          {mentorsLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
            </div>
          ) : !mentors || mentors.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No mentors found.</p>
          ) : (
            <ul className="max-h-[600px] divide-y divide-border overflow-y-auto">
              {mentors.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedMentorId(m.id)}
                    aria-current={selectedMentorId === m.id ? "true" : undefined}
                    className={[
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                      selectedMentorId === m.id ? "bg-muted" : "hover:bg-muted/50",
                    ].join(" ")}
                  >
                    <Avatar className="size-9 shrink-0">
                      <AvatarFallback className="text-xs">{initials(m.full_name)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">{m.full_name ?? "—"}</span>
                      <span className="block truncate text-xs text-muted-foreground">{m.headline ?? m.email}</span>
                    </span>
                    {m.status && m.status !== "active" && (
                      <Badge variant="outline" className="shrink-0 capitalize">{m.status}</Badge>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          {!selectedMentor ? (
            <EmptyState
              icon={<UserCog className="size-8" aria-hidden="true" />}
              title="Select a mentor"
              description="Choose a mentor from the list to view and manage their course assignments."
            />
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-foreground">{selectedMentor.full_name ?? "—"}</h2>
                  <p className="text-sm text-muted-foreground">{selectedMentor.email}</p>
                </div>
                {selectedMentor.status && selectedMentor.status !== "active" && (
                  <Badge variant="outline" className="capitalize">{selectedMentor.status}</Badge>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Teaching</h3>
                {assignmentsLoading ? (
                  <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}</div>
                ) : !assignments || assignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Not currently assigned to any course.</p>
                ) : (
                  <ul className="space-y-2">
                    {assignments.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-semibold text-foreground">{a.courses?.title ?? "Untitled course"}</span>
                          {a.is_primary && (
                            <Badge variant="success" className="shrink-0 gap-1">
                              <Star className="size-3 fill-current" aria-hidden="true" /> Primary
                            </Badge>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {!a.is_primary && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPrimaryMutation.mutate({ assignmentId: a.id, courseId: a.course_id })}
                              disabled={setPrimaryMutation.isPending}
                            >
                              Make Primary
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (window.confirm(`Remove ${selectedMentor.full_name ?? "this mentor"} from "${a.courses?.title ?? "this course"}"?`)) {
                                removeMutation.mutate(a.id);
                              }
                            }}
                            disabled={removeMutation.isPending}
                            className="gap-1.5 text-destructive-text hover:text-destructive-text"
                            aria-label={`Remove from ${a.courses?.title ?? "course"}`}
                          >
                            {removeMutation.isPending && removeMutation.variables === a.id ? (
                              <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                            ) : (
                              <Trash2 className="size-3.5" aria-hidden="true" />
                            )}
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Assign to a Course</h3>
                <div className="flex items-center gap-2">
                  <label htmlFor="assign-course-select" className="sr-only">Select a course to assign</label>
                  <select
                    id="assign-course-select"
                    value={courseToAssign}
                    onChange={(e) => setCourseToAssign(e.target.value)}
                    className="h-10 w-full max-w-xs rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select a course…</option>
                    {assignableCourses.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                  <Button
                    onClick={() => courseToAssign && assignMutation.mutate({ mentorId: selectedMentor.id, courseId: courseToAssign })}
                    disabled={!courseToAssign || assignMutation.isPending}
                    className="shrink-0 gap-1.5"
                  >
                    {assignMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    ) : (
                      <Plus className="size-4" aria-hidden="true" />
                    )}
                    Assign
                  </Button>
                </div>
                {assignableCourses.length === 0 && (allCourses?.length ?? 0) > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">This mentor is already assigned to every course.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
