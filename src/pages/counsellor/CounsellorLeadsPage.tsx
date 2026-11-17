import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, Loader2, Plus, Search, Target } from "lucide-react";

import { usePageMeta } from "@/hooks/usePageMeta";
import { getSupabaseClientOrThrow } from "@/services/_shared";
import {
  crmService,
  type Lead,
  type LeadFollowup,
  type LeadPriority,
  type LeadStatus,
} from "@/services/crm.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PAGE_SIZE = 20;

const STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "demo_scheduled", label: "Demo scheduled" },
  { value: "follow_up", label: "Follow-up" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
  { value: "closed", label: "Closed" },
];
const PRIORITIES: LeadPriority[] = ["low", "medium", "high", "urgent"];
const FOLLOWUP_TYPES: LeadFollowup["type"][] = [
  "call",
  "email",
  "whatsapp",
  "meeting",
  "demo",
  "other",
];

const statusLabel = (s: string) => STATUSES.find((x) => x.value === s)?.label ?? s;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

function unwrap<T>(result: { success: boolean; data?: T; error?: unknown }): T {
  if (!result.success) {
    const err = result.error as { message?: string } | undefined;
    throw new Error(err?.message ?? "Request failed");
  }
  return result.data as T;
}

async function fetchCourseOptions() {
  const { data, error } = await getSupabaseClientOrThrow()
    .from("courses")
    .select("id, title")
    .eq("status", "published")
    .is("deleted_at", null)
    .order("title");
  if (error) throw error;
  return data ?? [];
}

type LeadForm = {
  name: string;
  email: string;
  phone: string;
  course_interest_id: string;
  source_id: string;
  priority: LeadPriority;
  notes: string;
};
const EMPTY_FORM: LeadForm = {
  name: "",
  email: "",
  phone: "",
  course_interest_id: "",
  source_id: "",
  priority: "medium",
  notes: "",
};

