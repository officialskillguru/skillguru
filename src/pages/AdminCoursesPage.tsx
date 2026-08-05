import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Search,
  Plus,
  MoreVertical,
  Edit2,
  Copy,
  Globe,
  Archive,
  Trash2,
  X,
  Lock,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ContentStatus } from "@/types/database";
import type { CourseInput, CourseWithCategories } from "@/services/courses.service";
import { useCourseCategories, useCourseMutations, useMentors } from "@/hooks/useAdminData";
import { useAdminCourses, useBulkUpdateCourseStatus, useBulkDeleteCourses, useApproveCourse, useRejectCourse } from "@/hooks/admin/useAdminCourses";
import { getExtendedSupabaseClient } from "@/services/_shared";
import { CourseCurriculumEditor } from "@/components/shared/CourseCurriculumEditor";
import { CourseDetailsEditor } from "@/components/shared/CourseDetailsEditor";
import { DataTable } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

async function fetchCourseEnrollmentCounts(courseIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (courseIds.length === 0) return counts;

  const supabase = getExtendedSupabaseClient();
  const { data, error } = await supabase.from("enrollments").select("course_id").in("course_id", courseIds);
  if (error) throw error;

  for (const row of (data ?? []) as { course_id: string }[]) {
    counts.set(row.course_id, (counts.get(row.course_id) ?? 0) + 1);
  }
  return counts;
}

