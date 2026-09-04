import { useMemo, useState } from "react";
import { X, Plus, KeyRound, Ban, RotateCcw, Trash2, CheckCircle2, Lock, Unlock, LogOut } from "lucide-react";
import { toast } from "sonner";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import type { ColumnDef } from "@tanstack/react-table";
import {
  useAdminCounsellors,
  useCounsellorMutations,
  useCounsellorLoginHistory,
  useCounsellorActiveSessions,
} from "@/hooks/admin/useAdminCounsellors";
import { DataTable } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import type { Counsellor, CreateCounsellorResult } from "@/services/counsellors.service";
import { isAppError } from "@/lib/errors";
import { getNextTabIndex } from "@/lib/a11y-tabs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CounsellorFormState = Partial<Counsellor> & {
  password?: string;
};

export default function AdminCounsellorsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "locked">("all");
  const [showDeleted, setShowDeleted] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [selected, setSelected] = useState<CounsellorFormState | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("Personal");
  const [createdCredentials, setCreatedCredentials] = useState<CreateCounsellorResult | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [lockReasonInput, setLockReasonInput] = useState("");
  const [newEmailInput, setNewEmailInput] = useState("");

  const { data: counsellorsData, isLoading } = useAdminCounsellors({
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    includeDeleted: showDeleted,
    page,
    pageSize: 50,
  });
  const counsellors = useMemo(() => counsellorsData?.data ?? [], [counsellorsData]);

  const mutations = useCounsellorMutations();

  const securityId = selected?.id;
  const { data: loginHistory } = useCounsellorLoginHistory(securityId, activeTab === "Security");
  const { data: activeSessions } = useCounsellorActiveSessions(securityId, activeTab === "Security");

  const handleRowClick = (c: Counsellor) => {
    setSelected(c);
    setActiveTab("Personal");
    setNameError(null);
    setEmailError(null);
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setSelected({ full_name: "", bio: "" });
    setActiveTab("Personal");
    setNameError(null);
    setEmailError(null);
    setEditorOpen(true);
  };

  const handleForceReset = (id: string, name: string | undefined) => {
    mutations.forcePasswordChange.mutate(id, {
      onSuccess: () => toast.success(`${name ?? "This counsellor"} will be required to set a new password at next login.`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to force a password reset."),
    });
  };

  const handleSetPassword = (id: string, name: string | undefined) => {
    if (newPasswordInput.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    mutations.setPassword.mutate(
      { id, password: newPasswordInput },
      {
        onSuccess: () => {
          toast.success(`Password updated for ${name ?? "this counsellor"}. Share it with them directly — it will not be shown again.`);
          setNewPasswordInput("");
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to set password."),
      }
    );
  };

  const handleChangeEmail = (id: string, name: string | undefined) => {
    const trimmed = newEmailInput.trim();
    if (!trimmed || !trimmed.includes("@")) {
      toast.error("Enter a valid email address.");
      return;
    }
    if (!window.confirm(`Change ${name ?? "this counsellor"}'s login email to ${trimmed}? They'll use it to sign in immediately — no confirmation email is sent.`)) return;
    mutations.changeEmail.mutate(
      { id, newEmail: trimmed },
      {
        onSuccess: () => {
          toast.success(`Login email updated to ${trimmed}.`);
          setNewEmailInput("");
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to change email."),
      }
    );
  };

  const handleForceLogout = (id: string, name: string | undefined) => {
    if (!window.confirm(`Sign ${name ?? "this counsellor"} out of every active session immediately?`)) return;
    mutations.forceLogout.mutate(id, {
      onSuccess: () => toast.success(`${name ?? "Counsellor"} has been signed out everywhere.`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to force logout."),
    });
  };

  const handleToggleLock = (c: Counsellor) => {
    if (!c.isActive) {
      mutations.unlock.mutate(c.id, {
        onSuccess: () => toast.success(`${c.full_name ?? "Counsellor"} account unlocked.`),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to unlock account."),
      });
    } else {
      if (!window.confirm(`Lock ${c.full_name ?? "this counsellor"}? They will be signed out immediately and unable to log in.`)) return;
      mutations.lock.mutate(
        { id: c.id, reason: lockReasonInput || undefined },
        {
          onSuccess: () => {
            toast.success(`${c.full_name ?? "Counsellor"} account locked.`);
            setLockReasonInput("");
          },
          onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to lock account."),
        }
      );
    }
  };

  const handleSoftDelete = (c: Counsellor) => {
    if (!window.confirm(`Delete ${c.full_name ?? "this counsellor"}? Their account and history are kept and can be restored later.`)) return;
    mutations.softDelete.mutate(c.id, {
      onSuccess: () => toast.success(`${c.full_name ?? "Counsellor"} deleted. Restore anytime from "Show deleted".`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete counsellor."),
    });
  };

  const handleRestore = (c: Counsellor) => {
    mutations.restore.mutate(c.id, {
      onSuccess: () => toast.success(`${c.full_name ?? "Counsellor"} restored.`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to restore counsellor."),
    });
  };

  const saveCounsellor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;

    const trimmedName = selected.full_name?.trim() ?? "";
    const trimmedEmail = selected.email?.trim() ?? "";
    let hasError = false;
    if (!trimmedName) {
      setNameError("Full name is required.");
      hasError = true;
    } else {
      setNameError(null);
    }
    if (!selected.id) {
      if (!trimmedEmail || !EMAIL_PATTERN.test(trimmedEmail)) {
        setEmailError("Enter a valid email address.");
        hasError = true;
      } else {
        setEmailError(null);
      }
    }
    if (hasError) {
      setActiveTab("Personal");
      return;
    }

    if (selected.id) {
      mutations.update.mutate(
        {
          id: selected.id,
          input: {
            name: trimmedName,
            phone: selected.phone ?? undefined,
            username: selected.username,
            bio: selected.bio ?? undefined,
            city: selected.city ?? undefined,
            linkedin_url: selected.linkedin_url ?? undefined,
          },
        },
        {
          onSuccess: () => {
            toast.success(`Counsellor "${trimmedName}" records updated.`);
            setEditorOpen(false);
          },
          onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
        }
      );
    } else {
      mutations.create.mutate(
        { name: trimmedName, email: trimmedEmail, phone: selected.phone ?? undefined, bio: selected.bio ?? undefined, password: selected.password },
        {
          onSuccess: (result) => {
            toast.success(`Counsellor "${trimmedName}" added successfully.`);
            setEditorOpen(false);
            setCreatedCredentials(result);
          },
          onError: (err) => {
            if (isAppError(err) && err.code === "CONFLICT") {
              toast.error("An account already exists with this email address.");
              setEmailError("An account already exists with this email address.");
              setActiveTab("Personal");
              return;
            }
            toast.error(err instanceof Error ? err.message : "Unable to save changes. Please check your connection and try again.");
          },
        }
      );
    }
  };

  const columns = useMemo<ColumnDef<Counsellor>[]>(
    () => [
      {
        id: "name",
        accessorFn: (row) => row.full_name ?? "",
        header: "Counsellor",
        cell: ({ row }) => {
          const c = row.original;
          return (
            <button onClick={() => handleRowClick(c)} className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
              <img
                src={c.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.full_name ?? "?")}`}
                alt=""
                className="size-9 shrink-0 rounded-xl bg-muted object-cover"
              />
              <div className="min-w-0">
                <p className="truncate font-bold text-foreground">{c.full_name}</p>
                <p className="truncate text-[11px] font-semibold text-muted-foreground">{c.email}</p>
              </div>
            </button>
          );
        },
      },
      {
        id: "phone",
        header: "Phone",
        cell: ({ row }) => <span className="text-sm text-foreground/80 font-medium">{row.original.phone || "—"}</span>,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const c = row.original;
          if (c.deleted_at) return <Badge variant="destructive" className="capitalize">Deleted</Badge>;
          return (
            <Badge variant={c.isActive ? "success" : "muted"} className="capitalize">
              {c.isActive ? "active" : "locked"}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => void handleForceReset(c.id, c.full_name ?? undefined)}
                title="Force password reset at next login"
                aria-label={`Force password reset for ${c.full_name ?? "counsellor"}`}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <KeyRound className="size-4" aria-hidden="true" />
              </button>
              {c.deleted_at ? (
                <button
                  onClick={() => void handleRestore(c)}
                  title="Restore counsellor"
                  aria-label={`Restore ${c.full_name ?? "counsellor"}`}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => void handleToggleLock(c)}
                    title={c.isActive ? "Lock counsellor" : "Unlock counsellor"}
                    aria-label={`${c.isActive ? "Lock" : "Unlock"} ${c.full_name ?? "counsellor"}`}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-amber-50 hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {c.isActive ? <Ban className="size-4" aria-hidden="true" /> : <CheckCircle2 className="size-4" aria-hidden="true" />}
                  </button>
                  <button
                    onClick={() => void handleSoftDelete(c)}
                    title="Delete counsellor"
                    aria-label={`Delete ${c.full_name ?? "counsellor"}`}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers close over stable mutation refs only; c is passed as a call argument
    []
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Counsellors</h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Manage counsellor accounts, student assignments, and operational access.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground shadow-lg shadow-primary/15 hover:bg-primary/90 transition"
        >
          <Plus className="size-4" aria-hidden="true" /> Add Counsellor
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="admin-counsellor-search" className="sr-only">Search counsellors by name, email, or username</label>
        <input
          id="admin-counsellor-search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search counsellors by name, email, username..."
          className="h-10 w-full max-w-sm rounded-xl border border-border bg-card px-3.5 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
        />
        <label htmlFor="admin-counsellor-status-filter" className="sr-only">Filter by status</label>
        <select
          id="admin-counsellor-status-filter"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }}
          className="h-10 rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="locked">Locked</option>
        </select>
        <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground">
          <input type="checkbox" checked={showDeleted} onChange={(e) => { setShowDeleted(e.target.checked); setPage(1); }} />
          Show deleted
        </label>
      </div>

      <div aria-live="polite" aria-atomic="true">
        <DataTable
          columns={columns}
          data={counsellors}
          exportFilename="counsellors_export"
          isLoading={isLoading}
          emptyState={{
            title: search || statusFilter !== "all" ? "No counsellors match your search." : "No counsellors found",
            description: "Add a counsellor account to get started, or adjust your search and filters.",
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground" aria-live="polite">
          Page {page} of {counsellorsData?.totalPages || 1}
        </p>
        <div className="flex gap-2">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50">Prev</button>
          <button disabled={page >= (counsellorsData?.totalPages || 1)} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50">Next</button>
        </div>
      </div>

      {/* Editor Drawer */}
      <DialogPrimitive.Root open={editorOpen && !!selected} onOpenChange={setEditorOpen}>
        <AnimatePresence>
          {editorOpen && selected && (
            <DialogPrimitive.Portal forceMount>
              <DialogPrimitive.Overlay asChild forceMount>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-xs" />
              </DialogPrimitive.Overlay>
              <DialogPrimitive.Content asChild forceMount aria-describedby={undefined}>
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 220 }}
                  className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-2xl flex-col border-l border-border bg-card shadow-2xl outline-none"
                >
                  <div className="flex items-center justify-between border-b border-border px-6 py-5">
                    <div>
                      <DialogPrimitive.Title asChild>
                        <h3 className="text-lg font-black text-foreground">{selected.id ? "Edit Counsellor" : "Add New Counsellor"}</h3>
                      </DialogPrimitive.Title>
                      <p className="text-xs font-semibold text-muted-foreground">
                        {selected.id ? "Update this counsellor's profile and account settings." : "Create a counsellor account and configure their professional profile."}
                      </p>
                    </div>
                    <DialogPrimitive.Close asChild>
                      <button className="rounded-xl p-2 text-muted-foreground hover:bg-muted" aria-label="Close">
                        <X className="size-5" aria-hidden="true" />
                      </button>
                    </DialogPrimitive.Close>
                  </div>

                  {(() => {
                    const editorTabs = ["Personal", "Professional", "Account", ...(selected.id ? ["Security"] : [])];
                    return (
                      <div role="tablist" aria-label="Counsellor editor sections" className="flex overflow-x-auto border-b border-border px-6">
                        {editorTabs.map((tab, i) => (
                          <button
                            key={tab}
                            type="button"
                            role="tab"
                            id={`counsellor-editor-tab-${tab}`}
                            aria-controls="counsellor-form"
                            aria-selected={activeTab === tab}
                            tabIndex={activeTab === tab ? 0 : -1}
                            onClick={() => setActiveTab(tab)}
                            onKeyDown={(e) => {
                              const nextIndex = getNextTabIndex(i, e.key, editorTabs.length);
                              const nextTab = nextIndex === null ? undefined : editorTabs[nextIndex];
                              if (nextTab) { e.preventDefault(); setActiveTab(nextTab); }
                            }}
                            className={[
                              "shrink-0 py-3.5 px-4 text-xs font-black border-b-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
                            ].join(" ")}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    );
                  })()}

                  <form id="counsellor-form" role="tabpanel" aria-labelledby={`counsellor-editor-tab-${activeTab}`} onSubmit={saveCounsellor} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {activeTab === "Personal" && (
                      <div className="space-y-5">
                        {(nameError || emailError) && (
                          <p role="alert" className="rounded-lg bg-destructive-text/10 px-3.5 py-2.5 text-xs font-semibold text-destructive-text">
                            {[nameError, emailError].filter(Boolean).join(" ")}
                          </p>
                        )}
                        <div className="space-y-1">
                          <label htmlFor="counsellor-name-input" className="text-xs font-black text-foreground">Full Name</label>
                          <input
                            id="counsellor-name-input"
                            value={selected.full_name || ""}
                            onChange={(e) => { setSelected({ ...selected, full_name: e.target.value }); if (nameError) setNameError(null); }}
                            aria-invalid={!!nameError}
                            className="w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm outline-none focus:border-primary"
                            placeholder="Jane Doe"
                          />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="counsellor-email-input" className="text-xs font-black text-foreground">Email Address</label>
                          <input
                            id="counsellor-email-input"
                            type="email"
                            value={selected.email || ""}
                            onChange={(e) => { setSelected({ ...selected, email: e.target.value }); if (emailError) setEmailError(null); }}
                            disabled={!!selected.id}
                            aria-invalid={!!emailError}
                            className="w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm outline-none focus:border-primary disabled:opacity-60"
                            placeholder="jane@example.com"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-black text-foreground">Phone Number</label>
                          <input
                            type="tel"
                            value={selected.phone || ""}
                            onChange={(e) => setSelected({ ...selected, phone: e.target.value })}
                            className="w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm outline-none focus:border-primary"
                            placeholder="+1 (555) 000-0000"
                          />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="counsellor-username-input" className="text-xs font-black text-foreground">Username</label>
                          <input
                            id="counsellor-username-input"
                            value={selected.username || ""}
                            onChange={(e) => setSelected({ ...selected, username: e.target.value })}
                            className="w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm outline-none focus:border-primary"
                            placeholder="jane-doe"
                          />
                        </div>
                        {!!selected.id && (
                          <p className="text-[10px] font-bold text-muted-foreground">
                            To change the login email, use the <span className="font-black text-foreground">Security</span> tab.
                          </p>
                        )}
                      </div>
                    )}

                    {activeTab === "Professional" && (
                      <div className="space-y-5">
                        <div className="space-y-1">
                          <label className="text-xs font-black text-foreground">Bio / Designation</label>
                          <textarea
                            value={selected.bio || ""}
                            onChange={(e) => setSelected({ ...selected, bio: e.target.value })}
                            rows={4}
                            className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                            placeholder="Senior Admissions Counsellor"
                          />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-xs font-black text-foreground">City</label>
                            <input
                              value={selected.city || ""}
                              onChange={(e) => setSelected({ ...selected, city: e.target.value })}
                              className="w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm outline-none focus:border-primary"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-black text-foreground">LinkedIn</label>
                            <input
                              value={selected.linkedin_url || ""}
                              onChange={(e) => setSelected({ ...selected, linkedin_url: e.target.value })}
                              className="w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm outline-none focus:border-primary"
                              placeholder="https://linkedin.com/in/..."
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "Account" && (
                      <div className="space-y-5">
                        {!selected.id && (
                          <div className="space-y-1">
                            <label className="text-xs font-black text-foreground">Temporary Password (Optional)</label>
                            <input
                              type="password"
                              value={selected.password || ""}
                              onChange={(e) => setSelected({ ...selected, password: e.target.value })}
                              className="w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm outline-none focus:border-primary"
                              placeholder="Leave blank to auto-generate"
                            />
                            <p className="text-[10px] font-bold text-muted-foreground mt-1">
                              No email provider is configured yet — credentials must be shared with the counsellor directly after creation.
                            </p>
                          </div>
                        )}
                        {selected.id && (
                          <p className="text-xs font-semibold text-muted-foreground">
                            Password, session, and lock controls have moved to the <span className="font-black text-foreground">Security</span> tab.
                          </p>
                        )}
                        {selected.id && (
                          <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-red-700 mb-1">Danger Zone</h4>
                            <p className="text-xs font-semibold text-red-700/70 mb-4">
                              {(selected as Counsellor).deleted_at
                                ? "This counsellor account is deactivated. Restore it to allow them to sign in again."
                                : "Deleting keeps their account and history intact and can be restored later."}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {(selected as Counsellor).deleted_at ? (
                                <button
                                  type="button"
                                  onClick={() => void handleRestore(selected as Counsellor)}
                                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-emerald-700"
                                >
                                  <RotateCcw className="size-3.5" aria-hidden="true" /> Restore Counsellor
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => void handleSoftDelete(selected as Counsellor)}
                                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-red-700"
                                >
                                  <Trash2 className="size-3.5" aria-hidden="true" /> Delete Counsellor
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "Security" && selected.id && (
                      <div className="space-y-5">
                        <div className="rounded-xl border border-border p-4">
                          <h4 className="text-xs font-black uppercase tracking-wider text-foreground mb-1">Set New Password</h4>
                          <p className="text-xs font-semibold text-muted-foreground mb-3">
                            Sets the counsellor's password directly. No approval, OTP, or reset email is sent — share it with them yourself.
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
                              onClick={() => handleSetPassword(selected.id!, selected.full_name ?? undefined)}
                              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
                            >
                              <KeyRound className="size-3.5" aria-hidden="true" /> Set Password
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleForceReset(selected.id!, selected.full_name ?? undefined)}
                            className="mt-3 flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-foreground hover:bg-accent/10"
                          >
                            <KeyRound className="size-3.5" aria-hidden="true" /> Force Password Change on Next Login
                          </button>
                        </div>

                        <div className="rounded-xl border border-border p-4">
                          <h4 className="text-xs font-black uppercase tracking-wider text-foreground mb-1">Change Login Email</h4>
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
                              onClick={() => handleChangeEmail(selected.id!, selected.full_name ?? undefined)}
                              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
                            >
                              <KeyRound className="size-3.5" aria-hidden="true" /> Change Email
                            </button>
                          </div>
                        </div>

                        <div className="rounded-xl border border-border p-4">
                          <h4 className="text-xs font-black uppercase tracking-wider text-foreground mb-1">Sessions</h4>
                          <button
                            type="button"
                            onClick={() => handleForceLogout(selected.id!, selected.full_name ?? undefined)}
                            className="flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-800 hover:bg-amber-200"
                          >
                            <LogOut className="size-3.5" aria-hidden="true" /> Force Logout Everywhere
                          </button>
                          <div className="mt-3 space-y-1.5">
                            {(activeSessions ?? []).length === 0 ? (
                              <p className="text-[11px] font-semibold text-muted-foreground">No active sessions recorded.</p>
                            ) : (
                              activeSessions!.map((s) => (
                                <div key={s.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-1.5 text-[11px] font-semibold text-foreground">
                                  <span>{s.device_info || s.user_agent || "Unknown device"}</span>
                                  <span className="text-muted-foreground">{new Date(s.started_at).toLocaleString()}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className={["rounded-xl border p-4", !(selected as Counsellor).isActive ? "border-red-200 bg-red-50/50" : "border-border"].join(" ")}>
                          <h4 className={["text-xs font-black uppercase tracking-wider mb-1", !(selected as Counsellor).isActive ? "text-red-700" : "text-foreground"].join(" ")}>
                            {!(selected as Counsellor).isActive ? "Account Locked" : "Lock Account"}
                          </h4>
                          <p className={["text-xs font-semibold mb-3", !(selected as Counsellor).isActive ? "text-red-700/70" : "text-muted-foreground"].join(" ")}>
                            {!(selected as Counsellor).isActive
                              ? "This account is locked and cannot log in."
                              : "Blocks the counsellor from logging in. Does not affect their data."}
                          </p>
                          {(selected as Counsellor).isActive && (
                            <input
                              value={lockReasonInput}
                              onChange={(e) => setLockReasonInput(e.target.value)}
                              placeholder="Reason (optional)"
                              className="mb-2 h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm outline-none focus:border-primary"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleLock(selected as Counsellor)}
                            className={[
                              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider",
                              !(selected as Counsellor).isActive ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-red-600 text-white hover:bg-red-700",
                            ].join(" ")}
                          >
                            {!(selected as Counsellor).isActive ? <Unlock className="size-3.5" aria-hidden="true" /> : <Lock className="size-3.5" aria-hidden="true" />}
                            {!(selected as Counsellor).isActive ? "Unlock Account" : "Lock Account"}
                          </button>
                        </div>

                        <div className="rounded-xl border border-border p-4">
                          <h4 className="text-xs font-black uppercase tracking-wider text-foreground mb-3">Login History</h4>
                          <div className="space-y-1.5">
                            {(loginHistory ?? []).length === 0 ? (
                              <p className="text-[11px] font-semibold text-muted-foreground">No login history recorded yet.</p>
                            ) : (
                              loginHistory!.map((h) => (
                                <div key={h.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-1.5 text-[11px] font-semibold text-foreground">
                                  <span className="truncate">{h.user_agent || "Unknown device"}</span>
                                  <span className="text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </form>

                  <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                    <DialogPrimitive.Close asChild>
                      <button type="button" className="h-11 rounded-xl px-5 text-xs font-black text-muted-foreground hover:bg-muted">
                        Cancel
                      </button>
                    </DialogPrimitive.Close>
                    <button
                      type="submit"
                      form="counsellor-form"
                      disabled={mutations.create.isPending || mutations.update.isPending}
                      className="h-11 rounded-xl bg-primary px-6 text-xs font-black text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {mutations.create.isPending || mutations.update.isPending ? "Saving..." : selected.id ? "Save Changes" : "Create Counsellor"}
                    </button>
                  </div>
                </motion.div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          )}
        </AnimatePresence>
      </DialogPrimitive.Root>

      <DialogPrimitive.Root open={!!createdCredentials} onOpenChange={(open) => { if (!open) setCreatedCredentials(null); }}>
        <AnimatePresence>
          {createdCredentials && (
            <DialogPrimitive.Portal forceMount>
              <DialogPrimitive.Overlay asChild forceMount>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" />
              </DialogPrimitive.Overlay>
              <DialogPrimitive.Content asChild forceMount aria-describedby={undefined}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-2xl outline-none"
                >
                  <DialogPrimitive.Title asChild>
                    <h2 className="text-lg font-black text-foreground">Counsellor Created Successfully</h2>
                  </DialogPrimitive.Title>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    There is no email delivery configured yet — share these credentials with{" "}
                    <span className="font-bold text-foreground">{createdCredentials.fullName}</span> directly.{" "}
                    <span className="font-bold text-foreground">Save these credentials now — the temporary password will not be shown again.</span>
                  </p>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Email</label>
                      <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2.5">
                        <span className="flex-1 truncate text-sm font-semibold text-foreground">{createdCredentials.email}</span>
                        <button
                          type="button"
                          onClick={() => { void navigator.clipboard.writeText(createdCredentials.email); toast.success("Email copied"); }}
                          aria-label="Copy email address"
                          className="text-xs font-bold text-primary hover:underline"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Temporary Password</label>
                      <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2.5">
                        <span className="flex-1 truncate font-mono text-sm font-semibold text-foreground">{createdCredentials.temporaryPassword}</span>
                        <button
                          type="button"
                          onClick={() => { void navigator.clipboard.writeText(createdCredentials.temporaryPassword); toast.success("Password copied"); }}
                          aria-label="Copy temporary password"
                          className="text-xs font-bold text-primary hover:underline"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                  <DialogPrimitive.Close asChild>
                    <button type="button" className="mt-6 h-11 w-full rounded-xl bg-primary text-xs font-black text-primary-foreground hover:bg-primary/90">
                      Done
                    </button>
                  </DialogPrimitive.Close>
                </motion.div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          )}
        </AnimatePresence>
      </DialogPrimitive.Root>
    </div>
  );
}
