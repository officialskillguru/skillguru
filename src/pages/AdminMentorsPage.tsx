import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  X,
  Download,
  Plus,
  Star,
  KeyRound,
  Ban,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Lock,
  Unlock,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  useAdminMentors,
  useBulkSetMentorStatus,
  useBulkDeleteMentors,
  useBulkRestoreMentors,
  useBulkNotifyMentors,
  useBulkReassignMentorCourses,
} from "@/hooks/admin/useAdminMentors";
import { useMentorMutations } from "@/hooks/useAdminData";
import { DataTable } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { exportToCSV, exportToExcel, exportToPDF } from "@/utils/export";
import { getExtendedSupabaseClient } from "@/services/_shared";
import { listMentorLoginHistory, listMentorActiveSessions, getUnassignedMentorId } from "@/services/mentors.service";
import type { Mentor, CreateMentorResult } from "@/services/mentors.service";
import { isAppError } from "@/lib/errors";
import { MentorCRMPanel, MentorCoursesPanel, MentorPerformancePanel, MentorDocumentsPanel } from "@/components/admin/mentors/MentorCRMPanel";
import { listCourses } from "@/services/courses.service";
import { getNextTabIndex } from "@/lib/a11y-tabs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type MentorFormState = Partial<Mentor> & {
  designation?: string;
  phone?: string;
  timezone?: string;
  onboardingMethod?: "manual" | "invite";
  password?: string;
};

interface MentorRating {
  avg: number;
  count: number;
}

async function fetchLastLogins(mentorIds: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (mentorIds.length === 0) return result;
  const supabase = getExtendedSupabaseClient();
  const { data } = await supabase
    .from("login_history")
    .select("user_id, created_at")
    .in("user_id", mentorIds)
    .order("created_at", { ascending: false });
  for (const row of data ?? []) {
    if (!result.has(row.user_id)) result.set(row.user_id, row.created_at);
  }
  return result;
}

async function fetchMentorRatings(mentorIds: string[]): Promise<Map<string, MentorRating>> {
  const result = new Map<string, MentorRating>();
  if (mentorIds.length === 0) return result;
  const supabase = getExtendedSupabaseClient();

  const { data: courses } = await supabase.from("courses").select("id, mentor_id").in("mentor_id", mentorIds);
  const courseIds = (courses ?? []).map((c) => c.id);
  const courseMentorMap = new Map((courses ?? []).map((c) => [c.id, c.mentor_id]));
  if (courseIds.length === 0) return result;

  const { data: testimonials } = await supabase
    .from("testimonials")
    .select("course_id, rating")
    .in("course_id", courseIds)
    .eq("is_approved", true);

  const sums = new Map<string, { sum: number; count: number }>();
  for (const t of (testimonials ?? []) as { course_id: string; rating: number | null }[]) {
    const mentorId = courseMentorMap.get(t.course_id);
    if (!mentorId || t.rating == null) continue;
    const existing = sums.get(mentorId) ?? { sum: 0, count: 0 };
    existing.sum += t.rating;
    existing.count += 1;
    sums.set(mentorId, existing);
  }
  for (const [id, { sum, count }] of sums) {
    result.set(id, { avg: count > 0 ? sum / count : 0, count });
  }
  return result;
}

