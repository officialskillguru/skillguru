import { useRef, useState } from "react";
import { getNextTabIndex } from "@/lib/a11y-tabs";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Calendar, CheckCircle2, ArrowRightLeft, Upload, Download, Trash2, History, Star, X } from "lucide-react";
import {
  useMentorNotes,
  useMentorTasks,
  useTaskComments,
  useMentorMeetings,
  useMentorTimeline,
  useMentorCourses,
  useMentorPerformance,
  useMentorDocuments,
} from "@/hooks/admin/useMentorCRM";
import { MENTOR_TASK_TYPES, type Task } from "@/services/crm.service";
import { listMentors } from "@/services/mentors.service";
import { notificationsService } from "@/services/notifications.service";
import { getMentorDocumentUrl, MENTOR_DOCUMENT_TYPE_LABELS, type MentorDocument, type MentorDocumentType } from "@/services/mentor-documents.service";

const SUB_TABS = ["Notes", "Tasks", "Meetings", "Timeline"] as const;
type SubTab = (typeof SUB_TABS)[number];

const PRIORITY_LABELS: Record<string, string> = { low: "Low", medium: "Medium", high: "High", urgent: "Critical" };

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

// ─── CRM tab (Notes / Tasks / Meetings / Timeline) ─────────────────────────

