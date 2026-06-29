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
  Award,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { courses as initialCourses, courseCategories } from "@/data/platform";

interface CourseRecord {
  slug: string;
  title: string;
  category: string;
  students: number;
  revenue: number;
  status: "Published" | "Draft" | "Archived";
  duration: string;
  mentor: string;
  price: number;
  discount: string;
  skills: string[];
}

// Pre-fill realistic operations metrics for initial courses
const initialCourseRecords: CourseRecord[] = initialCourses.map((c, idx) => ({
  slug: c.slug,
  title: c.title,
  category: c.category,
  students: 120 + idx * 85,
  revenue: (120 + idx * 85) * (c.price / 100000), // represented in lakhs
  status: idx % 4 === 0 ? "Draft" : idx % 6 === 0 ? "Archived" : "Published",
  duration: c.duration,
  mentor: c.mentor,
  price: c.price,
  discount: c.discount ?? "Save 20%",
  skills: c.skills,
}));

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<CourseRecord[]>(initialCourseRecords);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedCourse, setSelectedCourse] = useState<CourseRecord | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<"basic" | "curriculum" | "pricing" | "seo" | "mentors" | "placement" | "certificate" | "media">("basic");
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);

  // Search and Filter logic
  const filteredCourses = courses.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || c.mentor.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "All Categories" || c.category === categoryFilter;
    const matchesStatus = statusFilter === "All" || c.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleEdit = (course: CourseRecord) => {
    setSelectedCourse(course);
    setEditorTab("basic");
    setEditorOpen(true);
    setActiveActionMenu(null);
  };

  const handleCreate = () => {
    setSelectedCourse({
      slug: "",
      title: "",
      category: "Full Stack Development",
      students: 0,
      revenue: 0,
      status: "Draft",
      duration: "4 Months",
      mentor: "Rahul Sharma",
      price: 29999,
      discount: "Save 30%",
      skills: [],
    });
    setEditorTab("basic");
    setEditorOpen(true);
  };

  const handleDuplicate = (course: CourseRecord) => {
    const duplicated: CourseRecord = {
      ...course,
      title: `${course.title} (Copy)`,
      slug: `${course.slug}-copy`,
      students: 0,
      revenue: 0,
      status: "Draft",
    };
    setCourses([duplicated, ...courses]);
    toast.success(`Duplicated "${course.title}" successfully.`);
    setActiveActionMenu(null);
  };

  const handleDelete = (slug: string) => {
    setCourses(courses.filter((c) => c.slug !== slug));
    toast.error("Course deleted from active dashboard state.");
    setActiveActionMenu(null);
  };

  const handleStatusChange = (slug: string, newStatus: "Published" | "Draft" | "Archived") => {
    setCourses(
      courses.map((c) => (c.slug === slug ? { ...c, status: newStatus } : c))
    );
    toast.success(`Course status updated to ${newStatus}.`);
    setActiveActionMenu(null);
  };

  const saveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;

    if (courses.some((c) => c.slug === selectedCourse.slug)) {
      setCourses(courses.map((c) => (c.slug === selectedCourse.slug ? selectedCourse : c)));
      toast.success(`Course "${selectedCourse.title}" updated successfully.`);
    } else {
      const newRecord = {
        ...selectedCourse,
        slug: selectedCourse.title.toLowerCase().replaceAll(" ", "-"),
      };
      setCourses([newRecord, ...courses]);
      toast.success(`Course "${selectedCourse.title}" added to directory.`);
    }
    setEditorOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#111E79] dark:text-cyan-200">
            Academics Catalogue Management
          </h1>
          <p className="mt-1 text-sm font-semibold text-[#64748B] dark:text-[#94A3B8]">
            Author curriculum tracks, categorize programs, specify certifications, and map mentor profiles.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex h-11 items-center gap-2 rounded-xl bg-[#111E79] px-5 text-xs font-black text-white hover:bg-opacity-90 shadow-lg shadow-[#111e79]/15 dark:bg-cyan-400 dark:text-[#111E79]"
        >
          <Plus className="size-4" />
          <span>Create Course</span>
        </button>
      </div>

      {/* Stats Counter Row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          { label: "Active Courses", count: courses.filter(c => c.status === "Published").length, color: "text-[#111E79]" },
          { label: "Draft Programs", count: courses.filter(c => c.status === "Draft").length, color: "text-amber-500" },
          { label: "Archived Tracks", count: courses.filter(c => c.status === "Archived").length, color: "text-slate-400" },
          { label: "Total Programs", count: courses.length, color: "text-cyan-600" }
        ].map(st => (
          <div key={st.label} className="rounded-2xl border border-[#DDE7F6] bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{st.label}</p>
            <p className={`mt-1.5 text-2xl font-black ${st.color}`}>{st.count}</p>
          </div>
        ))}
      </div>

      {/* Filters & Search Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#DDE7F6] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#111E79] dark:text-cyan-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search programs, tags, mentors..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-10 pr-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-[#111E79] dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>

        {/* Category Dropdown */}
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-4 text-xs font-black text-[#111E79] outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white md:w-56"
          >
            <option>All Categories</option>
            {courseCategories.filter(c => c !== "All Categories").map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Status Dropdown */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-4 text-xs font-black text-[#111E79] outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white md:w-36"
          >
            <option value="All">All Status</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Courses Catalog Table */}
      <div className="overflow-hidden rounded-2xl border border-[#DDE7F6] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#DDE7F6] bg-[#EEF3FA]/40 text-[10px] font-black uppercase tracking-wider text-[#64748B] dark:border-slate-850 dark:bg-slate-900/50">
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Assigned Mentor</th>
                <th className="px-6 py-4">Students Enrolled</th>
                <th className="px-6 py-4">Gross Revenue</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE7F6] dark:divide-slate-850">
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm font-semibold text-slate-400">
                    No programs matched the criteria.
                  </td>
                </tr>
              ) : (
                filteredCourses.map((c) => (
                  <tr
                    key={c.slug}
                    className="group transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/10"
                  >
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-3">
                        <div className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-[#111E79] to-blue-800 text-white font-black text-xs">
                          {c.title.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-black text-[#111E79] dark:text-slate-100">
                            {c.title}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400">{c.duration}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4.5">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-[#94A3B8]">
                        {c.category}
                      </span>
                    </td>
                    <td className="px-6 py-4.5">
                      <p className="text-xs font-bold text-[#111E79] dark:text-slate-350">{c.mentor}</p>
                    </td>
                    <td className="px-6 py-4.5 text-xs font-black">{c.students.toLocaleString()}</td>
                    <td className="px-6 py-4.5 text-xs font-black text-[#111E79] dark:text-white">
                      ₹{c.revenue.toFixed(1)}L
                    </td>
                    <td className="px-6 py-4.5">
                      <span
                        className={[
                          "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider",
                          c.status === "Published"
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                            : c.status === "Draft"
                            ? "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                        ].join(" ")}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-right relative">
                      <button
                        onClick={() => setActiveActionMenu(activeActionMenu === c.slug ? null : c.slug)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <MoreVertical className="size-4" />
                      </button>

                      {/* Floating Dropdown Action Menu */}
                      <AnimatePresence>
                        {activeActionMenu === c.slug && (
                          <>
                            <button
                              type="button"
                              className="fixed inset-0 z-10 cursor-default"
                              onClick={() => setActiveActionMenu(null)}
                            />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute right-6 top-12 z-20 w-44 rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-950"
                            >
                              <button
                                onClick={() => handleEdit(c)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-black text-slate-700 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-900"
                              >
                                <Edit2 className="size-3.5 text-[#111E79]" />
                                <span>Edit Course</span>
                              </button>
                              <button
                                onClick={() => handleDuplicate(c)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-black text-slate-700 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-900"
                              >
                                <Copy className="size-3.5 text-blue-500" />
                                <span>Duplicate</span>
                              </button>
                              <div className="my-1 border-t border-slate-100 dark:border-slate-900" />
                              <button
                                onClick={() => handleStatusChange(c.slug, "Published")}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-bold text-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/15"
                              >
                                <Globe className="size-3.5" />
                                <span>Publish</span>
                              </button>
                              <button
                                onClick={() => handleStatusChange(c.slug, "Archived")}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-bold text-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-950/15"
                              >
                                <Archive className="size-3.5" />
                                <span>Archive</span>
                              </button>
                              <button
                                onClick={() => handleDelete(c.slug)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-950/15"
                              >
                                <Trash2 className="size-3.5" />
                                <span>Delete</span>
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
      </div>

      {/* Slide-out Course Editor Panel */}
      <AnimatePresence>
        {editorOpen && selectedCourse && (
          <div className="fixed inset-0 z-50 flex justify-end bg-[#020617]/50 backdrop-blur-xs">
            {/* Overlay click */}
            <button
              type="button"
              aria-label="Close editor"
              className="absolute inset-0 cursor-default"
              onClick={() => setEditorOpen(false)}
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-[#DDE7F6] bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-850">
                <div>
                  <h3 className="text-lg font-black text-[#111E79] dark:text-white">
                    {selectedCourse.title ? "Program Workshop Details" : "Construct New Academic Track"}
                  </h3>
                  <p className="text-xs font-semibold text-slate-400">
                    Draft curriculum outlines, certifications templates and SEO metrics.
                  </p>
                </div>
                <button
                  onClick={() => setEditorOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Form Tabs Controller */}
              <div className="flex border-b border-slate-100 overflow-x-auto hide-scrollbar px-6 dark:border-slate-850">
                {[
                  { id: "basic", label: "Basic Info" },
                  { id: "curriculum", label: "Curriculum" },
                  { id: "pricing", label: "Pricing" },
                  { id: "seo", label: "SEO Settings" },
                  { id: "mentors", label: "Mentors" },
                  { id: "placement", label: "Placements" },
                  { id: "certificate", label: "Certificate" },
                  { id: "media", label: "Media Assets" },
                ].map((tb) => (
                  <button
                    key={tb.id}
                    onClick={() => setEditorTab(tb.id as typeof editorTab)}
                    className={[
                      "shrink-0 py-3.5 px-3.5 text-xs font-black transition-all border-b-2",
                      editorTab === tb.id
                        ? "border-[#111E79] text-[#111E79] dark:border-cyan-400 dark:text-cyan-300"
                        : "border-transparent text-slate-400 hover:text-[#111E79] dark:hover:text-white",
                    ].join(" ")}
                  >
                    {tb.label}
                  </button>
                ))}
              </div>

              {/* Form content scrollable area */}
              <form onSubmit={saveCourse} className="flex-1 overflow-y-auto p-6 space-y-6">
                {editorTab === "basic" && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-[#111E79] dark:text-slate-350">Course Title</label>
                      <input
                        required
                        value={selectedCourse.title}
                        onChange={(e) => setSelectedCourse({ ...selectedCourse, title: e.target.value })}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                        placeholder="e.g. Master Full Stack Engineering"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-[#111E79] dark:text-slate-350">Academic Category</label>
                        <select
                          value={selectedCourse.category}
                          onChange={(e) => setSelectedCourse({ ...selectedCourse, category: e.target.value })}
                          className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                        >
                          {courseCategories.filter(c => c !== "All Categories").map(cat => (
                            <option key={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-[#111E79] dark:text-slate-350">Duration Length</label>
                        <input
                          required
                          value={selectedCourse.duration}
                          onChange={(e) => setSelectedCourse({ ...selectedCourse, duration: e.target.value })}
                          className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                          placeholder="e.g. 6 Months"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-[#111E79] dark:text-slate-350">Academic Outcomes / Skills (Comma Separated)</label>
                      <input
                        value={selectedCourse.skills.join(", ")}
                        onChange={(e) => setSelectedCourse({ ...selectedCourse, skills: e.target.value.split(", ") })}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                        placeholder="React, Next.js, Node, Docker"
                      />
                    </div>
                  </div>
                )}

                {editorTab === "curriculum" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-[#111E79] dark:text-cyan-200">Curriculum Module Syllabus Builder</h4>
                      <button
                        type="button"
                        onClick={() => toast.success("Added new dynamic curriculum slot.")}
                        className="flex items-center gap-1 text-[10px] font-black text-cyan-600 uppercase"
                      >
                        <PlusCircle className="size-3.5" />
                        <span>Add Module</span>
                      </button>
                    </div>

                    {["Frontend Foundations", "Backend Systems & Orchestrations", "Job Preparation & Capstones"].map((mod, index) => (
                      <div key={mod} className="rounded-xl border border-slate-100 bg-[#F8FAFC] p-4 space-y-3 dark:border-slate-800 dark:bg-slate-900/50">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-[#111E79] dark:text-slate-300">Module {index + 1}: {mod}</p>
                          <button type="button" className="text-[10px] font-black text-rose-500 uppercase">Remove</button>
                        </div>
                        <input className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" value={mod} readOnly />
                      </div>
                    ))}
                  </div>
                )}

                {editorTab === "pricing" && (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-[#111E79] dark:text-slate-350">Course Base Price (INR)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">₹</span>
                          <input
                            type="number"
                            required
                            value={selectedCourse.price}
                            onChange={(e) => setSelectedCourse({ ...selectedCourse, price: Number(e.target.value) })}
                            className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] pl-8 pr-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-[#111E79] dark:text-slate-350">Discount Subtitle</label>
                        <input
                          required
                          value={selectedCourse.discount}
                          onChange={(e) => setSelectedCourse({ ...selectedCourse, discount: e.target.value })}
                          className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                          placeholder="e.g. Save 30%"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {editorTab === "seo" && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-[#111E79] dark:text-slate-350">SEO Title Tag</label>
                      <input
                        className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                        placeholder="SEO optimised meta title"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-[#111E79] dark:text-slate-350">SEO Description</label>
                      <textarea
                        rows={4}
                        className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                        placeholder="Compelling page meta description..."
                      />
                    </div>
                  </div>
                )}

                {editorTab === "mentors" && (
                  <div className="space-y-4">
                    <label className="text-xs font-black text-[#111E79] dark:text-slate-350">Assign Instructors/Faculty Mentors</label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {["Rahul Sharma", "Neha Verma", "Amit Singh", "Pooja Rao"].map((m) => (
                        <label key={m} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-[#F8FAFC] p-3 cursor-pointer dark:border-slate-800 dark:bg-slate-900/50">
                          <input
                            type="checkbox"
                            checked={selectedCourse.mentor === m}
                            onChange={() => setSelectedCourse({ ...selectedCourse, mentor: m })}
                            className="rounded border-slate-200 text-[#111E79] focus:ring-[#111E79]"
                          />
                          <span className="text-xs font-black text-slate-700 dark:text-slate-350">{m}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {editorTab === "placement" && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-[#111E79] dark:text-slate-350">Placement Support Guarantee Level</label>
                      <select className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                        <option>100% Direct Referrals & Mock Interviews</option>
                        <option>Curriculum Portfolio Reviews & Mentoring</option>
                        <option>Standard Job Board Placement Alerts</option>
                      </select>
                    </div>
                  </div>
                )}

                {editorTab === "certificate" && (
                  <div className="space-y-4">
                    <label className="text-xs font-black text-[#111E79] dark:text-slate-350">Included Certificate Template</label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {["Standard EdTech Certificate", "Premium PG-Diploma layout"].map((cert, index) => (
                        <div key={cert} className="rounded-2xl border border-slate-200 p-4 bg-slate-50 text-center dark:border-slate-800 dark:bg-slate-900">
                          <Award className="size-8 mx-auto text-[#111E79] dark:text-cyan-300" />
                          <p className="mt-3 text-xs font-black text-slate-700 dark:text-slate-350">{cert}</p>
                          <input type="radio" name="cert" defaultChecked={index === 0} className="mt-2.5 cursor-pointer text-[#111E79]" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {editorTab === "media" && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center bg-[#F8FAFC] dark:border-slate-850 dark:bg-slate-900/50">
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

              {/* Footer */}
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
                  className="h-11 rounded-xl bg-[#111E79] px-6 text-xs font-black text-white hover:bg-opacity-90 dark:bg-cyan-400 dark:text-[#111E79]"
                >
                  Save Catalogue Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