function CreateLeadDialog({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<LeadForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof LeadForm, string>>>({});
  const { data: courses = [] } = useQuery({
    queryKey: ["lead-course-options"],
    queryFn: fetchCourseOptions,
    enabled: open,
    staleTime: 300_000,
  });
  const { data: sources = [] } = useQuery({
    queryKey: ["lead-sources"],
    queryFn: async () => unwrap(await crmService.getLeadSources()),
    enabled: open,
    staleTime: 300_000,
  });

  const create = useMutation({
    mutationFn: async () =>
      unwrap(
        await crmService.createLead({
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          course_interest_id: form.course_interest_id || null,
          source_id: form.source_id || null,
          priority: form.priority,
          notes: form.notes.trim() || null,
          status: "new",
        }),
      ),
    onSuccess: (lead) => {
      toast.success(`Lead "${lead.name}" created.`);
      void queryClient.invalidateQueries({ queryKey: ["counsellor-leads"] });
      setForm(EMPTY_FORM);
      onOpenChange(false);
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Failed to create lead."),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Name is required.";
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim()))
      next.email = "Enter a valid email address.";
    if (!form.email.trim() && !form.phone.trim())
      next.phone = "Provide an email or a phone number.";
    if (form.phone.trim() && !/^[+\d][\d\s-]{6,}$/.test(form.phone.trim()))
      next.phone = "Enter a valid phone number.";
    setErrors(next);
    if (Object.keys(next).length === 0) create.mutate();
  };

  const field = (key: keyof LeadForm) => ({
    value: form[key],
    onChange: (e: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
    "aria-invalid": !!errors[key],
    "aria-describedby": errors[key] ? `lead-${key}-error` : undefined,
  });
  const errorText = (key: keyof LeadForm) =>
    errors[key] ? (
      <p id={`lead-${key}-error`} className="text-destructive mt-1 text-xs font-semibold">
        {errors[key]}
      </p>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New lead</DialogTitle>
          <DialogDescription>Record a prospective learner so you can follow up.</DialogDescription>
        </DialogHeader>
        <form id="create-lead-form" onSubmit={submit} noValidate className="grid gap-4">
          <div>
            <label htmlFor="lead-name" className="text-sm font-semibold">
              Full name *
            </label>
            <Input id="lead-name" {...field("name")} autoComplete="off" />
            {errorText("name")}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="lead-email" className="text-sm font-semibold">
                Email
              </label>
              <Input id="lead-email" type="email" {...field("email")} autoComplete="off" />
              {errorText("email")}
            </div>
            <div>
              <label htmlFor="lead-phone" className="text-sm font-semibold">
                Phone
              </label>
              <Input id="lead-phone" type="tel" {...field("phone")} autoComplete="off" />
              {errorText("phone")}
            </div>
          </div>
          <div>
            <label htmlFor="lead-course" className="text-sm font-semibold">
              Course of interest
            </label>
            <select id="lead-course" className={selectClass} {...field("course_interest_id")}>
              <option value="">Not specified</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="lead-source" className="text-sm font-semibold">
                Source
              </label>
              <select id="lead-source" className={selectClass} {...field("source_id")}>
                <option value="">Not specified</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="lead-priority" className="text-sm font-semibold">
                Priority
              </label>
              <select
                id="lead-priority"
                className={`${selectClass} capitalize`}
                {...field("priority")}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="lead-notes" className="text-sm font-semibold">
              Notes
            </label>
            <Textarea id="lead-notes" rows={3} {...field("notes")} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-lead-form"
            disabled={create.isPending}
            className="gap-2"
          >
            {create.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Create lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeadDetailDialog({
  lead,
  onOpenChange,
}: Readonly<{ lead: Lead | null; onOpenChange: (open: boolean) => void }>) {
  const queryClient = useQueryClient();
  const leadId = lead?.id ?? "";
  const [note, setNote] = useState("");
  const [followup, setFollowup] = useState<{ type: LeadFollowup["type"]; when: string }>({
    type: "call",
    when: "",
  });

  const followups = useQuery({
    queryKey: ["lead-followups", leadId],
    queryFn: async () => unwrap(await crmService.getLeadFollowups(leadId)),
    enabled: !!lead,
  });
  const notes = useQuery({
    queryKey: ["lead-notes", leadId],
    queryFn: async () => unwrap(await crmService.getLeadNotes(leadId)),
    enabled: !!lead,
  });

  const refreshLists = () => void queryClient.invalidateQueries({ queryKey: ["counsellor-leads"] });

  const status = useMutation({
    mutationFn: async (next: LeadStatus) => unwrap(await crmService.changeLeadStatus(leadId, next)),
    onSuccess: (updated) => {
      toast.success(`Status set to ${statusLabel(updated.status)}.`);
      refreshLists();
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Failed to update status."),
  });
  const addNote = useMutation({
    mutationFn: async () => unwrap(await crmService.addLeadNote(leadId, note.trim())),
    onSuccess: () => {
      setNote("");
      toast.success("Note added.");
      void notes.refetch();
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Failed to add note."),
  });
  const schedule = useMutation({
    mutationFn: async () => {
      const { data } = await getSupabaseClientOrThrow().auth.getUser();
      if (!data.user) throw new Error("Not signed in");
      return unwrap(
        await crmService.createFollowup({
          lead_id: leadId,
          assigned_to: data.user.id,
          type: followup.type,
          scheduled_at: new Date(followup.when).toISOString(),
        }),
      );
    },
    onSuccess: () => {
      setFollowup({ type: "call", when: "" });
      toast.success("Follow-up scheduled.");
      void followups.refetch();
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Failed to schedule follow-up."),
  });
  const complete = useMutation({
    mutationFn: async (id: string) => unwrap(await crmService.completeFollowup(id)),
    onSuccess: () => {
      toast.success("Follow-up completed.");
      void followups.refetch();
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Failed to complete follow-up."),
  });

  const whenValid = !!followup.when;
  const submitFollowup = () => {
    if (new Date(followup.when).getTime() < Date.now() - 60_000) {
      toast.error("Choose a date and time in the future.");
      return;
    }
    schedule.mutate();
  };

  return (
    <Dialog open={!!lead} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        {lead && (
          <>
            <DialogHeader>
              <DialogTitle>{lead.name}</DialogTitle>
              <DialogDescription>
                {[lead.email, lead.phone].filter(Boolean).join(" · ") || "No contact details"}
                {lead.course?.title ? ` · Interested in ${lead.course.title}` : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6">
              <div className="max-w-xs">
                <label htmlFor="lead-status" className="text-sm font-semibold">
                  Counselling status
                </label>
                <select
                  id="lead-status"
                  className={selectClass}
                  value={lead.status}
                  disabled={status.isPending}
                  onChange={(e) => status.mutate(e.target.value as LeadStatus)}
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <section aria-labelledby="followups-heading">
                <h3
                  id="followups-heading"
                  className="text-muted-foreground text-sm font-black tracking-wide uppercase"
                >
                  Follow-ups
                </h3>
                <form
                  className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (whenValid) submitFollowup();
                  }}
                >
                  <div className="sm:w-36">
                    <label htmlFor="fu-type" className="text-xs font-semibold">
                      Type
                    </label>
                    <select
                      id="fu-type"
                      className={`${selectClass} capitalize`}
                      value={followup.type}
                      onChange={(e) =>
                        setFollowup((f) => ({ ...f, type: e.target.value as LeadFollowup["type"] }))
                      }
                    >
                      {FOLLOWUP_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label htmlFor="fu-when" className="text-xs font-semibold">
                      When
                    </label>
                    <Input
                      id="fu-when"
                      type="datetime-local"
                      value={followup.when}
                      onChange={(e) => setFollowup((f) => ({ ...f, when: e.target.value }))}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!whenValid || schedule.isPending}
                    className="gap-2"
                  >
                    <CalendarClock className="size-4" aria-hidden="true" /> Schedule
                  </Button>
                </form>
                <ul className="divide-border border-border mt-3 divide-y rounded-md border">
                  {followups.isLoading && (
                    <li className="p-3">
                      <Skeleton className="h-5 w-full" />
                    </li>
                  )}
                  {followups.isError && (
                    <li className="text-destructive p-3 text-sm">Couldn&apos;t load follow-ups.</li>
                  )}
                  {!followups.isLoading && (followups.data ?? []).length === 0 && (
                    <li className="text-muted-foreground p-3 text-sm">No follow-ups scheduled.</li>
                  )}
                  {(followups.data ?? []).map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                      <span>
                        <span className="font-semibold capitalize">{f.type}</span>{" "}
                        <span className="text-muted-foreground">
                          {new Date(f.scheduled_at).toLocaleString()}
                        </span>
                      </span>
                      {f.status === "completed" ? (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="size-3" aria-hidden="true" />
                          Completed
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => complete.mutate(f.id)}
                          disabled={complete.isPending}
                        >
                          Mark done
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="notes-heading">
                <h3
                  id="notes-heading"
                  className="text-muted-foreground text-sm font-black tracking-wide uppercase"
                >
                  Notes
                </h3>
                <form
                  className="mt-2 flex flex-col gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (note.trim()) addNote.mutate();
                  }}
                >
                  <label htmlFor="lead-note" className="sr-only">
                    Add a note
                  </label>
                  <Textarea
                    id="lead-note"
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a counselling note…"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="self-end"
                    disabled={!note.trim() || addNote.isPending}
                  >
                    Add note
                  </Button>
                </form>
                <ul className="mt-3 space-y-2">
                  {(notes.data ?? []).map((n) => (
                    <li key={n.id} className="bg-muted/50 rounded-md p-3 text-sm">
                      <p className="whitespace-pre-wrap">{n.content}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {n.author?.full_name ?? "Unknown"} ·{" "}
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </li>
                  ))}
                  {!notes.isLoading && (notes.data ?? []).length === 0 && (
                    <li className="text-muted-foreground text-sm">No notes yet.</li>
                  )}
                </ul>
              </section>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function CounsellorLeadsPage() {
  usePageMeta("Leads");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);

  const leads = useQuery({
    queryKey: ["counsellor-leads", search, statusFilter, page],
    queryFn: async () =>
      unwrap(
        await crmService.listLeads({ search, status: statusFilter, page, pageSize: PAGE_SIZE }),
      ),
    placeholderData: (prev) => prev,
  });
  const totalPages = Math.max(1, Math.ceil((leads.data?.count ?? 0) / PAGE_SIZE));
  // Keep the open detail dialog in sync with refreshed list data (e.g. after a status change).
  const selectedLive = selected
    ? (leads.data?.data.find((l) => l.id === selected.id) ?? selected)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-black">Leads</h1>
          <p className="text-muted-foreground text-sm">
            Track prospective learners, schedule follow-ups and record counselling notes.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus className="size-4" aria-hidden="true" />
          New lead
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <label htmlFor="lead-search" className="sr-only">
            Search leads
          </label>
          <Input
            id="lead-search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, email or phone…"
            className="pl-9"
          />
        </div>
        <div className="sm:w-48">
          <label htmlFor="lead-status-filter" className="sr-only">
            Filter by status
          </label>
          <select
            id="lead-status-filter"
            className={selectClass}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as LeadStatus | "all");
              setPage(1);
            }}
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {leads.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : leads.isError ? (
        <div className="border-destructive/30 bg-destructive/5 rounded-lg border p-6 text-sm">
          <p className="text-destructive font-semibold">
            Couldn&apos;t load leads:{" "}
            {leads.error instanceof Error ? leads.error.message : "unknown error"}
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void leads.refetch()}>
            Try again
          </Button>
        </div>
      ) : (leads.data?.data.length ?? 0) === 0 ? (
        <EmptyState
          icon={<Target className="size-8" aria-hidden="true" />}
          title={search || statusFilter !== "all" ? "No leads match your filters" : "No leads yet"}
          description={
            search || statusFilter !== "all"
              ? "Try a different search or status."
              : "Create your first lead to start tracking prospective learners."
          }
          primaryAction={
            <Button onClick={() => setCreating(true)} className="gap-2">
              <Plus className="size-4" aria-hidden="true" />
              New lead
            </Button>
          }
        />
      ) : (
        <>
          <div className="border-border bg-card overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-border bg-muted/40 text-muted-foreground border-b text-left text-xs font-bold tracking-wide uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Lead
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Course of interest
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Priority
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Created
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {leads.data!.data.map((lead) => (
                  <tr key={lead.id}>
                    <td className="px-4 py-3">
                      <p className="text-foreground font-semibold">{lead.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {lead.email ?? lead.phone ?? "—"}
                      </p>
                    </td>
                    <td className="text-muted-foreground px-4 py-3">{lead.course?.title ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{statusLabel(lead.status)}</Badge>
                    </td>
                    <td className="text-muted-foreground px-4 py-3 capitalize">{lead.priority}</td>
                    <td className="text-muted-foreground px-4 py-3">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelected(lead)}
                        aria-label={`Open lead ${lead.name}`}
                      >
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-muted-foreground flex items-center justify-between text-sm">
            <span aria-live="polite">
              {leads.data!.count} lead{leads.data!.count === 1 ? "" : "s"}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Prev
                </Button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      <CreateLeadDialog open={creating} onOpenChange={setCreating} />
      <LeadDetailDialog
        lead={selectedLive}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