export function MentorCRMPanel({ mentorId, mentorName }: { mentorId: string; mentorName: string }) {
  const [subTab, setSubTab] = useState<SubTab>("Notes");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const nextIndex = getNextTabIndex(index, e.key, SUB_TABS.length);
    const nextTab = nextIndex === null ? undefined : SUB_TABS[nextIndex];
    if (!nextTab) return;
    e.preventDefault();
    setSubTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  };

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Teacher CRM sections" className="flex gap-1 rounded-xl bg-muted p-1">
        {SUB_TABS.map((tab, i) => (
          <button
            key={tab}
            ref={(el) => { tabRefs.current[tab] = el; }}
            type="button"
            role="tab"
            id={`mentor-crm-tab-${tab}`}
            aria-controls={`mentor-crm-panel-${tab}`}
            aria-selected={subTab === tab}
            tabIndex={subTab === tab ? 0 : -1}
            onClick={() => setSubTab(tab)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={[
              "flex-1 rounded-lg py-2 text-[11px] font-black uppercase tracking-wider transition-colors",
              subTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {tab}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`mentor-crm-panel-${subTab}`} aria-labelledby={`mentor-crm-tab-${subTab}`} tabIndex={0}>
        {subTab === "Notes" && <NotesTab mentorId={mentorId} active={subTab === "Notes"} />}
        {subTab === "Tasks" && <TasksTab mentorId={mentorId} mentorName={mentorName} active={subTab === "Tasks"} />}
        {subTab === "Meetings" && <MeetingsTab mentorId={mentorId} mentorName={mentorName} active={subTab === "Meetings"} />}
        {subTab === "Timeline" && <TimelineTab mentorId={mentorId} active={subTab === "Timeline"} />}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
      <span>{message}</span>
      <button type="button" onClick={onRetry} className="shrink-0 rounded-lg bg-red-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-red-700 hover:bg-red-200">
        Retry
      </button>
    </div>
  );
}

function NotesTab({ mentorId, active }: { mentorId: string; active: boolean }) {
  const { data: notes, isLoading, isError, refetch, addNote } = useMentorNotes(mentorId, active);
  const [content, setContent] = useState("");

  const handleAdd = () => {
    if (!content.trim()) return;
    addNote.mutate(content.trim(), {
      onSuccess: () => setContent(""),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to add note."),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <label htmlFor="mentor-note-input" className="sr-only">New internal note</label>
        <textarea
          id="mentor-note-input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add an internal note about this teacher..."
          rows={2}
          className="w-full flex-1 rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={addNote.isPending}
          className="h-fit rounded-lg bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {isLoading ? (
        <p className="text-xs font-semibold text-muted-foreground">Loading notes...</p>
      ) : isError ? (
        <ErrorState message="Failed to load notes." onRetry={() => void refetch()} />
      ) : (notes ?? []).length === 0 ? (
        <p className="text-xs font-semibold text-muted-foreground">No internal notes yet.</p>
      ) : (
        <div className="space-y-2">
          {notes!.map((n) => (
            <div key={n.id} className="rounded-xl border border-border p-3">
              <p className="text-sm text-foreground">{n.content}</p>
              <p className="mt-1 text-[10px] font-bold text-muted-foreground">
                {n.author?.full_name ?? "Unknown"} · {formatDate(n.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TasksTab({ mentorId, mentorName, active }: { mentorId: string; mentorName: string; active: boolean }) {
  const { data: tasks, isLoading, isError, refetch, createTask, updateTask } = useMentorTasks(mentorId, active);
  const [showForm, setShowForm] = useState(false);
  const [taskType, setTaskType] = useState<string>(MENTOR_TASK_TYPES[0]);
  const [customTitle, setCustomTitle] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [dueDate, setDueDate] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const handleCreate = () => {
    const title = taskType === "Custom Task" ? customTitle.trim() : taskType;
    if (!title) {
      toast.error("Enter a task title.");
      return;
    }
    createTask.mutate(
      { title, priority, due_date: dueDate || null, assignee_id: mentorId, status: "pending" },
      {
        onSuccess: () => {
          toast.success(`Task assigned to ${mentorName}.`);
          setShowForm(false);
          setCustomTitle("");
          setDueDate("");
          void notificationsService.sendNotification(mentorId, "New task assigned", title, { type: "task_assigned", category: "assignment" });
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create task."),
      }
    );
  };

  const handleStatusChange = (task: Task, status: Task["status"]) => {
    updateTask.mutate(
      { id: task.id, updates: { status, completed_at: status === "completed" ? new Date().toISOString() : null } },
      {
        onSuccess: () => void notificationsService.sendNotification(mentorId, "Task updated", `"${task.title}" is now ${status.replace("_", " ")}`, { type: "task_updated", category: "assignment" }),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update task."),
      }
    );
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setShowForm((s) => !s)}
        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="size-3.5" aria-hidden="true" /> New Task
      </button>

      {showForm && (
        <div className="space-y-2 rounded-xl border border-border p-3">
          <label htmlFor="task-type-select" className="text-[10px] font-black uppercase text-muted-foreground">Task Type</label>
          <select id="task-type-select" value={taskType} onChange={(e) => setTaskType(e.target.value)} className="w-full h-10 rounded-lg border border-border bg-muted px-3 text-sm outline-none focus:border-primary">
            {MENTOR_TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {taskType === "Custom Task" && (
            <>
              <label htmlFor="task-custom-title" className="sr-only">Custom task title</label>
              <input id="task-custom-title" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="Custom task title" className="w-full h-10 rounded-lg border border-border bg-muted px-3 text-sm outline-none focus:border-primary" />
            </>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label htmlFor="task-priority-select" className="sr-only">Priority</label>
            <select id="task-priority-select" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className="h-10 rounded-lg border border-border bg-muted px-3 text-sm outline-none focus:border-primary">
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <label htmlFor="task-due-date" className="sr-only">Due date</label>
            <input id="task-due-date" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-10 rounded-lg border border-border bg-muted px-3 text-sm outline-none focus:border-primary" />
          </div>
          <button type="button" onClick={handleCreate} disabled={createTask.isPending} className="w-full rounded-lg bg-primary py-2 text-[10px] font-black uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            Assign Task
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs font-semibold text-muted-foreground">Loading tasks...</p>
      ) : isError ? (
        <ErrorState message="Failed to load tasks." onRetry={() => void refetch()} />
      ) : (tasks ?? []).length === 0 ? (
        <p className="text-xs font-semibold text-muted-foreground">No tasks assigned yet.</p>
      ) : (
        <div className="space-y-2">
          {tasks!.map((t) => (
            <div key={t.id} className="rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-foreground">{t.title}</p>
                  <p className="text-[10px] font-bold text-muted-foreground">
                    {PRIORITY_LABELS[t.priority] ?? t.priority} · {t.due_date ? `Due ${formatDate(t.due_date)}` : "No due date"}
                  </p>
                </div>
                <select
                  aria-label={`Status for ${t.title}`}
                  value={t.status}
                  onChange={(e) => handleStatusChange(t, e.target.value as Task["status"])}
                  className="h-8 rounded-lg border border-border bg-muted px-2 text-[10px] font-bold outline-none focus:border-primary"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => setExpandedTaskId(expandedTaskId === t.id ? null : t.id)}
                className="mt-2 text-[10px] font-black uppercase tracking-wider text-primary hover:underline"
              >
                {expandedTaskId === t.id ? "Hide comments" : "Comments"}
              </button>
              {expandedTaskId === t.id && <TaskCommentsInline taskId={t.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCommentsInline({ taskId }: { taskId: string }) {
  const { data: comments, isLoading, isError, refetch, addComment } = useTaskComments(taskId);
  const [content, setContent] = useState("");

  return (
    <div className="mt-2 space-y-2 border-t border-border pt-2">
      {isLoading ? (
        <p className="text-[10px] font-semibold text-muted-foreground">Loading comments...</p>
      ) : isError ? (
        <ErrorState message="Failed to load comments." onRetry={() => void refetch()} />
      ) : (
        (comments ?? []).map((c) => (
          <p key={c.id} className="text-xs text-foreground">
            <span className="font-bold">{c.author?.full_name ?? "Unknown"}:</span> {c.content}
          </p>
        ))
      )}
      <div className="flex gap-2">
        <label htmlFor={`comment-${taskId}`} className="sr-only">Add comment</label>
        <input
          id={`comment-${taskId}`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment..."
          className="h-8 flex-1 rounded-lg border border-border bg-muted px-2 text-xs outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => { if (content.trim()) { addComment.mutate(content.trim(), { onSuccess: () => setContent("") }); } }}
          className="rounded-lg bg-muted px-2 text-[10px] font-black uppercase text-foreground hover:bg-accent/10"
        >
          Post
        </button>
      </div>
    </div>
  );
}

function MeetingsTab({ mentorId, mentorName, active }: { mentorId: string; mentorName: string; active: boolean }) {
  const { data: meetings, isLoading, isError, refetch, scheduleMeeting, completeMeeting } = useMentorMeetings(mentorId, active);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [meetingType, setMeetingType] = useState<"mentor" | "student" | "internal" | "interview">("internal");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const handleSchedule = () => {
    if (!title.trim() || !startsAt || !endsAt) {
      toast.error("Title, start, and end time are required.");
      return;
    }
    scheduleMeeting.mutate(
      { title: title.trim(), hostId: mentorId, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(), meetingType },
      {
        onSuccess: () => {
          toast.success(`Meeting scheduled with ${mentorName}.`);
          setShowForm(false);
          setTitle("");
          void notificationsService.sendNotification(mentorId, "Meeting scheduled", title.trim(), { type: "meeting_scheduled", category: "general" });
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to schedule meeting."),
      }
    );
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setShowForm((s) => !s)}
        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
      >
        <Calendar className="size-3.5" aria-hidden="true" /> Schedule Meeting
      </button>

      {showForm && (
        <div className="space-y-2 rounded-xl border border-border p-3">
          <label htmlFor="meeting-title" className="sr-only">Meeting title</label>
          <input id="meeting-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meeting title" className="w-full h-10 rounded-lg border border-border bg-muted px-3 text-sm outline-none focus:border-primary" />
          <label htmlFor="meeting-type-select" className="sr-only">Meeting type</label>
          <select id="meeting-type-select" value={meetingType} onChange={(e) => setMeetingType(e.target.value as typeof meetingType)} className="w-full h-10 rounded-lg border border-border bg-muted px-3 text-sm outline-none focus:border-primary">
            <option value="internal">Internal Meeting</option>
            <option value="interview">Interview Meeting</option>
            <option value="mentor">Teacher Meeting</option>
            <option value="student">Student Meeting</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="meeting-starts-at" className="sr-only">Start time</label>
              <input id="meeting-starts-at" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label htmlFor="meeting-ends-at" className="sr-only">End time</label>
              <input id="meeting-ends-at" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm outline-none focus:border-primary" />
            </div>
          </div>
          <button type="button" onClick={handleSchedule} disabled={scheduleMeeting.isPending} className="w-full rounded-lg bg-primary py-2 text-[10px] font-black uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            Schedule
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs font-semibold text-muted-foreground">Loading meetings...</p>
      ) : isError ? (
        <ErrorState message="Failed to load meetings." onRetry={() => void refetch()} />
      ) : (meetings ?? []).length === 0 ? (
        <p className="text-xs font-semibold text-muted-foreground">No meetings recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {meetings!.map((m) => (
            <div key={m.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">{m.title}</p>
                <span className="text-[10px] font-black uppercase text-muted-foreground">{m.status}</span>
              </div>
              <p className="text-[10px] font-bold text-muted-foreground">{formatDate(m.starts_at)} – {formatDate(m.ends_at)}</p>
              {m.notes && <p className="mt-1 text-xs text-foreground">{m.notes}</p>}
              {m.status === "scheduled" && (
                <button
                  type="button"
                  onClick={() => {
                    const outcome = window.prompt("Outcome / notes for this meeting:") ?? "";
                    completeMeeting.mutate({ id: m.id, outcome });
                  }}
                  className="mt-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 hover:underline"
                >
                  <CheckCircle2 className="size-3" aria-hidden="true" /> Mark Completed
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineTab({ mentorId, active }: { mentorId: string; active: boolean }) {
  const { data, isLoading, isError, refetch } = useMentorTimeline(mentorId, active);
  const entries = data?.data ?? [];

  if (isLoading) return <p className="text-xs font-semibold text-muted-foreground">Loading activity...</p>;
  if (isError) return <ErrorState message="Failed to load activity." onRetry={() => void refetch()} />;
  if (entries.length === 0) return <p className="text-xs font-semibold text-muted-foreground">No activity recorded yet.</p>;

  return (
    <div className="space-y-2">
      {entries.map((e) => (
        <div key={e.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
          <div className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">{e.action.replace(/_/g, " ")}</p>
            <p className="text-[10px] font-bold text-muted-foreground">
              {e.actor?.full_name ?? "System"} · {formatDate(e.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Courses tab ─────────────────────────────────────────────────────────────

export function MentorCoursesPanel({ mentorId, active }: { mentorId: string; active: boolean }) {
  const { data: courses, isLoading, isError, refetch, assignableQuery, assign, remove, setPrimary, reassign } = useMentorCourses(mentorId, active);
  const [courseToAssign, setCourseToAssign] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetMentorId, setTargetMentorId] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);

  const { data: mentorOptions } = useQuery({
    queryKey: ["admin-mentor-reassign-options"],
    queryFn: async () => (await listMentors({ pageSize: 200 })).data,
    enabled: active && transferOpen,
  });

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const handleAssign = () => {
    if (!courseToAssign) return;
    assign.mutate(courseToAssign, {
      onSuccess: () => {
        toast.success("Teacher assigned to course.");
        setCourseToAssign("");
      },
      onError: (err) => {
        const message = err instanceof Error ? err.message : "Failed to assign to course.";
        if (message.includes("inactive/suspended")) {
          toast.error("This teacher is inactive or suspended and can't be newly assigned to a course.");
        } else if (message.includes("duplicate key")) {
          toast.error("This teacher is already assigned to that course.");
        } else {
          toast.error(message);
        }
      },
    });
  };

  const handleRemove = (courseId: string, title: string) => {
    if (!window.confirm(`Remove this teacher from "${title}"? This does not delete the course or its history.`)) return;
    remove.mutate(courseId, {
      onSuccess: () => toast.success("Teacher removed from course."),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to remove course assignment."),
    });
  };

  const handleSetPrimary = (courseId: string) => {
    setPrimary.mutate(courseId, {
      onSuccess: () => toast.success("Primary instructor updated."),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update primary instructor."),
    });
  };

  const handleTransfer = () => {
    if (selected.size === 0 || !targetMentorId) {
      toast.error("Select at least one course and a destination mentor.");
      return;
    }
    reassign.mutate(
      { courseIds: Array.from(selected), toMentorId: targetMentorId },
      {
        onSuccess: () => {
          toast.success("Course ownership transferred.");
          setSelected(new Set());
          setTargetMentorId("");
          setTransferOpen(false);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to transfer courses."),
      }
    );
  };

  if (isLoading) return <p className="text-xs font-semibold text-muted-foreground">Loading courses...</p>;
  if (isError) return <ErrorState message="Failed to load courses." onRetry={() => void refetch()} />;

  return (
    <div className="space-y-5">
      <div>
        <h4 className="mb-2 text-xs font-black uppercase tracking-wider text-foreground">Teaching</h4>
        {(courses ?? []).length === 0 ? (
          <p className="text-xs font-semibold text-muted-foreground">Not currently assigned to any course.</p>
        ) : (
          <div className="space-y-2">
            {courses!.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-foreground">{c.title}</p>
                    {c.isPrimary && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                        <Star className="size-2.5 fill-current" aria-hidden="true" /> Primary
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground">
                    {c.enrollmentCount} enrolled · {c.ratingCount > 0 ? `${c.avgRating.toFixed(1)}★ (${c.ratingCount})` : "No ratings"} · {c.avgCompletion.toFixed(0)}% avg completion
                  </p>
                </div>
                <span className="text-[10px] font-black uppercase text-muted-foreground">{c.status}</span>
                {!c.isPrimary && (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(c.id)}
                    disabled={setPrimary.isPending}
                    title="Make primary teacher"
                    aria-label={`Make primary teacher for ${c.title}`}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Star className="size-3.5" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(c.id, c.title)}
                  disabled={remove.isPending}
                  title="Remove from course"
                  aria-label={`Remove teacher from ${c.title}`}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="mb-2 text-xs font-black uppercase tracking-wider text-foreground">Assign to a Course</h4>
        <div className="flex gap-2">
          <label htmlFor="admin-mentor-assign-course" className="sr-only">Select a course to assign</label>
          <select
            id="admin-mentor-assign-course"
            value={courseToAssign}
            onChange={(e) => setCourseToAssign(e.target.value)}
            className="h-10 flex-1 rounded-lg border border-border bg-muted px-3 text-sm outline-none focus:border-primary"
          >
            <option value="">Select a course…</option>
            {(assignableQuery.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAssign}
            disabled={!courseToAssign || assign.isPending}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="size-3.5" aria-hidden="true" /> Assign
          </button>
        </div>
        {assignableQuery.data?.length === 0 && (courses ?? []).length > 0 && (
          <p className="mt-1.5 text-[10px] font-bold text-muted-foreground">Already assigned to every course.</p>
        )}
      </div>

      <div className="rounded-xl border border-border p-3">
        {!transferOpen ? (
          <button
            type="button"
            onClick={() => setTransferOpen(true)}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            <ArrowRightLeft className="size-3.5" aria-hidden="true" /> Bulk-transfer courses to another teacher…
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-muted-foreground">
              For full ownership transfer (e.g. before deleting this teacher) — moves the selected courses' primary ownership to another teacher entirely.
            </p>
            <div className="max-h-40 space-y-1.5 overflow-y-auto">
              {(courses ?? []).map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                  {c.title}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <label htmlFor="course-transfer-target" className="sr-only">Transfer selected courses to</label>
              <select id="course-transfer-target" value={targetMentorId} onChange={(e) => setTargetMentorId(e.target.value)} className="h-10 flex-1 rounded-lg border border-border bg-muted px-3 text-sm outline-none focus:border-primary">
                <option value="">Transfer selected to...</option>
                {(mentorOptions ?? []).filter((m) => m.id !== mentorId).map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleTransfer}
                disabled={reassign.isPending}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <ArrowRightLeft className="size-3.5" aria-hidden="true" /> Transfer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Performance tab ─────────────────────────────────────────────────────────

export function MentorPerformancePanel({ mentorId, active }: { mentorId: string; active: boolean }) {
  const { data, isLoading, isError, refetch } = useMentorPerformance(mentorId, active);
  if (isLoading) return <p className="text-xs font-semibold text-muted-foreground">Loading performance data...</p>;
  if (isError) return <ErrorState message="Failed to load performance data." onRetry={() => void refetch()} />;
  if (!data) return null;

  const metrics: { label: string; value: string }[] = [
    { label: "Students Assigned", value: String(data.studentsAssigned) },
    { label: "Courses", value: String(data.coursesCount) },
    { label: "Assignments Reviewed", value: String(data.assignmentsReviewed) },
    { label: "Quiz Attempts", value: String(data.quizAttempts) },
    { label: "Certificates Issued", value: String(data.certificatesIssued) },
    { label: "Average Rating", value: data.avgRating > 0 ? `${data.avgRating.toFixed(1)}★` : "No ratings yet" },
    { label: "Avg. Completion Rate", value: `${data.avgCompletionRate.toFixed(0)}%` },
    { label: "Upcoming Meetings", value: String(data.upcomingMeetings) },
    { label: "Pending Tasks", value: String(data.pendingTasks) },
    { label: "Completed Tasks", value: String(data.completedTasks) },
    { label: "Avg. Task Turnaround", value: data.avgTaskCompletionHours != null ? `${data.avgTaskCompletionHours.toFixed(1)}h` : "N/A" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {metrics.map((m) => (
        <div key={m.label} className="rounded-xl border border-border p-3">
          <p className="text-lg font-black text-foreground">{m.value}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{m.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Documents tab ───────────────────────────────────────────────────────────

const DOCUMENT_TYPE_ORDER: MentorDocumentType[] = ["resume", "certificate", "agreement", "identity", "portfolio", "other"];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MentorDocumentsPanel({ mentorId, active }: { mentorId: string; active: boolean }) {
  const { data: documents, isLoading, isError, refetch, upload, remove } = useMentorDocuments(mentorId, active);
  const [uploadType, setUploadType] = useState<MentorDocumentType>("resume");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    upload.mutate(
      { documentType: uploadType, file },
      {
        onSuccess: () => toast.success(`${MENTOR_DOCUMENT_TYPE_LABELS[uploadType]} uploaded.`),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to upload document."),
      }
    );
    e.target.value = "";
  };

  const handleView = async (doc: MentorDocument) => {
    const url = await getMentorDocumentUrl(doc.file_id);
    if (!url) {
      toast.error("Could not generate a download link for this file.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDelete = (doc: MentorDocument) => {
    if (!window.confirm(`Delete this ${MENTOR_DOCUMENT_TYPE_LABELS[doc.document_type as MentorDocumentType]} (v${doc.version})?`)) return;
    remove.mutate(doc.id, {
      onSuccess: () => toast.success("Document deleted."),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete document."),
    });
  };

  const grouped = new Map<MentorDocumentType, MentorDocument[]>();
  for (const doc of documents ?? []) {
    const type = doc.document_type as MentorDocumentType;
    const arr = grouped.get(type) ?? [];
    arr.push(doc);
    grouped.set(type, arr);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
        <label htmlFor="mentor-doc-type" className="text-[10px] font-black uppercase text-muted-foreground">Upload as</label>
        <select
          id="mentor-doc-type"
          value={uploadType}
          onChange={(e) => setUploadType(e.target.value as MentorDocumentType)}
          className="h-9 rounded-lg border border-border bg-muted px-2 text-xs font-semibold outline-none focus:border-primary"
        >
          {DOCUMENT_TYPE_ORDER.map((t) => (
            <option key={t} value={t}>{MENTOR_DOCUMENT_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <input ref={fileInputRef} type="file" onChange={handleFileSelected} className="sr-only" id="mentor-doc-file-input" />
        <label
          htmlFor="mentor-doc-file-input"
          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
        >
          <Upload className="size-3.5" aria-hidden="true" /> Upload File
        </label>
        {upload.isPending && <span className="text-[10px] font-bold text-muted-foreground">Uploading...</span>}
      </div>

      {isLoading ? (
        <p className="text-xs font-semibold text-muted-foreground">Loading documents...</p>
      ) : isError ? (
        <ErrorState message="Failed to load documents." onRetry={() => void refetch()} />
      ) : (documents ?? []).length === 0 ? (
        <p className="text-xs font-semibold text-muted-foreground">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-3">
          {DOCUMENT_TYPE_ORDER.filter((t) => grouped.has(t)).map((type) => {
            const docs = grouped.get(type)!;
            const current = docs.find((d) => d.is_current);
            const history = docs.filter((d) => !d.is_current);
            return (
              <div key={type} className="rounded-xl border border-border p-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground mb-2">{MENTOR_DOCUMENT_TYPE_LABELS[type]}</h4>
                {current && (
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{current.file?.original_name ?? "Untitled file"}</p>
                      <p className="text-[10px] font-bold text-muted-foreground">
                        v{current.version} · {current.file ? formatBytes(current.file.size_bytes) : ""} · {formatDate(current.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void handleView(current)}
                        title="View / download"
                        aria-label={`View or download ${MENTOR_DOCUMENT_TYPE_LABELS[type]} v${current.version}`}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                      >
                        <Download className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(current)}
                        title="Delete"
                        aria-label={`Delete ${MENTOR_DOCUMENT_TYPE_LABELS[type]} v${current.version}`}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}
                {history.length > 0 && (
                  <details className="mt-2">
                    <summary className="flex cursor-pointer items-center gap-1 text-[10px] font-black uppercase tracking-wider text-primary">
                      <History className="size-3" aria-hidden="true" /> {history.length} earlier version{history.length > 1 ? "s" : ""}
                    </summary>
                    <div className="mt-2 space-y-1.5">
                      {history.map((d) => (
                        <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-1.5">
                          <p className="truncate text-xs text-foreground">v{d.version} · {d.file?.original_name ?? "Untitled file"} · {formatDate(d.created_at)}</p>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => void handleView(d)}
                              title="View / download"
                              aria-label={`View or download ${MENTOR_DOCUMENT_TYPE_LABELS[type]} v${d.version}`}
                              className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
                            >
                              <Download className="size-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(d)}
                              title="Delete"
                              aria-label={`Delete ${MENTOR_DOCUMENT_TYPE_LABELS[type]} v${d.version}`}
                              className="rounded-lg p-1 text-muted-foreground hover:text-red-600"
                            >
                              <Trash2 className="size-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
