import { useState } from "react";
import {
  Users, TrendingUp, CheckCircle2, AlertCircle, Plus, Search,
  Phone, Mail, MessageSquare, Calendar, Eye,
  KanbanSquare, ClipboardList, BarChart3, X,
  GraduationCap
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { crmService, type Lead, type LeadStatus, type Task } from "@/services/crm.service";
import { GsapReveal } from "@/components/motion/gsap-reveal";
import { DataTable } from "@/components/common/DataTable";

type CRMTab = "dashboard" | "leads" | "pipeline" | "tasks" | "followups";

const STATUS_COLORS: Record<string, string> = {
  new:            "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  contacted:      "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  qualified:      "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  demo_scheduled: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  follow_up:      "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  converted:      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  lost:           "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  closed:         "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  low:    "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high:   "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

// ── Lead Form Modal ──────────────────────────────────────────────────────────
function LeadModal({ lead, onClose }: { lead?: Partial<Lead>; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Lead>>(lead ?? {
    name: "", email: "", phone: "", status: "new", priority: "medium",
  });

  const mutation = useMutation({
    mutationFn: async (data: Partial<Lead>) => {
      const result = lead?.id
        ? await crmService.updateLead(lead.id, data)
        : await crmService.createLead(data);
      if (!result.success) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      toast.success(lead?.id ? "Lead updated" : "Lead created");
      void qc.invalidateQueries({ queryKey: ["crm-leads"] });
      void qc.invalidateQueries({ queryKey: ["crm-metrics"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-lg font-black text-foreground">{lead?.id ? "Edit Lead" : "New Lead"}</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-muted"><X className="size-4" /></button>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted-foreground">Full Name *</label>
              <input
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.name ?? ""}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Rahul Sharma"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted-foreground">Phone</label>
              <input
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.phone ?? ""}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground">Email</label>
            <input
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              type="email"
              value={form.email ?? ""}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="rahul@example.com"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted-foreground">Status</label>
              <select
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.status ?? "new"}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as LeadStatus }))}
              >
                {["new","contacted","qualified","demo_scheduled","follow_up","converted","lost","closed"].map(s => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted-foreground">Priority</label>
              <select
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.priority ?? "medium"}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as Lead["priority"] }))}
              >
                {["low","medium","high","urgent"].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground">Notes</label>
            <textarea
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              value={form.notes ?? ""}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Additional notes about this lead..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-border p-5">
          <button onClick={onClose} className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending || !form.name}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {mutation.isPending ? "Saving…" : lead?.id ? "Update Lead" : "Create Lead"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Dashboard Tab ────────────────────────────────────────────────────────────
function CRMDashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["crm-metrics"],
    queryFn: async () => {
      const r = await crmService.getCRMMetrics();
      if (!r.success) throw r.error;
      return r.data;
    },
  });

  const kpis = metrics ? [
    { label: "Total Leads",      value: metrics.totalLeads,       icon: Users,       color: "text-primary" },
    { label: "New Today",        value: metrics.newLeadsToday,    icon: Plus,        color: "text-emerald-500" },
    { label: "Active Students",  value: metrics.activeStudents,   icon: GraduationCap ?? Users, color: "text-blue-500" },
    { label: "Pending Follow-ups", value: metrics.pendingFollowups, icon: AlertCircle, color: "text-amber-500" },
    { label: "Today's Meetings", value: metrics.todayMeetings,    icon: Calendar,    color: "text-purple-500" },
    { label: "Open Tickets",     value: metrics.openTickets,      icon: MessageSquare, color: "text-red-500" },
    { label: "Conversion Rate",  value: `${metrics.conversionRate}%`, icon: TrendingUp, color: "text-emerald-600" },
  ] : [];

  if (isLoading) return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{kpi.label}</p>
                <Icon className={`size-5 ${kpi.color}`} />
              </div>
              <p className={`mt-3 text-3xl font-black ${kpi.color}`}>{kpi.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Leads Tab ────────────────────────────────────────────────────────────────
function LeadsTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [modalLead, setModalLead] = useState<Partial<Lead> | null | "new">(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["crm-leads", search, statusFilter, page],
    queryFn: async () => {
      const r = await crmService.listLeads({ search: search || undefined, status: statusFilter, page, pageSize: 20 });
      if (!r.success) throw r.error;
      return r.data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      const r = await crmService.changeLeadStatus(id, status);
      if (!r.success) throw r.error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["crm-leads"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const leads = data?.data ?? [];
  const count = data?.count ?? 0;

  const columns: ColumnDef<Lead>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-foreground">{row.original.name}</p>
          {row.original.course && <p className="text-xs text-muted-foreground">{row.original.course.title}</p>}
        </div>
      ),
    },
    {
      id: "contact",
      header: "Contact",
      cell: ({ row }) => (
        <div className="space-y-0.5 text-muted-foreground">
          {row.original.email && <div className="flex items-center gap-1.5 text-xs"><Mail className="size-3" />{row.original.email}</div>}
          {row.original.phone && <div className="flex items-center gap-1.5 text-xs"><Phone className="size-3" />{row.original.phone}</div>}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <select
          className={`rounded-full border-0 px-3 py-1 text-xs font-bold ${STATUS_COLORS[row.original.status] ?? ""} cursor-pointer`}
          value={row.original.status}
          onChange={e => statusMutation.mutate({ id: row.original.id, status: e.target.value as LeadStatus })}
        >
          {["new","contacted","qualified","demo_scheduled","follow_up","converted","lost","closed"].map(s => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => (
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${PRIORITY_COLORS[row.original.priority] ?? ""}`}>
          {row.original.priority}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{new Date(row.original.created_at).toLocaleDateString()}</span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <button onClick={() => setModalLead(row.original)} className="rounded-lg p-2 hover:bg-muted">
          <Eye className="size-4 text-muted-foreground" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-10 w-64 rounded-xl border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Search by name, email, phone…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as LeadStatus | "all"); setPage(1); }}
          >
            <option value="all">All Statuses</option>
            {["new","contacted","qualified","demo_scheduled","follow_up","converted","lost","closed"].map(s => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setModalLead("new")}
          className="flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-4" /> New Lead
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={leads}
            exportFilename="crm_leads"
            hidePagination
          />
          {leads.length === 0 && (
            <p className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
              No leads found. <button className="text-primary underline" onClick={() => setModalLead("new")}>Create your first lead</button>
            </p>
          )}
          {count > 20 && (
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, count)} of {count}</p>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:bg-muted">Prev</button>
                <button disabled={page * 20 >= count} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:bg-muted">Next</button>
              </div>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {modalLead !== null && (
          <LeadModal
            lead={modalLead === "new" ? undefined : modalLead}
            onClose={() => setModalLead(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Pipeline (Kanban) Tab ─────────────────────────────────────────────────────
function PipelineTab() {
  const { data: board, isLoading } = useQuery({
    queryKey: ["crm-pipeline"],
    queryFn: async () => {
      const r = await crmService.getPipelineBoard();
      if (!r.success) throw r.error;
      return r.data;
    },
  });

  if (isLoading) return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;
  if (!board) return <p className="text-muted-foreground">No pipeline found.</p>;

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4" style={{ minWidth: `${board.stages.length * 280}px` }}>
        {board.stages.map(stage => (
          <div key={stage.id} className="w-64 flex-none">
            <div
              className="mb-3 flex items-center justify-between rounded-xl px-3 py-2"
              style={{ background: `${stage.color}22`, borderLeft: `3px solid ${stage.color}` }}
            >
              <span className="text-sm font-black" style={{ color: stage.color }}>{stage.name}</span>
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold dark:bg-black/40">
                {stage.items?.length ?? 0}
              </span>
            </div>
            <div className="space-y-2 min-h-[200px]">
              {(stage.items ?? []).map(item => item.lead && (
                <div key={item.id} className="rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow">
                  <p className="font-semibold text-sm text-foreground">{item.lead.name}</p>
                  {item.lead.email && <p className="text-xs text-muted-foreground mt-0.5">{item.lead.email}</p>}
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${PRIORITY_COLORS[item.lead.priority] ?? ""}`}>
                      {item.lead.priority}
                    </span>
                    {item.lead.budget && (
                      <span className="text-xs font-semibold text-emerald-600">₹{Number(item.lead.budget).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              ))}
              {(stage.items ?? []).length === 0 && (
                <div className="flex h-16 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                  No leads
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tasks Tab ─────────────────────────────────────────────────────────────────
function TasksTab() {
  const [showForm, setShowForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", priority: "medium", status: "pending" });
  const qc = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["crm-tasks"],
    queryFn: async () => {
      const r = await crmService.listTasks();
      if (!r.success) return [];
      return r.data;
    },
  });

  const createTask = useMutation({
    mutationFn: async () => {
      const r = await crmService.createTask(taskForm as Partial<Task>);
      if (!r.success) throw r.error;
    },
    onSuccess: () => {
      toast.success("Task created");
      void qc.invalidateQueries({ queryKey: ["crm-tasks"] });
      setShowForm(false);
      setTaskForm({ title: "", priority: "medium", status: "pending" });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const r = await crmService.updateTask(id, { status: status as Task["status"] });
      if (!r.success) throw r.error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["crm-tasks"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-4" /> New Task
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-2xl border border-primary/30 bg-primary/5 p-5"
          >
            <div className="flex gap-3">
              <input
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Task title…"
                value={taskForm.title}
                onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
              />
              <select
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                value={taskForm.priority}
                onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}
              >
                {["low","medium","high","urgent"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <button
                onClick={() => createTask.mutate()}
                disabled={createTask.isPending || !taskForm.title}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground disabled:opacity-50"
              >
                {createTask.isPending ? "…" : "Add"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">Loading tasks…</div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No tasks yet. Create your first task above.</div>
        ) : (
          <div className="divide-y divide-border">
            {tasks.map(task => (
              <div key={task.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30">
                <button
                  onClick={() => updateTask.mutate({ id: task.id, status: task.status === "completed" ? "pending" : "completed" })}
                  className={`size-5 flex-none rounded-full border-2 flex items-center justify-center transition-colors ${
                    task.status === "completed"
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-border hover:border-primary"
                  }`}
                >
                  {task.status === "completed" && <CheckCircle2 className="size-3 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold ${task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {task.title}
                  </p>
                  {task.due_date && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Due: {new Date(task.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${PRIORITY_COLORS[task.priority] ?? ""}`}>
                  {task.priority}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_COLORS[task.status] ?? ""}`}>
                  {task.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main CRM Page ─────────────────────────────────────────────────────────────
export default function AdminCRMPage() {
  const [activeTab, setActiveTab] = useState<CRMTab>("dashboard");

  const tabs: { id: CRMTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "dashboard", label: "Dashboard",  icon: BarChart3 },
    { id: "leads",     label: "Leads",      icon: Users },
    { id: "pipeline",  label: "Pipeline",   icon: KanbanSquare },
    { id: "tasks",     label: "Tasks",      icon: ClipboardList },
    { id: "followups", label: "Follow-ups", icon: Calendar },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <GsapReveal direction="up" className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary dark:text-cyan-200">
            CRM — Customer Relations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lead management, sales pipeline, tasks, and follow-ups in one place.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 text-xs">
          <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-muted-foreground">Live CRM</span>
        </div>
      </GsapReveal>

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-2xl border border-border bg-card p-1.5">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              ].join(" ")}
            >
              <Icon className="size-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "dashboard" && <CRMDashboard />}
          {activeTab === "leads"     && <LeadsTab />}
          {activeTab === "pipeline"  && <PipelineTab />}
          {activeTab === "tasks"     && <TasksTab />}
          {activeTab === "followups" && (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <Calendar className="mx-auto mb-4 size-12 text-muted-foreground" />
              <h3 className="text-lg font-black text-foreground">Follow-up Calendar</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Manage scheduled follow-up calls, emails, and demos for your leads.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Navigate to the Calendar section for full scheduling.</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
