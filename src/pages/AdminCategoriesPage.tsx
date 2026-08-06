import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Edit2, Archive, ArchiveRestore, Trash2, FolderTree, Search, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";

import type { AdminCategoryRow, CategoryStatus } from "@/services/courses.service";
import {
  useAdminCategories,
  useCreateCategory,
  useUpdateCategory,
  useSetCategoryStatus,
  useApproveCategory,
  useRejectCategory,
  useDeleteCategory,
} from "@/hooks/admin/useAdminCategories";
import { DataTable } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

const STATUS_BADGE: Record<CategoryStatus, { label: string; variant: "success" | "warning" | "muted" | "destructive" }> = {
  active: { label: "Active", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  rejected: { label: "Rejected", variant: "destructive" },
  archived: { label: "Archived", variant: "muted" },
};

type CategoryFormState = {
  name: string;
  slug: string;
  description: string;
  parent_id: string;
  icon: string;
  sort_order: string;
};

const EMPTY_FORM: CategoryFormState = { name: "", slug: "", description: "", parent_id: "", icon: "", sort_order: "0" };

function toFormState(row: AdminCategoryRow): CategoryFormState {
  return {
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    parent_id: row.parent_id ?? "",
    icon: row.icon ?? "",
    sort_order: String(row.sort_order),
  };
}

export default function AdminCategoriesPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState<CategoryStatus | "all">("all");
  const [parentFilter, setParentFilter] = useState<string>("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategoryRow | null>(null);
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [presetParentId, setPresetParentId] = useState<string | null>(null);

  const [deletingCategory, setDeletingCategory] = useState<AdminCategoryRow | null>(null);
  const [rejectingCategory, setRejectingCategory] = useState<AdminCategoryRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: categories, isLoading } = useAdminCategories({
    search: search || undefined,
    status: statusFilter,
    parentId: parentFilter,
  });

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const statusMutation = useSetCategoryStatus();
  const approveMutation = useApproveCategory();
  const rejectMutation = useRejectCategory();
  const deleteMutation = useDeleteCategory();

  const rows = useMemo(() => categories ?? [], [categories]);
  const topLevelOptions = useMemo(() => rows.filter((r) => !r.parent_id && r.status !== "pending" && r.status !== "rejected"), [rows]);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.status === "active").length;
    const pending = rows.filter((r) => r.status === "pending").length;
    const archived = rows.filter((r) => r.status === "archived").length;
    const topLevel = rows.filter((r) => !r.parent_id).length;
    return { total, active, pending, archived, topLevel };
  }, [rows]);

  const openCreate = (parentId?: string) => {
    setEditingCategory(null);
    setForm(parentId ? { ...EMPTY_FORM, parent_id: parentId } : EMPTY_FORM);
    setPresetParentId(parentId ?? null);
    setFormOpen(true);
  };

  const openEdit = (row: AdminCategoryRow) => {
    setEditingCategory(row);
    setForm(toFormState(row));
    setPresetParentId(null);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    const sortOrder = Number(form.sort_order);
    const input = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || null,
      parent_id: form.parent_id || null,
      icon: form.icon.trim() || null,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    };
    try {
      if (editingCategory) {
        await updateMutation.mutateAsync({ id: editingCategory.id, input });
        toast.success("Category updated.");
      } else {
        await createMutation.mutateAsync(input);
        toast.success(input.parent_id ? "Subcategory created." : "Category created.");
      }
      setFormOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save category.");
    }
  };

  const handleToggleStatus = async (row: AdminCategoryRow) => {
    const next = row.status === "active" ? "archived" : "active";
    try {
      await statusMutation.mutateAsync({ id: row.id, status: next });
      toast.success(next === "active" ? "Category activated." : "Category archived.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status.");
    }
  };

  const handleApprove = async (row: AdminCategoryRow) => {
    try {
      await approveMutation.mutateAsync(row.id);
      toast.success(`"${row.name}" approved - now selectable by all mentors.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve category.");
    }
  };

  const handleReject = async () => {
    if (!rejectingCategory || !rejectReason.trim()) return;
    try {
      await rejectMutation.mutateAsync({ id: rejectingCategory.id, reason: rejectReason.trim() });
      toast.success(`"${rejectingCategory.name}" rejected.`);
      setRejectingCategory(null);
      setRejectReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject category.");
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    try {
      await deleteMutation.mutateAsync(deletingCategory.id);
      toast.success("Category deleted.");
      setDeletingCategory(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete category.");
    }
  };

  const columns: ColumnDef<AdminCategoryRow>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 min-w-0">
          {row.original.parent_id && <span className="text-muted-foreground shrink-0" aria-hidden="true">&mdash;</span>}
          <FolderTree className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate font-semibold text-foreground">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "slug",
      header: "Slug",
      cell: ({ row }) => <span className="text-xs font-mono text-muted-foreground">{row.original.slug}</span>,
    },
    {
      accessorKey: "parent_name",
      header: "Parent",
      cell: ({ row }) => row.original.parent_name ?? <span className="text-xs text-muted-foreground">Top-level</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const badge = STATUS_BADGE[row.original.status];
        return <Badge variant={badge.variant}>{badge.label}</Badge>;
      },
    },
    {
      accessorKey: "course_count",
      header: "Courses",
      cell: ({ row }) => <span className="text-sm font-semibold text-foreground">{row.original.course_count}</span>,
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{new Date(row.original.created_at).toLocaleDateString()}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const category = row.original;
        const isBlocked = category.course_count > 0;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Actions for ${category.name}`}>
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {category.status === "pending" ? (
                <>
                  <DropdownMenuItem onClick={() => void handleApprove(category)}>
                    <ShieldCheck className="mr-2 size-3.5" /> Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRejectingCategory(category)}>
                    <XCircle className="mr-2 size-3.5" /> Reject
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuItem onClick={() => openEdit(category)}>
                <Edit2 className="mr-2 size-3.5" /> Edit
              </DropdownMenuItem>
              {!category.parent_id && (
                <DropdownMenuItem onClick={() => openCreate(category.id)}>
                  <Plus className="mr-2 size-3.5" /> Add Subcategory
                </DropdownMenuItem>
              )}
              {category.status !== "pending" && (
                <DropdownMenuItem onClick={() => void handleToggleStatus(category)}>
                  {category.status === "active" ? (
                    <>
                      <Archive className="mr-2 size-3.5" /> Archive
                    </>
                  ) : (
                    <>
                      <ArchiveRestore className="mr-2 size-3.5" /> Activate
                    </>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={isBlocked}
                onClick={() => setDeletingCategory(category)}
              >
                <Trash2 className="mr-2 size-3.5" /> {isBlocked ? "Delete (in use)" : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground">Manage the course taxonomy - categories, subcategories, and their approval status.</p>
        </div>
        <Button onClick={() => openCreate()} className="gap-1.5">
          <Plus className="size-4" /> New Category
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Total</p>
          <p className="mt-1 text-2xl font-black text-foreground">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Active</p>
          <p className="mt-1 text-2xl font-black text-foreground">{stats.active}</p>
        </div>
        <button
          type="button"
          onClick={() => setStatusFilter("pending")}
          className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Pending</p>
          <p className="mt-1 text-2xl font-black text-foreground">{stats.pending}</p>
        </button>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Archived</p>
          <p className="mt-1 text-2xl font-black text-foreground">{stats.archived}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Top-Level</p>
          <p className="mt-1 text-2xl font-black text-foreground">{stats.topLevel}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or slug..."
            className="pl-9"
            aria-label="Search categories"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CategoryStatus | "all")}>
          <SelectTrigger className="w-40" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={parentFilter} onValueChange={setParentFilter}>
          <SelectTrigger className="w-48" aria-label="Filter by parent category">
            <SelectValue placeholder="Hierarchy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="top-level">Top-Level Only</SelectItem>
            {topLevelOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                Under: {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        exportFilename="categories"
        emptyState={{ title: "No categories found", description: "Try adjusting your filters, or create a new category." }}
      />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : presetParentId ? "New Subcategory" : "New Category"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Update this category's details." : "Categories created here are active immediately."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Name</Label>
              <Input id="cat-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Engineering" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-slug">URL Slug (optional - derived from name if left blank)</Label>
              <Input id="cat-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="engineering" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-description">Description</Label>
              <Textarea
                id="cat-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-parent">Parent Category</Label>
              <Select
                value={form.parent_id || "none"}
                onValueChange={(v) => setForm({ ...form, parent_id: v === "none" ? "" : v })}
              >
                <SelectTrigger id="cat-parent">
                  <SelectValue placeholder="None (top-level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level)</SelectItem>
                  {topLevelOptions
                    .filter((c) => c.id !== editingCategory?.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cat-icon">Icon (optional)</Label>
                <Input id="cat-icon" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="e.g. cpu" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-sort">Sort Order</Label>
                <Input
                  id="cat-sort"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingCategory} onOpenChange={(open) => !open && setDeletingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{deletingCategory?.name}"?</DialogTitle>
            <DialogDescription>
              This permanently removes the category. This cannot be undone. If it has subcategories or courses attached, deletion will be blocked -
              archive it instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingCategory(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!rejectingCategory}
        onOpenChange={(open) => {
          if (!open) {
            setRejectingCategory(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject "{rejectingCategory?.name}"?</DialogTitle>
            <DialogDescription>
              The mentor who proposed this category will be notified with your reason. The category stays hidden from the public catalog and other
              mentors.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. This overlaps with the existing 'Data Science' subcategory."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectingCategory(null);
                setRejectReason("");
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleReject()} disabled={!rejectReason.trim() || rejectMutation.isPending}>
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