export default function AdminMentorsPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [showDeleted, setShowDeleted] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<MentorFormState | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("Personal");
  const editorTabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [createdCredentials, setCreatedCredentials] = useState<CreateMentorResult | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [lockReasonInput, setLockReasonInput] = useState("");
  const [newEmailInput, setNewEmailInput] = useState("");

  const { data: mentorsData, isLoading } = useAdminMentors({
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    includeDeleted: showDeleted,
    page,
    pageSize: 50,
  });
  const mentors = useMemo(() => mentorsData?.data ?? [], [mentorsData]);
  const mentorIds = useMemo(() => mentors.map((m) => m.id), [mentors]);

  const { data: ratings } = useQuery({
    queryKey: ["admin-mentor-ratings", mentorIds],
    queryFn: () => fetchMentorRatings(mentorIds),
    enabled: mentorIds.length > 0,
  });

  const { data: lastLogins } = useQuery({
    queryKey: ["admin-mentor-last-logins", mentorIds],
    queryFn: () => fetchLastLogins(mentorIds),
    enabled: mentorIds.length > 0,
  });

  const mutations = useMentorMutations();
  const bulkSetStatus = useBulkSetMentorStatus();
  const bulkDelete = useBulkDeleteMentors();
  const bulkRestore = useBulkRestoreMentors();
  const bulkNotify = useBulkNotifyMentors();
  const bulkReassignCourses = useBulkReassignMentorCourses();

  const [bulkNotifyOpen, setBulkNotifyOpen] = useState(false);
  const [bulkNotifyTitle, setBulkNotifyTitle] = useState("");
  const [bulkNotifyBody, setBulkNotifyBody] = useState("");
  const [bulkNotifyTargetIds, setBulkNotifyTargetIds] = useState<string[]>([]);

  const [bulkReassignOpen, setBulkReassignOpen] = useState(false);
  const [bulkReassignSearch, setBulkReassignSearch] = useState("");
  const [bulkReassignSelectedCourseIds, setBulkReassignSelectedCourseIds] = useState<Set<string>>(new Set());
  const [bulkReassignTargetMentorId, setBulkReassignTargetMentorId] = useState("");

  const { data: allCourses } = useQuery({
    queryKey: ["admin-all-courses-for-reassign"],
    queryFn: async () => (await listCourses({ pageSize: 500 })).data,
    enabled: bulkReassignOpen,
  });

  const { data: unassignedMentorId } = useQuery({
    queryKey: ["unassigned-mentor-id"],
    queryFn: getUnassignedMentorId,
    enabled: bulkReassignOpen,
    staleTime: Infinity,
  });

  const handleBulkStatus = (ids: string[], status: "active" | "suspended") => {
    if (ids.length === 0) return toast.error("No mentors selected.");
    bulkSetStatus.mutate(
      { mentorIds: ids, status },
      { onSuccess: () => toast.success(`Updated ${ids.length} mentor${ids.length > 1 ? "s" : ""} to ${status}.`) }
    );
  };

  const handleBulkDelete = (ids: string[]) => {
    if (ids.length === 0) return toast.error("No mentors selected.");
    if (!window.confirm(`Delete ${ids.length} mentor${ids.length > 1 ? "s" : ""}? Accounts and history are kept and can be restored later.`)) return;
    bulkDelete.mutate(ids, { onSuccess: () => toast.success(`Deleted ${ids.length} mentor${ids.length > 1 ? "s" : ""}.`) });
  };

  const handleBulkRestore = (ids: string[]) => {
    if (ids.length === 0) return toast.error("No mentors selected.");
    bulkRestore.mutate(ids, { onSuccess: () => toast.success(`Restored ${ids.length} mentor${ids.length > 1 ? "s" : ""}.`) });
  };

  const handleOpenBulkNotify = (ids: string[]) => {
    if (ids.length === 0) return toast.error("No mentors selected.");
    setBulkNotifyTargetIds(ids);
    setBulkNotifyOpen(true);
  };

  const handleSendBulkNotify = () => {
    if (!bulkNotifyTitle.trim() || !bulkNotifyBody.trim()) {
      toast.error("Title and message are required.");
      return;
    }
    bulkNotify.mutate(
      { mentorIds: bulkNotifyTargetIds, title: bulkNotifyTitle.trim(), body: bulkNotifyBody.trim() },
      {
        onSuccess: () => {
          toast.success(`Notification sent to ${bulkNotifyTargetIds.length} mentor${bulkNotifyTargetIds.length > 1 ? "s" : ""}.`);
          setBulkNotifyOpen(false);
          setBulkNotifyTitle("");
          setBulkNotifyBody("");
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to send notifications."),
      }
    );
  };

  const handleBulkReassign = () => {
    const courseIds = Array.from(bulkReassignSelectedCourseIds);
    if (courseIds.length === 0 || !bulkReassignTargetMentorId) {
      toast.error("Select at least one course and a destination mentor.");
      return;
    }
    bulkReassignCourses.mutate(
      { courseIds, toMentorId: bulkReassignTargetMentorId },
      {
        onSuccess: () => {
          toast.success(`Reassigned ${courseIds.length} course${courseIds.length > 1 ? "s" : ""}.`);
          setBulkReassignOpen(false);
          setBulkReassignSelectedCourseIds(new Set());
          setBulkReassignSearch("");
          setBulkReassignTargetMentorId("");
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to reassign courses."),
      }
    );
  };

  const securityMentorId = selectedMentor?.id;
  const { data: loginHistory } = useQuery({
    queryKey: ["admin-mentor-login-history", securityMentorId],
    queryFn: () => listMentorLoginHistory(securityMentorId!),
    enabled: !!securityMentorId && activeTab === "Security",
  });
  const { data: activeSessions } = useQuery({
    queryKey: ["admin-mentor-active-sessions", securityMentorId],
    queryFn: () => listMentorActiveSessions(securityMentorId!),
    enabled: !!securityMentorId && activeTab === "Security",
  });

  const handleRowClick = (mentor: Mentor) => {
    setSelectedMentor(mentor);
    setActiveTab("Personal");
    setNameError(null);
    setEmailError(null);
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setSelectedMentor({ name: "", designation: "Engineering Lead", bio: "" });
    setActiveTab("Personal");
    setNameError(null);
    setEmailError(null);
    setEditorOpen(true);
  };

  const buildExportRows = () =>
    mentors.map((m) => ({
      ID: m.id,
      Name: m.name,
      Designation: m.bio,
      Company: m.headline || "SkillGuru",
      Rating: ratings?.get(m.id)?.avg.toFixed(1) ?? "—",
      Status: m.deleted_at ? "Deleted" : (m.status ?? "active"),
      Locked: m.login_disabled ? "Yes" : "No",
      "Last Login": lastLogins?.get(m.id) ? new Date(lastLogins.get(m.id)!).toLocaleString() : "Never",
    }));

  const handleExport = () => {
    if (mentors.length === 0) return toast.error("No data to export.");
    exportToCSV(buildExportRows(), "mentors_export");
  };

  const handleExportExcel = () => {
    if (mentors.length === 0) return toast.error("No data to export.");
    void exportToExcel(buildExportRows(), "mentors_export");
  };

  const handleExportPDF = () => {
    if (mentors.length === 0) return toast.error("No data to export.");
    void exportToPDF(buildExportRows(), "mentors_export", "Mentors");
  };

  const handleForceReset = (mentorId: string, name: string | undefined) => {
    mutations.forcePasswordChange.mutate(mentorId, {
      onSuccess: () => toast.success(`${name ?? "This mentor"} will be required to set a new password at next login.`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to force a password reset."),
    });
  };

  const handleSetPassword = (mentorId: string, name: string | undefined) => {
    if (newPasswordInput.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    mutations.setPassword.mutate(
      { id: mentorId, password: newPasswordInput },
      {
        onSuccess: () => {
          toast.success(`Password updated for ${name ?? "this mentor"}. Share it with them directly — it will not be shown again.`);
          setNewPasswordInput("");
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to set password."),
      }
    );
  };

  const handleChangeEmail = (mentorId: string, name: string | undefined) => {
    const trimmed = newEmailInput.trim();
    if (!trimmed || !trimmed.includes("@")) {
      toast.error("Enter a valid email address.");
      return;
    }
    if (!window.confirm(`Change ${name ?? "this mentor"}'s login email to ${trimmed}? They'll use it to sign in immediately — no confirmation email is sent.`)) return;
    mutations.changeEmail.mutate(
      { id: mentorId, newEmail: trimmed },
      {
        onSuccess: () => {
          toast.success(`Login email updated to ${trimmed}.`);
          setNewEmailInput("");
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to change email."),
      }
    );
  };

  const handleForceLogout = (mentorId: string, name: string | undefined) => {
    if (!window.confirm(`Sign ${name ?? "this mentor"} out of every active session immediately?`)) return;
    mutations.forceLogout.mutate(mentorId, {
      onSuccess: () => toast.success(`${name ?? "Mentor"} has been signed out everywhere.`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to force logout."),
    });
  };

  const handleToggleLock = (mentor: Mentor) => {
    if (mentor.login_disabled) {
      mutations.unlock.mutate(mentor.id, {
        onSuccess: () => toast.success(`${mentor.name ?? "Mentor"} account unlocked.`),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to unlock account."),
      });
    } else {
      mutations.lock.mutate(
        { id: mentor.id, reason: lockReasonInput || undefined },
        {
          onSuccess: () => {
            toast.success(`${mentor.name ?? "Mentor"} account locked — they will be signed out on their next request.`);
            setLockReasonInput("");
          },
          onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to lock account."),
        }
      );
    }
  };

  const handleToggleStatus = (mentor: Mentor) => {
    const nextStatus = mentor.status === "suspended" ? "active" : "suspended";
    if (nextStatus === "suspended" && !window.confirm(`Suspend ${mentor.name ?? "this mentor"}? They will be signed out of the Mentor Dashboard immediately.`)) {
      return;
    }
    mutations.setStatus.mutate(
      { id: mentor.id, status: nextStatus },
      {
        onSuccess: () => toast.success(nextStatus === "suspended" ? `${mentor.name ?? "Mentor"} suspended.` : `${mentor.name ?? "Mentor"} reactivated.`),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update status."),
      }
    );
  };

  const handleSoftDelete = (mentor: Mentor) => {
    if (!window.confirm(`Delete ${mentor.name ?? "this mentor"}? Their account, courses, and history are kept and can be restored later.`)) return;
    mutations.softDelete.mutate(mentor.id, {
      onSuccess: () => toast.success(`${mentor.name ?? "Mentor"} deleted. Restore anytime from "Show deleted".`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete mentor."),
    });
  };

  const handleRestore = (mentor: Mentor) => {
    mutations.restore.mutate(mentor.id, {
      onSuccess: () => toast.success(`${mentor.name ?? "Mentor"} restored.`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to restore mentor."),
    });
  };

  const saveMentor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentor) return;

    const trimmedName = selectedMentor.name?.trim() ?? "";
    const trimmedEmail = selectedMentor.email?.trim() ?? "";
    let hasError = false;
    if (!trimmedName) {
      setNameError("Full name is required.");
      hasError = true;
    } else {
      setNameError(null);
    }
    if (!trimmedEmail || !EMAIL_PATTERN.test(trimmedEmail)) {
      setEmailError("Enter a valid email address.");
      hasError = true;
    } else {
      setEmailError(null);
    }
    if (hasError) {
      setActiveTab("Personal");
      return;
    }

    if (selectedMentor.id) {
      mutations.update.mutate(
        { id: selectedMentor.id, input: selectedMentor },
        {
          onSuccess: () => {
            toast.success(`Mentor "${selectedMentor.name}" records updated.`);
            setEditorOpen(false);
          },
          onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
        }
      );
    } else {
      const payload = {
        ...selectedMentor,
        timezone: selectedMentor.timezone || "UTC",
        onboardingMethod: selectedMentor.onboardingMethod || "manual",
      };
      mutations.create.mutate(payload, {
        onSuccess: (result) => {
          toast.success(`Mentor "${selectedMentor.name}" added successfully.`);
          setEditorOpen(false);
          setCreatedCredentials(result);
        },
        onError: (err) => {
          if (isAppError(err) && err.code === "CONFLICT") {
            const details = err.details as { edgeFunctionCode?: string; mentorId?: string } | undefined;
            if (details?.edgeFunctionCode === "ARCHIVED_MENTOR_EXISTS" && details.mentorId) {
              const archivedMentorId = details.mentorId;
              toast.error("This email belongs to a deleted mentor.", {
                description: "Restore the existing mentor instead of creating a duplicate account.",
                action: {
                  label: "Restore Mentor",
                  onClick: () => {
                    mutations.restore.mutate(archivedMentorId, {
                      onSuccess: () => {
                        toast.success("Mentor restored.");
                        setEditorOpen(false);
                      },
                      onError: (restoreErr) => toast.error(restoreErr instanceof Error ? restoreErr.message : "Failed to restore mentor."),
                    });
                  },
                },
              });
              setEmailError("This email belongs to a deleted mentor — restore them instead.");
              setActiveTab("Personal");
              return;
            }
            toast.error("This email is already registered. Use a different email or open the existing account.");
            setEmailError("This email is already registered.");
            setActiveTab("Personal");
            return;
          }
          toast.error(err instanceof Error ? err.message : "Unable to create mentor right now. Check your connection and try again.");
        },
      });
    }
  };

  const columns = useMemo<ColumnDef<Mentor>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            aria-label="Select all mentors"
            className="rounded border-border"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            aria-label={`Select ${row.original.name ?? "mentor"}`}
            className="rounded border-border"
          />
        ),
        enableSorting: false,
      },
      {
        id: "name",
        accessorFn: (row) => row.name ?? "",
        header: "Mentor",
        cell: ({ row }) => {
          const m = row.original;
          return (
            <button onClick={() => handleRowClick(m)} className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
              <img
                src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name ?? "?")}`}
                alt=""
                className="size-9 shrink-0 rounded-xl bg-muted object-cover"
              />
              <div className="min-w-0">
                <p className="truncate font-bold text-foreground">{m.name}</p>
                <p className="truncate text-[11px] font-semibold text-muted-foreground">{m.email}</p>
              </div>
            </button>
          );
        },
      },
      {
        id: "designation",
        header: "Designation",
        cell: ({ row }) => <span className="text-sm text-foreground/80 font-medium">{row.original.bio || "—"}</span>,
      },
      {
        id: "rating",
        header: "Rating",
        cell: ({ row }) => {
          const rating = ratings?.get(row.original.id);
          if (!rating || rating.count === 0) return <span className="text-xs text-muted-foreground">No reviews yet</span>;
          return (
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="size-3.5 fill-amber-500" aria-hidden="true" />
              <span className="font-bold text-foreground">{rating.avg.toFixed(1)}</span>
              <span className="text-[11px] text-muted-foreground">({rating.count})</span>
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const mentor = row.original;
          if (mentor.deleted_at) return <Badge variant="destructive" className="capitalize">Deleted</Badge>;
          return (
            <Badge variant={mentor.status === "active" ? "success" : "muted"} className="capitalize">
              {mentor.status || "active"}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const mentor = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => void handleForceReset(mentor.id, mentor.name)}
                title="Force password reset at next login"
                aria-label={`Force password reset for ${mentor.name ?? "mentor"}`}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <KeyRound className="size-4" aria-hidden="true" />
              </button>
              {mentor.deleted_at ? (
                <button
                  onClick={() => void handleRestore(mentor)}
                  title="Restore mentor"
                  aria-label={`Restore ${mentor.name ?? "mentor"}`}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => void handleToggleStatus(mentor)}
                    title={mentor.status === "suspended" ? "Reactivate mentor" : "Suspend mentor"}
                    aria-label={`${mentor.status === "suspended" ? "Reactivate" : "Suspend"} ${mentor.name ?? "mentor"}`}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-amber-50 hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {mentor.status === "suspended" ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <Ban className="size-4" aria-hidden="true" />}
                  </button>
                  <button
                    onClick={() => void handleSoftDelete(mentor)}
                    title="Delete mentor"
                    aria-label={`Delete ${mentor.name ?? "mentor"}`}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleRestore/handleSoftDelete/handleToggleStatus don't close over anything that changes between renders (mentor is passed as a call argument, mutations are referentially stable); including them would just force columns to recompute every render for no behavioral benefit
    [ratings]
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Mentors</h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Manage mentor accounts, review ratings, and provision new mentors.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <button
              onClick={handleExport}
              className="flex h-10 items-center gap-2 border-r border-border px-3 text-xs font-black text-foreground hover:bg-muted transition"
            >
              <Download className="size-4" aria-hidden="true" /> CSV
            </button>
            <button onClick={handleExportExcel} className="flex h-10 items-center px-3 text-xs font-black text-foreground border-r border-border hover:bg-muted transition">
              Excel
            </button>
            <button onClick={handleExportPDF} className="flex h-10 items-center px-3 text-xs font-black text-foreground hover:bg-muted transition">
              PDF
            </button>
          </div>
          <button
            onClick={handleCreate}
            className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground shadow-lg shadow-primary/15 hover:bg-primary/90 transition"
          >
            <Plus className="size-4" aria-hidden="true" /> Add Mentor
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="admin-mentor-search" className="sr-only">Search mentors by name, email, headline, or bio</label>
        <input
          id="admin-mentor-search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search mentors by name, email, headline, or bio..."
          className="h-10 w-full max-w-sm rounded-xl border border-border bg-card px-3.5 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
        />
        <label htmlFor="admin-mentor-status-filter" className="sr-only">Filter by status</label>
        <select
          id="admin-mentor-status-filter"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }}
          className="h-10 rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground">
          <input type="checkbox" checked={showDeleted} onChange={(e) => { setShowDeleted(e.target.checked); setPage(1); }} />
          Show deleted
        </label>
      </div>

      <div aria-live="polite" aria-atomic="true">
        <DataTable
          columns={columns}
          data={mentors}
          exportFilename="mentors_export"
          isLoading={isLoading}
          emptyState={{
            title: "No Mentors Found",
            description: "Provision a mentor account to get started, or adjust your search and filters.",
          }}
          bulkActions={[
            { label: "Activate", onClick: (rows) => handleBulkStatus(rows.map((r) => r.id), "active") },
            { label: "Suspend", onClick: (rows) => handleBulkStatus(rows.map((r) => r.id), "suspended") },
            { label: "Restore", onClick: (rows) => handleBulkRestore(rows.map((r) => r.id)) },
            { label: "Notify", onClick: (rows) => handleOpenBulkNotify(rows.map((r) => r.id)) },
            { label: "Delete", onClick: (rows) => handleBulkDelete(rows.map((r) => r.id)), variant: "destructive" },
          ]}
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setBulkReassignOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-black text-foreground shadow-sm hover:bg-muted"
          >
            Assign / Remove Courses
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground" aria-live="polite">
          Page {page} of {mentorsData?.totalPages || 1}
        </p>
        <div className="flex gap-2">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50">Prev</button>
          <button disabled={page >= (mentorsData?.totalPages || 1)} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50">Next</button>
        </div>
      </div>

      {/* Editor Drawer */}
      <DialogPrimitive.Root open={editorOpen && !!selectedMentor} onOpenChange={setEditorOpen}>
        <AnimatePresence>
          {editorOpen && selectedMentor && (
            <DialogPrimitive.Portal forceMount>
              <DialogPrimitive.Overlay asChild forceMount>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-xs"
                />
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
                    <h3 className="text-lg font-black text-foreground">
                      {selectedMentor.id ? "Edit Mentor Profile" : "Onboard New Mentor"}
                    </h3>
                  </DialogPrimitive.Title>
                  <p className="text-xs font-semibold text-muted-foreground">Configure profile and account settings.</p>
                </div>
                <DialogPrimitive.Close asChild>
                  <button className="rounded-xl p-2 text-muted-foreground hover:bg-muted" aria-label="Close">
                    <X className="size-5" aria-hidden="true" />
                  </button>
                </DialogPrimitive.Close>
              </div>

              {(() => {
                const editorTabs = ["Personal", "Professional", "Account", ...(selectedMentor.id ? ["Security", "CRM", "Courses", "Performance", "Documents"] : [])];
                return (
                  <div role="tablist" aria-label="Mentor editor sections" className="flex overflow-x-auto border-b border-border px-6">
                    {editorTabs.map((tab, i) => (
                      <button
                        key={tab}
                        ref={(el) => { editorTabRefs.current[tab] = el; }}
                        type="button"
                        role="tab"
                        id={`mentor-editor-tab-${tab}`}
                        aria-controls="mentor-form"
                        aria-selected={activeTab === tab}
                        tabIndex={activeTab === tab ? 0 : -1}
                        onClick={() => setActiveTab(tab)}
                        onKeyDown={(e) => {
                          const nextIndex = getNextTabIndex(i, e.key, editorTabs.length);
                          const nextTab = nextIndex === null ? undefined : editorTabs[nextIndex];
                          if (!nextTab) return;
                          e.preventDefault();
                          setActiveTab(nextTab);
                          editorTabRefs.current[nextTab]?.focus();
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

              <form id="mentor-form" role="tabpanel" aria-labelledby={`mentor-editor-tab-${activeTab}`} onSubmit={saveMentor} className="flex-1 overflow-y-auto p-6 space-y-6">
                {activeTab === "Personal" && (
                  <div className="space-y-5">
                    {(nameError || emailError) && (
                      <p role="alert" className="rounded-lg bg-destructive-text/10 px-3.5 py-2.5 text-xs font-semibold text-destructive-text">
                        {[nameError, emailError].filter(Boolean).length > 1 ? "2 errors: " : ""}
                        {[nameError, emailError].filter(Boolean).join(" ")}
                      </p>
                    )}
                    <div className="space-y-1">
                      <label htmlFor="mentor-name-input" className="text-xs font-black text-foreground">Full Name</label>
                      <input
                        id="mentor-name-input"
                        value={selectedMentor.name || ""}
                        onChange={(e) => { setSelectedMentor({ ...selectedMentor, name: e.target.value }); if (nameError) setNameError(null); }}
                        aria-invalid={!!nameError}
                        aria-describedby={nameError ? "mentor-name-error" : undefined}
                        className="w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm outline-none focus:border-primary"
                        placeholder="Jane Doe"
                      />
                      {nameError && (
                        <p id="mentor-name-error" className="text-xs font-semibold text-destructive-text">{nameError}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="mentor-email-input" className="text-xs font-black text-foreground">Email Address</label>
                      <input
                        id="mentor-email-input"
                        type="email"
                        value={selectedMentor.email || ""}
                        onChange={(e) => { setSelectedMentor({ ...selectedMentor, email: e.target.value }); if (emailError) setEmailError(null); }}
                        disabled={!!selectedMentor.id}
                        aria-invalid={!!emailError}
                        aria-describedby={emailError ? "mentor-email-error" : undefined}
                        className="w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm outline-none focus:border-primary disabled:opacity-60"
                        placeholder="jane@example.com"
                      />
                      {emailError && (
                        <p id="mentor-email-error" className="text-xs font-semibold text-destructive-text">{emailError}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-foreground">Phone Number</label>
                      <input
                        type="tel"
                        value={selectedMentor.phone || ""}
                        onChange={(e) => setSelectedMentor({ ...selectedMentor, phone: e.target.value })}
                        className="w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm outline-none focus:border-primary"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="mentor-username-input" className="text-xs font-black text-foreground">Username</label>
                      <input
                        id="mentor-username-input"
                        value={selectedMentor.username || ""}
                        onChange={(e) => setSelectedMentor({ ...selectedMentor, username: e.target.value })}
                        className="w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm outline-none focus:border-primary"
                        placeholder="jane-doe"
                      />
                    </div>
                    {!!selectedMentor.id && (
                      <p className="text-[10px] font-bold text-muted-foreground">
                        To change the login email, use the <span className="font-black text-foreground">Security</span> tab.
                      </p>
                    )}
                  </div>
                )}

                {activeTab === "Professional" && (
                  <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-foreground">Role Designation</label>
                        <input
                          value={selectedMentor.bio || ""}
                          onChange={(e) => setSelectedMentor({ ...selectedMentor, bio: e.target.value })}
                          className="w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm outline-none focus:border-primary"
                          placeholder="Senior Cloud Architect"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-foreground">Company / Affiliation</label>
                        <input
                          value={selectedMentor.headline || ""}
                          onChange={(e) => setSelectedMentor({ ...selectedMentor, headline: e.target.value })}
                          className="w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm outline-none focus:border-primary"
                          placeholder="Tech Corp"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "Account" && (
                  <div className="space-y-5">
                    {!selectedMentor.id && (
                      <>
                        <div className="space-y-1">
                          <label className="text-xs font-black text-foreground">Onboarding Method</label>
                          <select
                            value={selectedMentor.onboardingMethod || "manual"}
                            onChange={(e) => setSelectedMentor({ ...selectedMentor, onboardingMethod: e.target.value as "manual" | "invite" })}
                            className="w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm font-semibold outline-none focus:border-primary"
                          >
                            <option value="manual">Manual Credentials (Set Temporary Password)</option>
                          </select>
                          <p className="text-[10px] font-bold text-muted-foreground mt-1">
                            No email provider is configured yet — credentials must be shared with the mentor directly after creation.
                          </p>
                        </div>
                        <div className="space-y-1 pt-4">
                          <label className="text-xs font-black text-foreground">Temporary Password (Optional)</label>
                          <input
                            type="password"
                            value={selectedMentor.password || ""}
                            onChange={(e) => setSelectedMentor({ ...selectedMentor, password: e.target.value })}
                            className="w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm outline-none focus:border-primary"
                            placeholder="Leave blank to auto-generate"
                          />
                        </div>
                      </>
                    )}

                    {selectedMentor.id && (
                      <p className="text-xs font-semibold text-muted-foreground">
                        Password, session, and lock controls have moved to the <span className="font-black text-foreground">Security</span> tab.
                      </p>
                    )}

                    {selectedMentor.id && (
                      <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                        <h4 className="text-xs font-black uppercase tracking-wider text-red-700 mb-1">Danger Zone</h4>
                        <p className="text-xs font-semibold text-red-700/70 mb-4">
                          {(selectedMentor as Mentor).deleted_at
                            ? "This mentor account is deleted. Restore it to allow them to sign in again."
                            : "Suspending immediately signs the mentor out of the Mentor Dashboard. Deleting keeps their courses and history intact and can be restored later."}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(selectedMentor as Mentor).deleted_at ? (
                            <button
                              type="button"
                              onClick={() => void handleRestore(selectedMentor as Mentor)}
                              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-emerald-700"
                            >
                              <RotateCcw className="size-3.5" aria-hidden="true" /> Restore Mentor
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleToggleStatus(selectedMentor as Mentor)}
                                className="flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-800 hover:bg-amber-200"
                              >
                                {(selectedMentor as Mentor).status === "suspended" ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : <Ban className="size-3.5" aria-hidden="true" />}
                                {(selectedMentor as Mentor).status === "suspended" ? "Reactivate Mentor" : "Suspend Mentor"}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleSoftDelete(selectedMentor as Mentor)}
                                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-red-700"
                              >
                                <Trash2 className="size-3.5" aria-hidden="true" /> Delete Mentor
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "Security" && selectedMentor.id && (
                  <div className="space-y-5">
                    <div className="rounded-xl border border-border p-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-foreground mb-1">Set New Password</h4>
                      <p className="text-xs font-semibold text-muted-foreground mb-3">
                        Sets the mentor's password directly. No approval, OTP, or reset email is sent — share it with them yourself.
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
                          onClick={() => handleSetPassword(selectedMentor.id!, selectedMentor.name)}
                          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
                        >
                          <KeyRound className="size-3.5" aria-hidden="true" /> Set Password
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleForceReset(selectedMentor.id!, selectedMentor.name)}
                        className="mt-3 flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-foreground hover:bg-accent/10"
                      >
                        <KeyRound className="size-3.5" aria-hidden="true" /> Force Password Change on Next Login
                      </button>
                    </div>

                    <div className="rounded-xl border border-border p-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-foreground mb-1">Change Login Email</h4>
                      <p className="text-xs font-semibold text-muted-foreground mb-3">
                        Updates the email used to sign in directly — the new address is confirmed immediately, no confirmation email sent to either address.
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
                          onClick={() => handleChangeEmail(selectedMentor.id!, selectedMentor.name)}
                          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
                        >
                          <KeyRound className="size-3.5" aria-hidden="true" /> Change Email
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border p-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-foreground mb-1">Sessions</h4>
                      <p className="text-xs font-semibold text-muted-foreground mb-3">
                        Immediately invalidate every active session for this mentor.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleForceLogout(selectedMentor.id!, selectedMentor.name)}
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

                    <div className={["rounded-xl border p-4", (selectedMentor as Mentor).login_disabled ? "border-red-200 bg-red-50/50" : "border-border"].join(" ")}>
                      <h4 className={["text-xs font-black uppercase tracking-wider mb-1", (selectedMentor as Mentor).login_disabled ? "text-red-700" : "text-foreground"].join(" ")}>
                        {(selectedMentor as Mentor).login_disabled ? "Account Locked" : "Lock Account"}
                      </h4>
                      <p className={["text-xs font-semibold mb-3", (selectedMentor as Mentor).login_disabled ? "text-red-700/70" : "text-muted-foreground"].join(" ")}>
                        {(selectedMentor as Mentor).login_disabled
                          ? `Locked${(selectedMentor as Mentor).locked_reason ? `: ${(selectedMentor as Mentor).locked_reason}` : ""}. This blocks login independent of the active/suspended status.`
                          : "Blocks the mentor from logging in, independent of active/suspended status. Does not affect their courses or data."}
                      </p>
                      {!(selectedMentor as Mentor).login_disabled && (
                        <input
                          value={lockReasonInput}
                          onChange={(e) => setLockReasonInput(e.target.value)}
                          placeholder="Reason (optional)"
                          className="mb-2 h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm outline-none focus:border-primary"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggleLock(selectedMentor as Mentor)}
                        className={[
                          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider",
                          (selectedMentor as Mentor).login_disabled
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-red-600 text-white hover:bg-red-700",
                        ].join(" ")}
                      >
                        {(selectedMentor as Mentor).login_disabled ? <Unlock className="size-3.5" aria-hidden="true" /> : <Lock className="size-3.5" aria-hidden="true" />}
                        {(selectedMentor as Mentor).login_disabled ? "Unlock Account" : "Lock Account"}
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

                {activeTab === "CRM" && selectedMentor.id && (
                  <MentorCRMPanel mentorId={selectedMentor.id} mentorName={selectedMentor.name ?? "This mentor"} />
                )}

                {activeTab === "Courses" && selectedMentor.id && (
                  <MentorCoursesPanel mentorId={selectedMentor.id} active={activeTab === "Courses"} />
                )}

                {activeTab === "Performance" && selectedMentor.id && (
                  <MentorPerformancePanel mentorId={selectedMentor.id} active={activeTab === "Performance"} />
                )}

                {activeTab === "Documents" && selectedMentor.id && (
                  <MentorDocumentsPanel mentorId={selectedMentor.id} active={activeTab === "Documents"} />
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
                  form="mentor-form"
                  disabled={mutations.create.isPending || mutations.update.isPending}
                  className="h-11 rounded-xl bg-primary px-6 text-xs font-black text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {mutations.create.isPending || mutations.update.isPending
                    ? "Saving..."
                    : selectedMentor.id ? "Save Changes" : "Create Mentor"}
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
                <h2 className="text-lg font-black text-foreground">Mentor Account Created</h2>
              </DialogPrimitive.Title>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                There is no email delivery configured yet — share these credentials with{" "}
                <span className="font-bold text-foreground">{createdCredentials.fullName}</span> directly. This password will not be shown again.
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
                <button
                  type="button"
                  className="mt-6 h-11 w-full rounded-xl bg-primary text-xs font-black text-primary-foreground hover:bg-primary/90"
                >
                  Done
                </button>
              </DialogPrimitive.Close>
                </motion.div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          )}
        </AnimatePresence>
      </DialogPrimitive.Root>

      {/* Bulk Notify Modal */}
      <DialogPrimitive.Root open={bulkNotifyOpen} onOpenChange={setBulkNotifyOpen}>
        <AnimatePresence>
          {bulkNotifyOpen && (
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
                <h2 className="text-lg font-black text-foreground">Notify {bulkNotifyTargetIds.length} Mentor{bulkNotifyTargetIds.length > 1 ? "s" : ""}</h2>
              </DialogPrimitive.Title>
              <div className="mt-4 space-y-3">
                <div className="space-y-1">
                  <label htmlFor="bulk-notify-title" className="text-xs font-black text-foreground">Title</label>
                  <input
                    id="bulk-notify-title"
                    value={bulkNotifyTitle}
                    onChange={(e) => setBulkNotifyTitle(e.target.value)}
                    className="w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="bulk-notify-body" className="text-xs font-black text-foreground">Message</label>
                  <textarea
                    id="bulk-notify-body"
                    value={bulkNotifyBody}
                    onChange={(e) => setBulkNotifyBody(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <DialogPrimitive.Close asChild>
                  <button type="button" className="h-11 rounded-xl px-5 text-xs font-black text-muted-foreground hover:bg-muted">
                    Cancel
                  </button>
                </DialogPrimitive.Close>
                <button
                  type="button"
                  onClick={handleSendBulkNotify}
                  disabled={bulkNotify.isPending}
                  className="h-11 rounded-xl bg-primary px-6 text-xs font-black text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
                </motion.div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          )}
        </AnimatePresence>
      </DialogPrimitive.Root>

      {/* Bulk Course Reassignment Modal */}
      <DialogPrimitive.Root open={bulkReassignOpen} onOpenChange={setBulkReassignOpen}>
        <AnimatePresence>
          {bulkReassignOpen && (
            <DialogPrimitive.Portal forceMount>
              <DialogPrimitive.Overlay asChild forceMount>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" />
              </DialogPrimitive.Overlay>
              <DialogPrimitive.Content asChild forceMount aria-describedby={undefined}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed left-1/2 top-1/2 z-50 flex max-h-[80vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-card p-6 shadow-2xl outline-none"
                >
              <DialogPrimitive.Title asChild>
                <h2 className="text-lg font-black text-foreground">Assign / Remove / Reassign Courses</h2>
              </DialogPrimitive.Title>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                Select courses from any mentor and transfer them to a destination mentor, or choose "Unassigned" to remove them from their current mentor.
              </p>
              <label htmlFor="bulk-reassign-search" className="sr-only">Search courses by title</label>
              <input
                id="bulk-reassign-search"
                value={bulkReassignSearch}
                onChange={(e) => setBulkReassignSearch(e.target.value)}
                placeholder="Search courses by title..."
                className="mt-4 h-11 w-full rounded-xl border border-border bg-muted px-3.5 text-sm outline-none focus:border-primary"
              />
              <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto">
                {(allCourses ?? [])
                  .filter((c) => c.title.toLowerCase().includes(bulkReassignSearch.toLowerCase()))
                  .map((c) => (
                    <label key={c.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bulkReassignSelectedCourseIds.has(c.id)}
                        onChange={() => {
                          const next = new Set(bulkReassignSelectedCourseIds);
                          if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
                          setBulkReassignSelectedCourseIds(next);
                        }}
                      />
                      <span className="truncate text-sm font-semibold text-foreground">{c.title}</span>
                    </label>
                  ))}
              </div>
              <label htmlFor="bulk-reassign-target" className="sr-only">Destination mentor</label>
              <select
                id="bulk-reassign-target"
                value={bulkReassignTargetMentorId}
                onChange={(e) => setBulkReassignTargetMentorId(e.target.value)}
                className="mt-3 h-11 w-full rounded-xl border border-border bg-muted px-3.5 text-sm outline-none focus:border-primary"
              >
                <option value="">Assign to...</option>
                {mentors.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
                {unassignedMentorId ? (
                  <option value={unassignedMentorId}>Unassigned (remove from mentor)</option>
                ) : null}
              </select>
              <div className="mt-4 flex justify-end gap-3">
                <DialogPrimitive.Close asChild>
                  <button type="button" className="h-11 rounded-xl px-5 text-xs font-black text-muted-foreground hover:bg-muted">
                    Cancel
                  </button>
                </DialogPrimitive.Close>
                <button
                  type="button"
                  onClick={handleBulkReassign}
                  disabled={bulkReassignCourses.isPending}
                  className="h-11 rounded-xl bg-primary px-6 text-xs font-black text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Transfer {bulkReassignSelectedCourseIds.size > 0 ? `(${bulkReassignSelectedCourseIds.size})` : ""}
                </button>
              </div>
                </motion.div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          )}
        </AnimatePresence>
      </DialogPrimitive.Root>
    </div>
  );
}