export default function AdminCoursesPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") ?? "All");
  const [page, setPage] = useState(1);

  const [selectedCourse, setSelectedCourse] = useState<Partial<CourseWithCategories> | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<"basic" | "details" | "curriculum" | "seo" | "mentors">("basic");
  const [rejectingCourse, setRejectingCourse] = useState<CourseWithCategories | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: coursesData, isLoading } = useAdminCourses({
    search: search || undefined,
    status: statusFilter !== "All" ? (statusFilter.toLowerCase() as ContentStatus) : undefined,
    page,
    pageSize: 50,
  });
  
  const { data: categoriesData } = useCourseCategories();
  const dbCategories = categoriesData || [];
  const courses = coursesData?.data || [];

  const courseIds = courses.map((c) => c.id);
  const { data: enrollmentCounts } = useQuery({
    queryKey: ["admin_courses", "enrollment_counts", courseIds],
    queryFn: () => fetchCourseEnrollmentCounts(courseIds),
    enabled: courseIds.length > 0,
  });

  const { data: mentorsData } = useMentors({ pageSize: 200 });
  const mentors = mentorsData?.data ?? [];

  const mutations = useCourseMutations();
  const bulkUpdateStatusMutation = useBulkUpdateCourseStatus();
  const bulkDeleteMutation = useBulkDeleteCourses();
  const approveCourseMutation = useApproveCourse();
  const rejectCourseMutation = useRejectCourse();

  const handleApprove = (course: CourseWithCategories) => {
    approveCourseMutation.mutate(course.id, {
      onSuccess: () => toast.success(`"${course.title}" approved and published.`),
      onError: () => toast.error("Failed to approve course."),
    });
  };

  const handleRejectSubmit = () => {
    if (!rejectingCourse || !rejectReason.trim()) return;
    rejectCourseMutation.mutate(
      { courseId: rejectingCourse.id, reason: rejectReason.trim() },
      {
        onSuccess: () => {
          toast.success(`"${rejectingCourse.title}" sent back to the mentor.`);
          setRejectingCourse(null);
          setRejectReason("");
        },
        onError: () => toast.error("Failed to reject course."),
      }
    );
  };

  const dbCategoryMap = new Map(dbCategories.map(c => [c.id, c.name]));
  
  const filteredCourses = courses.filter((c) => {
    const catName = dbCategoryMap.get(c.selectedCategoryIds?.[0] || "") || "Uncategorized";
    return categoryFilter === "All Categories" || catName === categoryFilter;
  });

  const handleBulkAction = (action: "publish" | "archive" | "delete", ids: string[]) => {
    if (ids.length === 0) return toast.error("No courses selected.");

    if (action === "delete") {
      bulkDeleteMutation.mutate({ courseIds: ids }, {
        onSuccess: () => toast.success(`Deleted ${ids.length} courses successfully.`),
      });
      return;
    }

    const newStatus = action === "publish" ? "published" : "archived";
    bulkUpdateStatusMutation.mutate({ courseIds: ids, status: newStatus }, {
      onSuccess: () => toast.success(`Successfully updated ${ids.length} courses to ${newStatus}.`),
    });
  };

  const handleEdit = (course: CourseWithCategories) => {
    setSelectedCourse(course);
    setEditorTab("details");
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setSelectedCourse({
      slug: "",
      title: "",
      selectedCategoryIds: [dbCategories[0]?.id || ""],
      mentor_id: mentors[0]?.id || "",
      status: "draft",
    });
    setEditorTab("basic");
    setEditorOpen(true);
  };

  const handleDuplicate = (course: CourseWithCategories) => {
    const { id: _id, created_at: _created_at, updated_at: _updated_at, ...rest } = course;
    const input: CourseInput = {
      ...rest,
      title: `${course.title} (Copy)`,
      status: "draft",
      selectedCategoryIds: course.selectedCategoryIds,
    };

    mutations.create.mutate(input, {
      onSuccess: () => {
        toast.success(`Duplicated "${course.title}" successfully.`);
      }
    });
  };

  const handleDelete = (id: string) => {
    mutations.remove.mutate(id, {
      onSuccess: () => {
        toast.error("Course deleted.");
      }
    });
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    mutations.update.mutate({ id, input: { status: newStatus as ContentStatus } }, {
      onSuccess: () => {
        toast.success(`Course status updated to ${newStatus}.`);
      }
    });
  };

  const saveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;

    if (selectedCourse.id) {
      mutations.update.mutate({ id: selectedCourse.id, input: selectedCourse }, {
        onSuccess: () => {
          toast.success(`Course "${selectedCourse.title}" updated successfully.`);
          setEditorOpen(false);
        }
      });
    } else {
      const { id: _id, created_at: _created_at, updated_at: _updated_at, ...rest } = selectedCourse as CourseWithCategories;
      const newCourse: CourseInput = {
        ...rest,
        slug: selectedCourse.slug || undefined,
      };

      mutations.create.mutate(newCourse, {
        onSuccess: () => {
          toast.success(`Course "${selectedCourse.title}" added to directory.`);
          setEditorOpen(false);
        }
      });
    }
  };

  const columns: ColumnDef<CourseWithCategories>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          aria-label="Select all courses"
          className="rounded border-border"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          aria-label={`Select ${row.original.title}`}
          className="rounded border-border"
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-linear-to-br from-primary to-secondary text-primary-foreground font-black text-[10px] shrink-0" aria-hidden="true">
              {c.title?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-black text-foreground max-w-[200px] truncate" title={c.title || ""}>{c.title}</p>
              <p className="text-[10px] font-bold text-muted-foreground truncate max-w-[200px]">{c.slug}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: "category",
      header: "Category",
      cell: ({ row }) => (
        <span className="rounded-lg bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground whitespace-nowrap">
          {dbCategoryMap.get(row.original.selectedCategoryIds?.[0] || "") || "Uncategorized"}
        </span>
      ),
    },
    {
      id: "enrollments",
      header: "Enrollments",
      cell: ({ row }) => (
        <span className="text-xs font-black text-foreground">{enrollmentCounts?.get(row.original.id) ?? 0}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const label = status === "under_review" ? "Under Review" : status;
        const variant = status === "published" ? "success" : status === "under_review" ? "info" : status === "draft" ? "warning" : "muted";
        return (
          <Badge variant={variant} className="capitalize">
            {label}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="relative flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  aria-label={`Actions for ${c.title}`}
                >
                  <MoreVertical className="size-4" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => handleEdit(c)} className="gap-2 text-xs font-black text-foreground">
                  <Edit2 className="size-3.5 text-primary" aria-hidden="true" /> Edit Course
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDuplicate(c)} className="gap-2 text-xs font-black text-foreground">
                  <Copy className="size-3.5 text-muted-foreground" aria-hidden="true" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {c.status === "under_review" ? (
                  <>
                    <DropdownMenuItem onClick={() => handleApprove(c)} className="gap-2 text-xs font-bold text-success">
                      <ShieldCheck className="size-3.5" aria-hidden="true" /> Approve &amp; Publish
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRejectingCourse(c)} className="gap-2 text-xs font-bold text-destructive-text">
                      <XCircle className="size-3.5" aria-hidden="true" /> Reject
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={() => handleStatusChange(c.id, "published")} className="gap-2 text-xs font-bold text-success">
                    <Globe className="size-3.5" aria-hidden="true" /> Publish
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleStatusChange(c.id, "archived")} className="gap-2 text-xs font-bold text-warning">
                  <Archive className="size-3.5" aria-hidden="true" /> Archive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(c.id)} className="gap-2 text-xs font-bold text-destructive-text">
                  <Trash2 className="size-3.5" aria-hidden="true" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Academics Catalogue
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Author curriculum, specify certifications, and map mentor profiles.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCreate}
            className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/15 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Plus className="size-4" aria-hidden="true" /> Create Course
          </button>
        </div>
      </div>

      {/* Stats Counter Row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        {[
          { label: "Active Courses", count: courses.filter(c => c.status === "published").length, color: "text-success" },
          { label: "Pending Review", count: courses.filter(c => c.status === "under_review").length, color: "text-primary", onClick: () => { setStatusFilter("under_review"); setPage(1); } },
          { label: "Draft Programs", count: courses.filter(c => c.status === "draft").length, color: "text-warning" },
          { label: "Archived Tracks", count: courses.filter(c => c.status === "archived").length, color: "text-muted-foreground" },
          { label: "Total Programs", count: coursesData?.count || 0, color: "text-primary" }
        ].map(st => (
          st.onClick ? (
            <button
              key={st.label}
              type="button"
              onClick={st.onClick}
              className="rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{st.label}</p>
              <p className={`mt-1.5 text-2xl font-black ${st.color}`}>{st.count}</p>
            </button>
          ) : (
            <div key={st.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{st.label}</p>
              <p className={`mt-1.5 text-2xl font-black ${st.color}`}>{st.count}</p>
            </div>
          )
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="relative w-full sm:max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="course-search" className="sr-only">Search programs, tags</label>
          <input
            id="course-search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search programs, tags..."
            className="h-11 w-full rounded-xl border border-border bg-muted pl-10 pr-4 text-sm font-semibold outline-none transition placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        <div className="flex gap-2">
          <label htmlFor="course-category-filter" className="sr-only">Filter by category</label>
          <select
            id="course-category-filter"
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="h-11 rounded-xl border border-border bg-muted px-4 text-xs font-black text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring md:w-48"
          >
            <option>All Categories</option>
            {dbCategories.map((cat) => (
              <option key={cat.id} value={cat.name || ""}>
                {cat.name}
              </option>
            ))}
          </select>

          <label htmlFor="course-status-filter" className="sr-only">Filter by status</label>
          <select
            id="course-status-filter"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-11 rounded-xl border border-border bg-muted px-4 text-xs font-black text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring md:w-36"
          >
            <option value="All">All Status</option>
            <option value="published">Published</option>
            <option value="under_review">Under Review</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Courses Catalog Table */}
      <DataTable
        columns={columns}
        data={filteredCourses}
        exportFilename="courses_export"
        hidePagination
        isLoading={isLoading}
        emptyState={{
          title: "No Courses Found",
          description: "No programs matched your search and filters.",
        }}
        bulkActions={[
          { label: "Publish", onClick: (rows) => handleBulkAction("publish", rows.map((r) => r.id)) },
          { label: "Archive", onClick: (rows) => handleBulkAction("archive", rows.map((r) => r.id)) },
          { label: "Delete", onClick: (rows) => handleBulkAction("delete", rows.map((r) => r.id)), variant: "destructive" },
        ]}
      />
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-6 py-4">
        <p className="text-xs font-semibold text-muted-foreground">
          Showing page {page} of {coursesData?.totalPages || 1}
        </p>
        <div className="flex gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">Prev</button>
          <button disabled={page >= (coursesData?.totalPages || 1)} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">Next</button>
        </div>
      </div>

      {/* Slide-out Course Editor Panel */}
      <DialogPrimitive.Root open={editorOpen && !!selectedCourse} onOpenChange={setEditorOpen}>
        <AnimatePresence>
          {editorOpen && selectedCourse && (
            <DialogPrimitive.Portal forceMount>
              <DialogPrimitive.Overlay asChild forceMount>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-card/50 backdrop-blur-xs"
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
                      {selectedCourse.id ? "Edit Course" : "Create New Course"}
                    </h3>
                  </DialogPrimitive.Title>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Draft curriculum outlines, certifications templates and media.
                  </p>
                </div>
                <DialogPrimitive.Close asChild>
                  <button
                    aria-label="Close"
                    className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-5" aria-hidden="true" />
                  </button>
                </DialogPrimitive.Close>
              </div>

              <div role="tablist" aria-label="Course editor sections" className="flex border-b border-border overflow-x-auto hide-scrollbar px-6">
                {[
                  ...(selectedCourse.id
                    ? [{ id: "details", label: "Course Details", locked: false }]
                    : [{ id: "basic", label: "Basic Info", locked: false }]),
                  { id: "curriculum", label: "Curriculum", locked: !selectedCourse.id },
                  { id: "seo", label: "SEO Settings", locked: false },
                  { id: "mentors", label: "Mentors", locked: false },
                ].map((tb) => (
                  <button
                    key={tb.id}
                    role="tab"
                    aria-selected={editorTab === tb.id}
                    aria-disabled={tb.locked}
                    aria-describedby={tb.locked ? "course-editor-locked-hint" : undefined}
                    onClick={() => { if (!tb.locked) setEditorTab(tb.id as typeof editorTab); }}
                    className={[
                      "flex shrink-0 items-center gap-1.5 py-3.5 px-3.5 text-xs font-black transition-all border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                      tb.locked
                        ? "cursor-not-allowed border-transparent text-muted-foreground/40"
                        : editorTab === tb.id
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {tb.label}
                    {tb.locked && <Lock className="size-3" aria-hidden="true" />}
                  </button>
                ))}
              </div>
              {!selectedCourse.id && (
                <p id="course-editor-locked-hint" className="border-b border-border bg-muted/30 px-6 py-2 text-[11px] font-semibold text-muted-foreground">
                  <Lock className="mr-1 inline size-3" aria-hidden="true" />
                  Curriculum and full Course Details (media, outcomes, FAQ) unlock after you save this course for the first time.
                </p>
              )}

              <form onSubmit={saveCourse} className="flex-1 overflow-y-auto p-6 space-y-6">
                {editorTab === "basic" && (
                  <div className="space-y-5">
                    <div className="space-y-1">
                      <label htmlFor="course-title" className="text-xs font-black text-muted-foreground">Course Title</label>
                      <input
                        id="course-title"
                        required
                        value={selectedCourse.title || ""}
                        onChange={(e) => setSelectedCourse({ ...selectedCourse, title: e.target.value })}
                        className="w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="e.g. Master Full Stack Engineering"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="course-slug" className="text-xs font-black text-muted-foreground">URL Slug</label>
                      <input
                        id="course-slug"
                        value={selectedCourse.slug || ""}
                        onChange={(e) => setSelectedCourse({ ...selectedCourse, slug: e.target.value })}
                        className="w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="e.g. master-full-stack"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label htmlFor="course-category" className="text-xs font-black text-muted-foreground">Category</label>
                        <select
                          id="course-category"
                          value={selectedCourse.selectedCategoryIds?.[0] || ""}
                          onChange={(e) => setSelectedCourse({ ...selectedCourse, selectedCategoryIds: [e.target.value] })}
                          className="w-full h-11 rounded-xl border border-border bg-muted px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {dbCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="course-duration" className="text-xs font-black text-muted-foreground">Duration Length</label>
                        <input
                          id="course-duration"
                          value={selectedCourse.duration || ""}
                          onChange={(e) => setSelectedCourse({ ...selectedCourse, duration: e.target.value })}
                          className="w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          placeholder="e.g. 12 Weeks"
                        />
                      </div>
                    </div>

                    {/* Rich Text Editor Mock */}
                    <div className="space-y-2">
                      <label htmlFor="course-description" className="text-xs font-black text-muted-foreground">Full Description</label>
                      <div className="rounded-xl border border-border overflow-hidden bg-card">
                        {/* Fake Toolbar */}
                        <div className="bg-muted border-b border-border px-3 py-2 flex gap-2" aria-hidden="true">
                          <button type="button" tabIndex={-1} className="p-1.5 hover:bg-muted rounded font-serif font-bold text-xs text-foreground/80">B</button>
                          <button type="button" tabIndex={-1} className="p-1.5 hover:bg-muted rounded font-serif italic text-xs text-foreground/80">I</button>
                          <button type="button" tabIndex={-1} className="p-1.5 hover:bg-muted rounded font-serif underline text-xs text-foreground/80">U</button>
                          <div className="w-px bg-border my-1 mx-1"></div>
                          <button type="button" tabIndex={-1} className="p-1.5 hover:bg-muted rounded text-xs font-bold text-foreground/80">&lt;/&gt;</button>
                        </div>
                        <textarea
                          id="course-description"
                          rows={6}
                          value={selectedCourse.description || ""}
                          onChange={(e) => setSelectedCourse({ ...selectedCourse, description: e.target.value })}
                          className="w-full p-3.5 text-sm text-foreground outline-none bg-transparent resize-y"
                          placeholder="Write a detailed description..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {editorTab === "details" && selectedCourse.id && (
                  <CourseDetailsEditor courseId={selectedCourse.id} viewerRole="admin" />
                )}

                {editorTab === "curriculum" && (
                  selectedCourse.id ? (
                    <CourseCurriculumEditor
                      courseId={selectedCourse.id}
                      courseTitle={selectedCourse.title || "Untitled course"}
                      courseStatus={selectedCourse.status || "draft"}
                    />
                  ) : (
                    <p className="rounded-xl border border-dashed border-border bg-muted p-6 text-center text-xs font-bold text-muted-foreground">
                      Save this course first to start adding modules and lessons.
                    </p>
                  )
                )}

                {editorTab === "seo" && (
                  <div className="space-y-4">
                    <p className="rounded-xl border border-dashed border-border bg-muted p-4 text-xs font-bold text-muted-foreground">
                      Not supported by schema yet — the <code>courses</code> table has no meta title/description columns. These fields are disabled until that's added.
                    </p>
                    <div className="space-y-1">
                      <label htmlFor="course-seo-title" className="text-xs font-black text-muted-foreground">SEO Title Tag</label>
                      <input
                        id="course-seo-title"
                        disabled
                        value=""
                        className="w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm text-foreground outline-none opacity-50 cursor-not-allowed"
                        placeholder="Not supported by schema"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="course-seo-description" className="text-xs font-black text-muted-foreground">SEO Description</label>
                      <textarea
                        id="course-seo-description"
                        disabled
                        rows={4}
                        value=""
                        className="w-full rounded-xl border border-border bg-muted p-3 text-sm text-foreground outline-none opacity-50 cursor-not-allowed"
                        placeholder="Not supported by schema"
                      />
                    </div>
                  </div>
                )}

                {editorTab === "mentors" && (
                  <div className="space-y-4">
                    <label htmlFor="course-mentor" className="text-xs font-black text-muted-foreground">Assigned Mentor</label>
                    <p className="text-[10px] font-bold text-muted-foreground">
                      Each course has exactly one owning mentor (required by the schema) — pick who runs this course.
                    </p>
                    <select
                      id="course-mentor"
                      required
                      value={selectedCourse.mentor_id || ""}
                      onChange={(e) => setSelectedCourse({ ...selectedCourse, mentor_id: e.target.value })}
                      className="w-full h-11 rounded-xl border border-border bg-muted px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="" disabled>Select a mentor...</option>
                      {mentors.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                )}

              </form>

              <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="h-11 rounded-xl px-5 text-xs font-black text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Close
                </button>
                {editorTab !== "details" && editorTab !== "curriculum" && (
                  <button
                    onClick={saveCourse}
                    className="h-11 rounded-xl bg-primary px-6 text-xs font-black text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Save Course Record
                  </button>
                )}
              </div>
                </motion.div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          )}
        </AnimatePresence>
      </DialogPrimitive.Root>

      {/* Reject-with-reason dialog */}
      <Dialog open={!!rejectingCourse} onOpenChange={(open) => { if (!open) { setRejectingCourse(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject &ldquo;{rejectingCourse?.title}&rdquo;</DialogTitle>
            <DialogDescription>
              The mentor will be notified with this reason and the course will move back to draft.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <label htmlFor="reject-course-reason" className="text-xs font-black text-muted-foreground">
              Reason for the mentor
            </label>
            <textarea
              id="reject-course-reason"
              autoFocus
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain what needs to change before this can be approved..."
              rows={4}
              className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => { setRejectingCourse(null); setRejectReason(""); }}
              className="h-10 rounded-xl px-4 text-xs font-black text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRejectSubmit}
              disabled={rejectCourseMutation.isPending || !rejectReason.trim()}
              className="h-10 rounded-xl bg-destructive px-4 text-xs font-black text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {rejectCourseMutation.isPending ? "Sending..." : "Send Back to Mentor"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
