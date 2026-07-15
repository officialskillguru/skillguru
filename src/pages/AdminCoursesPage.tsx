import { useState } from "react";
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
  PlusCircle,
  Video,
  Download
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { ContentStatus } from "@/types/database";
import type { CourseInput, CourseWithCategories } from "@/services/courses.service";
import { useCourseCategories, useCourseMutations } from "@/hooks/useAdminData";
import { useAdminCourses, useBulkUpdateCourseStatus, useBulkDeleteCourses } from "@/hooks/admin/useAdminCourses";
import { exportToCSV } from "@/utils/export";

export default function AdminCoursesPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [selectedCourse, setSelectedCourse] = useState<Partial<CourseWithCategories> | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<"basic" | "curriculum" | "pricing" | "seo" | "mentors" | "placement" | "certificate" | "media">("basic");
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);

  const { data: coursesData, isLoading } = useAdminCourses({
    search: search || undefined,
    status: statusFilter !== "All" ? (statusFilter.toLowerCase() as ContentStatus) : undefined,
    page,
    pageSize: 50,
  });
  
  const { data: categoriesData } = useCourseCategories();
  const dbCategories = categoriesData || [];
  const courses = coursesData?.data || [];
  
  const mutations = useCourseMutations();
  const bulkUpdateStatusMutation = useBulkUpdateCourseStatus();
  const bulkDeleteMutation = useBulkDeleteCourses();

  const dbCategoryMap = new Map(dbCategories.map(c => [c.id, c.name]));
  
  const filteredCourses = courses.filter((c) => {
    const catName = dbCategoryMap.get(c.selectedCategoryIds?.[0] || "") || "Uncategorized";
    return categoryFilter === "All Categories" || catName === categoryFilter;
  });

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredCourses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCourses.map(c => c.id)));
    }
  };

  const handleBulkAction = (action: "publish" | "archive" | "delete") => {
    if (selectedIds.size === 0) return toast.error("No courses selected.");
    
    if (action === "delete") {
      bulkDeleteMutation.mutate({ courseIds: Array.from(selectedIds) }, {
        onSuccess: () => {
          toast.success(`Deleted ${selectedIds.size} courses successfully.`);
          setSelectedIds(new Set());
        }
      });
      return;
    }

    const newStatus = action === "publish" ? "published" : "archived";
    bulkUpdateStatusMutation.mutate({ courseIds: Array.from(selectedIds), status: newStatus }, {
      onSuccess: () => {
        toast.success(`Successfully updated ${selectedIds.size} courses to ${newStatus}.`);
        setSelectedIds(new Set());
      }
    });
  };

  const handleExport = () => {
    if (filteredCourses.length === 0) return toast.error("No data to export.");
    const exportData = filteredCourses.map(c => ({
      ID: c.id,
      Title: c.title,
      Category: dbCategoryMap.get(c.selectedCategoryIds?.[0] || "") || "Uncategorized",
      /* price removed */
      Status: c.status,
      Created: new Date(c.created_at).toLocaleDateString()
    }));
    exportToCSV(exportData, "courses_export");
  };

  const handleEdit = (course: CourseWithCategories) => {
    setSelectedCourse(course);
    setEditorTab("basic");
    setEditorOpen(true);
    setActiveActionMenu(null);
  };

  const handleCreate = () => {
    setSelectedCourse({
      slug: "",
      title: "",
      selectedCategoryIds: [dbCategories[0]?.id || ""],
      
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
        setActiveActionMenu(null);
      }
    });
  };

  const handleDelete = (id: string) => {
    mutations.remove.mutate(id, {
      onSuccess: () => {
        toast.error("Course deleted.");
        setActiveActionMenu(null);
      }
    });
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    mutations.update.mutate({ id, input: { status: newStatus as ContentStatus } }, {
      onSuccess: () => {
        toast.success(`Course status updated to ${newStatus}.`);
        setActiveActionMenu(null);
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

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary dark:text-cyan-200">
            Academics Catalogue
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground dark:text-slate-400">
            Author curriculum, specify certifications, and map mentor profiles.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition">
            <Download className="size-4" /> Export CSV
          </button>
          <button
            onClick={handleCreate}
            className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-white hover:bg-opacity-90 shadow-lg shadow-primary/15 dark:bg-cyan-400 dark:text-primary transition"
          >
            <Plus className="size-4" /> Create Course
          </button>
        </div>
      </div>

      {/* Stats Counter Row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          { label: "Active Courses", count: courses.filter(c => c.status === "published").length, color: "text-emerald-500" },
          { label: "Draft Programs", count: courses.filter(c => c.status === "draft").length, color: "text-amber-500" },
          { label: "Archived Tracks", count: courses.filter(c => c.status === "archived").length, color: "text-slate-400" },
          { label: "Total Programs", count: coursesData?.count || 0, color: "text-primary" }
        ].map(st => (
          <div key={st.label} className="rounded-2xl border border-border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{st.label}</p>
            <p className={`mt-1.5 text-2xl font-black ${st.color}`}>{st.count}</p>
          </div>
        ))}
      </div>

      {/* Filters & Bulk Actions Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative w-full sm:max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-primary dark:text-cyan-300" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search programs, tags..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-muted pl-10 pr-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="h-11 rounded-xl border border-slate-200 bg-muted px-4 text-xs font-black text-primary outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white md:w-48"
          >
            <option>All Categories</option>
            {dbCategories.map((cat) => (
              <option key={cat.id} value={cat.name || ""}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-11 rounded-xl border border-slate-200 bg-muted px-4 text-xs font-black text-primary outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white md:w-36"
          >
            <option value="All">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm"
          >
            <span className="text-xs font-bold text-slate-500 mr-2 px-2">{selectedIds.size} Selected</span>
            <button onClick={() => handleBulkAction("publish")} className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 transition">
              <Globe className="size-3.5" /> Publish
            </button>
            <button onClick={() => handleBulkAction("archive")} className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[10px] font-black uppercase text-amber-600 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 transition">
              <Archive className="size-3.5" /> Archive
            </button>
            <button onClick={() => handleBulkAction("delete")} className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-[10px] font-black uppercase text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 transition">
              <Trash2 className="size-3.5" /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Courses Catalog Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-slate-100/40 text-[10px] font-black uppercase tracking-wider text-muted-foreground dark:border-slate-850 dark:bg-slate-900/50">
                <th className="px-6 py-4 w-12">
                  <input type="checkbox" onChange={toggleAll} checked={filteredCourses.length > 0 && selectedIds.size === filteredCourses.length} className="rounded border-slate-300 dark:border-slate-700" />
                </th>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Enrollments</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE7F6] dark:divide-slate-850">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm font-semibold text-slate-400">
                    Loading programs...
                  </td>
                </tr>
              ) : filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm font-semibold text-slate-400">
                    No programs matched the criteria.
                  </td>
                </tr>
              ) : (
                filteredCourses.map((c) => (
                  <tr
                    key={c.id}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).tagName !== "INPUT" && (e.target as HTMLElement).tagName !== "BUTTON") {
                        handleEdit(c);
                      }
                    }}
                    className="group cursor-pointer transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/10 text-xs"
                  >
                    <td className="px-6 py-4.5">
                      <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelection(c.id)} className="rounded border-slate-300 dark:border-slate-700" />
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-3">
                        <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-blue-800 text-white font-black text-[10px] shrink-0">
                          {c.title?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-black text-primary dark:text-slate-100 max-w-[200px] truncate" title={c.title || ""}>
                            {c.title}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 truncate max-w-[200px]">{c.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4.5">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400 whitespace-nowrap">
                        {dbCategoryMap.get(c.selectedCategoryIds?.[0] || "") || "Uncategorized"}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-xs font-black text-slate-600 dark:text-slate-350">0</td>
                    <td className="px-6 py-4.5">
                      <span
                        className={[
                          "inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider whitespace-nowrap",
                          c.status === "published"
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                            : c.status === "draft"
                            ? "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                        ].join(" ")}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-right relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveActionMenu(activeActionMenu === c.id ? null : c.id); }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <MoreVertical className="size-4" />
                      </button>

                      {/* Floating Dropdown Action Menu */}
                      <AnimatePresence>
                        {activeActionMenu === c.id && (
                          <>
                            <button
                              type="button"
                              className="fixed inset-0 z-10 cursor-default"
                              onClick={(e) => { e.stopPropagation(); setActiveActionMenu(null); }}
                            />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute right-8 top-4 z-20 w-44 rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-950"
                            >
                              <button onClick={(e) => { e.stopPropagation(); handleEdit(c); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-black text-slate-700 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-900">
                                <Edit2 className="size-3.5 text-primary" /> Edit Course
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDuplicate(c); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-black text-slate-700 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-900">
                                <Copy className="size-3.5 text-blue-500" /> Duplicate
                              </button>
                              <div className="my-1 border-t border-slate-100 dark:border-slate-900" />
                              <button onClick={(e) => { e.stopPropagation(); handleStatusChange(c.id, "published"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-bold text-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/15">
                                <Globe className="size-3.5" /> Publish
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleStatusChange(c.id, "archived"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-bold text-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-950/15">
                                <Archive className="size-3.5" /> Archive
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-950/15">
                                <Trash2 className="size-3.5" /> Delete
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500">
            Showing page {page} of {coursesData?.totalPages || 1}
          </p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Prev</button>
            <button disabled={page >= (coursesData?.totalPages || 1)} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Next</button>
          </div>
        </div>
      </div>

      {/* Slide-out Course Editor Panel */}
      <AnimatePresence>
        {editorOpen && selectedCourse && (
          <div className="fixed inset-0 z-50 flex justify-end bg-card/50 backdrop-blur-xs">
            <button
              type="button"
              className="absolute inset-0 cursor-default"
              onClick={() => setEditorOpen(false)}
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-border bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-850">
                <div>
                  <h3 className="text-lg font-black text-primary dark:text-white">
                    {selectedCourse.id ? "Edit Course" : "Create New Course"}
                  </h3>
                  <p className="text-xs font-semibold text-slate-400">
                    Draft curriculum outlines, certifications templates and media.
                  </p>
                </div>
                <button
                  onClick={() => setEditorOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="flex border-b border-slate-100 overflow-x-auto hide-scrollbar px-6 dark:border-slate-850">
                {[
                  { id: "basic", label: "Basic Info" },
                  { id: "curriculum", label: "Curriculum" },
                  { id: "pricing", label: "Pricing" },
                  { id: "seo", label: "SEO Settings" },
                  { id: "mentors", label: "Mentors" },
                  { id: "media", label: "Media Assets" },
                ].map((tb) => (
                  <button
                    key={tb.id}
                    onClick={() => setEditorTab(tb.id as typeof editorTab)}
                    className={[
                      "shrink-0 py-3.5 px-3.5 text-xs font-black transition-all border-b-2",
                      editorTab === tb.id
                        ? "border-primary text-primary dark:border-cyan-400 dark:text-cyan-300"
                        : "border-transparent text-slate-400 hover:text-primary dark:hover:text-white",
                    ].join(" ")}
                  >
                    {tb.label}
                  </button>
                ))}
              </div>

              <form onSubmit={saveCourse} className="flex-1 overflow-y-auto p-6 space-y-6">
                {editorTab === "basic" && (
                  <div className="space-y-5">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-primary dark:text-slate-350">Course Title</label>
                      <input
                        required
                        value={selectedCourse.title || ""}
                        onChange={(e) => setSelectedCourse({ ...selectedCourse, title: e.target.value })}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-muted px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                        placeholder="e.g. Master Full Stack Engineering"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-primary dark:text-slate-350">URL Slug</label>
                      <input
                        value={selectedCourse.slug || ""}
                        onChange={(e) => setSelectedCourse({ ...selectedCourse, slug: e.target.value })}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-muted px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                        placeholder="e.g. master-full-stack"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-primary dark:text-slate-350">Category</label>
                        <select
                          value={selectedCourse.selectedCategoryIds?.[0] || ""}
                          onChange={(e) => setSelectedCourse({ ...selectedCourse, selectedCategoryIds: [e.target.value] })}
                          className="w-full h-11 rounded-xl border border-slate-200 bg-muted px-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                        >
                          {dbCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-primary dark:text-slate-350">Duration Length</label>
                        <input
                          required
                          value={0}
                          onChange={() => {}}
                          className="w-full h-11 rounded-xl border border-slate-200 bg-muted px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                          placeholder="e.g. 12 Weeks"
                        />
                      </div>
                    </div>

                    {/* Rich Text Editor Mock */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-primary dark:text-slate-350">Full Description</label>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
                        {/* Fake Toolbar */}
                        <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-2 flex gap-2">
                          <button type="button" className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded font-serif font-bold text-xs text-slate-700 dark:text-slate-300">B</button>
                          <button type="button" className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded font-serif italic text-xs text-slate-700 dark:text-slate-300">I</button>
                          <button type="button" className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded font-serif underline text-xs text-slate-700 dark:text-slate-300">U</button>
                          <div className="w-px bg-slate-300 dark:bg-slate-700 my-1 mx-1"></div>
                          <button type="button" className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-xs font-bold text-slate-700 dark:text-slate-300">&lt;/&gt;</button>
                        </div>
                        <textarea
                          rows={6}
                          value={selectedCourse.description || ""}
                          onChange={(e) => setSelectedCourse({ ...selectedCourse, description: e.target.value })}
                          className="w-full p-3.5 text-sm outline-none bg-transparent dark:text-white resize-y"
                          placeholder="Write a detailed description..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {editorTab === "curriculum" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-primary dark:text-cyan-200">Curriculum Module Syllabus Builder</h4>
                      <button
                        type="button"
                        onClick={() => toast.success("Added new dynamic curriculum slot.")}
                        className="flex items-center gap-1 text-[10px] font-black text-cyan-600 uppercase"
                      >
                        <PlusCircle className="size-3.5" />
                        <span>Add Module</span>
                      </button>
                    </div>

                    {["Frontend Foundations", "Backend Systems", "Job Preparation"].map((mod, index) => (
                      <div key={mod} className="rounded-xl border border-slate-100 bg-muted p-4 space-y-3 dark:border-slate-800 dark:bg-slate-900/50">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-primary dark:text-slate-300">Module {index + 1}</p>
                          <button type="button" className="text-[10px] font-black text-rose-500 uppercase">Remove</button>
                        </div>
                        <input className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" defaultValue={mod} />
                      </div>
                    ))}
                  </div>
                )}

                {editorTab === "pricing" && (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-primary dark:text-slate-350">Course Base Price (INR)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">₹</span>
                          <input
                            type="number"
                            required
                            value={0}
                            onChange={() => {}}
                            className="w-full h-11 rounded-xl border border-slate-200 bg-muted pl-8 pr-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-primary dark:text-slate-350">Discount Subtitle</label>
                        <input
                          disabled
                          value=""
                          className="w-full h-11 rounded-xl border border-slate-200 bg-muted px-3.5 text-sm outline-none opacity-50 cursor-not-allowed dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                          placeholder="Not supported by schema"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {editorTab === "seo" && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-primary dark:text-slate-350">SEO Title Tag</label>
                      <input
                        className="w-full h-11 rounded-xl border border-slate-200 bg-muted px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                        placeholder="SEO optimised meta title"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-primary dark:text-slate-350">SEO Description</label>
                      <textarea
                        rows={4}
                        className="w-full rounded-xl border border-slate-200 bg-muted p-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                        placeholder="Compelling page meta description..."
                      />
                    </div>
                  </div>
                )}

                {editorTab === "mentors" && (
                  <div className="space-y-4">
                    <label className="text-xs font-black text-primary dark:text-slate-350">Assign Instructors/Faculty Mentors</label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {["Rahul Sharma", "Neha Verma", "Amit Singh", "Pooja Rao"].map((m) => (
                        <label key={m} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-muted p-3 cursor-pointer dark:border-slate-800 dark:bg-slate-900/50">
                          <input
                            type="checkbox"
                            checked={false}
                            disabled
                            className="rounded border-slate-200 text-primary focus:ring-[#111E79] opacity-50"
                          />
                          <span className="text-xs font-black text-slate-700 dark:text-slate-350">{m}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {editorTab === "media" && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center bg-muted dark:border-slate-850 dark:bg-slate-900/50">
                      <Video className="size-8 mx-auto text-slate-400" />
                      <p className="mt-3 text-xs font-black text-slate-600 dark:text-slate-350">Uploader Simulation Console</p>
                      <p className="mt-1 text-[10px] font-bold text-slate-400 leading-normal">
                        Select banners, thumbnails, or intro mock assets. File path triggers preview instantly.
                      </p>
                      <button type="button" onClick={() => toast.success("Selected file: company-mock-banner.png")} className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                        Choose File
                      </button>
                    </div>
                  </div>
                )}
              </form>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="h-11 rounded-xl px-5 text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850"
                >
                  Close
                </button>
                <button
                  onClick={saveCourse}
                  className="h-11 rounded-xl bg-primary px-6 text-xs font-black text-white hover:bg-opacity-90 dark:bg-cyan-400 dark:text-primary"
                >
                  Save Course Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
