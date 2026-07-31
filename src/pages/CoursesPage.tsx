import { useState, useTransition, useMemo, useEffect, lazy, Suspense } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  BarChart3,
  Palette,
  MessageCircle,
  DollarSign,
  TrendingUp,
  Users,
  Heart,
  Sparkles,
  Rocket,
  Layers,
  Image,
  ShieldCheck,
  Activity,
  Globe,
  Cpu,
  Handshake,
  CreditCard,
  Video,
  Briefcase,
  Plane,
  GraduationCap,
  FileCheck,
  Leaf,
  Award,
  ArrowRight,
  Sparkle,
  Bookmark,
  CheckCircle2,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { GsapReveal } from "@/components/motion/gsap-reveal";
import { usePageMeta } from "@/hooks/usePageMeta";
import { assetUrl } from "@/lib/asset-url";
import { coursesData, courseCategoriesList } from "@/data/coursesData";
import { submitLead } from "@/services/leads";

function getFormString(form: FormData, key: string, fallback = "") {
  const value = form.get(key);
  return typeof value === "string" ? value : fallback;
}

// Icon Mapper Utility
const iconMap: Record<string, typeof Bookmark> = {
  BrainCircuit,
  BarChart3,
  Palette,
  MessageCircle,
  DollarSign,
  TrendingUp,
  Users,
  Heart,
  Sparkles,
  Rocket,
  Layers,
  Image,
  ShieldCheck,
  Activity,
  Globe,
  Cpu,
  Handshake,
  CreditCard,
  Video,
  Briefcase,
  Plane,
  GraduationCap,
  FileCheck,
  Leaf,
  Award,
};

function CategoryIcon({ name, className }: Readonly<{ name: string; className?: string }>) {
  const IconComponent = iconMap[name] || BookmarksIconFallback;
  return <IconComponent className={className} />;
}

function BookmarksIconFallback({ className }: Readonly<{ className?: string }>) {
  return <Bookmark className={className} />;
}

// Highlighter component for searched queries
function HighlightedText({ text, query }: Readonly<{ text: string; query: string }>) {
  if (!query.trim()) {
    return <span>{text}</span>;
  }
  const regex = new RegExp(`(${query.replace(/[-\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 text-[#111E79] dark:text-white rounded px-0.5 font-black">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

const CourseHeroScene = lazy(() => import("@/components/visuals/CourseHeroScene").then((module) => ({ default: module.CourseHeroScene })));

export default function CoursesPage() {
  usePageMeta("Courses & Career Tracks");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [counsellingModalOpen, setCounsellingModalOpen] = useState(false);
  const [selectedCourseForModal, setSelectedCourseForModal] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Handle mock loading skeletons when user types search
  useEffect(() => {
    if (searchQuery) {
      setTimeout(() => setIsLoading(true), 0);
      const timer = setTimeout(() => setIsLoading(false), 300);
      return () => clearTimeout(timer);
    }
   
  }, [searchQuery]);

  // Expand categories by default if there is a search query
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      startTransition(() => {
        const allTrue: Record<string, boolean> = {};
        courseCategoriesList.forEach((cat) => {
          allTrue[cat.id] = true;
        });
        setExpandedCategories(allTrue);
      });
    }
   
  }, [searchQuery]);

  // Toggle single category expand state
  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Expand All / Collapse All Utility
  const expandAll = () => {
    const allTrue: Record<string, boolean> = {};
    courseCategoriesList.forEach((cat) => {
      allTrue[cat.id] = true;
    });
    setExpandedCategories(allTrue);
    toast.success("All categories expanded.");
  };

  const collapseAll = () => {
    setExpandedCategories({});
    toast.success("All categories collapsed.");
  };

  // Filtered courses based on Search Query & Category Select
  const filteredCourses = useMemo(() => {
    return coursesData.filter((course) => {
      const matchesCategory = activeCategory === "All" || course.categoryId === activeCategory;
      const matchesSearch =
        course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.skills.some((sk) => sk.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  // Highlighted high demand courses array for 2026 Special Section
  const featuredCourses = useMemo(() => {
    return coursesData.filter((c) => c.isFeatured2026);
  }, []);

  const [submittingCounselling, setSubmittingCounselling] = useState(false);

  const handleLearnMore = (courseName: string) => {
    setSelectedCourseForModal(courseName);
    setCounsellingModalOpen(true);
  };

  const submitCounsellingForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setSubmittingCounselling(true);
    try {
      await submitLead("contact", {
        fullName: getFormString(data, "fullName"),
        email: getFormString(data, "email"),
        phone: getFormString(data, "phone"),
        subject: `Course enquiry: ${selectedCourseForModal ?? "General"}`,
        message: `Pre-qualification status: ${getFormString(data, "status")}`,
        consent: data.get("consent") === "on",
        website: "",
      });
      form.reset();
      setCounsellingModalOpen(false);
      toast.success("Request submitted. Our counselling team will contact you within 24 hours.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit request. Please try again.");
    } finally {
      setSubmittingCounselling(false);
    }
  };

  return (
    <main className="page-shell">
      {/* 1. Brand Hero Section */}
      <section className="course-market-hero relative isolate overflow-hidden bg-white px-4 py-10 sm:px-6 lg:px-8 lg:py-16 dark:bg-[#020817]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_20%,rgba(25,217,255,0.18),transparent_24rem)]" />
        <Suspense fallback={null}>
          <CourseHeroScene />
        </Suspense>
        <div className="relative mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <GsapReveal className="premium-reveal">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#5B35F2] dark:text-cyan-300">
              Education Platform
            </p>
            <h1 className="mt-5 text-4xl font-black leading-tight text-[#111E79] sm:text-6xl dark:text-white">
              SaaS Tech & Business <span className="block text-[#5B35F2] dark:text-cyan-400">Education Catalogue</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-[#64748B] dark:text-slate-400">
              Explore 32 specialized learning domains, verified credentials, and strategic placement roadmaps for 2026.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["60+", "Specialized Courses"],
                ["15,000+", "Students Trained"],
                ["500+", "Recruiting Partners"],
                ["95.4%", "Placement Rate"],
              ].map(([value, label]) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-full bg-[#F1F5FF] text-[#5B35F2] dark:bg-slate-800 dark:text-cyan-400">
                    <CheckCircle2 className="size-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-lg font-black text-[#111E79] dark:text-white">{value}</span>
                    <span className="text-xs font-semibold text-[#64748B] dark:text-slate-400">{label}</span>
                  </span>
                </div>
              ))}
            </div>
          </GsapReveal>
          <GsapReveal className="premium-reveal relative">
            <div className="course-hero-visual premium-parallax">
              <img src={assetUrl("/assets/home/career-counselling-hero.png")} alt="" className="mx-auto max-h-[360px] w-full object-contain" />
            </div>
          </GsapReveal>
        </div>
      </section>

      {/* 2. Top High-Demand Featured Courses Section */}
      <section className="bg-gradient-to-b from-white to-[#F8FAFF] py-16 px-4 sm:px-6 lg:px-8 dark:from-[#020817] dark:to-[#090d1a]">
        <div className="mx-auto max-w-[1280px] space-y-10">
          <GsapReveal direction="up" className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-100 px-3.5 py-1 text-xs font-black text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-400">
              <Sparkle className="size-3.5 fill-current" aria-hidden="true" />
              <span>Trending Categories</span>
            </span>
            <h2 className="mt-4 text-3xl font-black text-[#111E79] sm:text-5xl dark:text-white">
              Top High-Demand Courses for 2026
            </h2>
            <p className="mt-4 text-sm font-semibold text-slate-400 leading-relaxed max-w-xl mx-auto dark:text-slate-400">
              Master the top 15 domains highlighted by corporate recruiting teams as the highest-growth career pathways.
            </p>
          </GsapReveal>

          {/* Featured cards grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCourses.map((c) => (
              <motion.div
                key={c.id}
                whileHover={{ y: -6 }}
                className="relative overflow-hidden rounded-[24px] border border-cyan-100 bg-white p-6 shadow-sm transition-all hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Glowing Top Gradient Badge */}
                <div className="absolute right-0 top-0 h-16 w-16 bg-gradient-to-bl from-cyan-300/20 to-transparent" />

                <div className="flex items-center justify-between">
                  <span className="rounded bg-cyan-50 px-2 py-0.5 text-[10px] font-black uppercase text-cyan-600 dark:bg-cyan-950/20 dark:text-cyan-400">
                    Trending 2026
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
                    {"0" /* duration stub */}
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-black text-[#111E79] dark:text-white leading-tight">
                  {c.name}
                </h3>
                <p className="mt-2 text-xs font-bold text-slate-400">
                  Category: {c.category}
                </p>

                <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {c.summary}
                </p>

                {/* Micro details */}
                <div className="mt-6 flex flex-wrap gap-1.5">
                  {c.skills.slice(0, 3).map((sk) => (
                    <span key={sk} className="rounded bg-slate-50 px-2 py-0.5 text-[9px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {sk}
                    </span>
                  ))}
                </div>

                {/* Footer and CTA */}
                <div className="mt-6 pt-4.5 border-t border-slate-100 flex items-center justify-between dark:border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-slate-400 block line-through">₹{c.oldPrice.toLocaleString()}</span>
                    <span className="text-lg font-black text-[#111E79] dark:text-white">₹{0}</span>
                  </div>
                  <button
                    onClick={() => handleLearnMore(c.name)}
                    className="flex items-center gap-1.5 rounded-xl bg-[#111E79] px-4 py-2 text-xs font-black text-white hover:bg-opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-cyan-400 dark:text-[#111E79]"
                  >
                    <span>Enquire Now</span>
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Catalog System Section */}
      <section className="bg-[#F8FAFF] px-4 py-16 sm:px-6 lg:px-8 dark:bg-[#020617] border-t border-[#E5EAF5] dark:border-slate-900">
        <div className="mx-auto max-w-[1280px] grid gap-8 lg:grid-cols-[300px_1fr]">
          
          {/* Sticky Left Sidebar Categories filters */}
          <aside className="space-y-6 lg:sticky lg:top-24 h-max">
            <div className="rounded-3xl border border-[#E5EAF5] bg-white p-5 shadow-[0_16px_50px_rgba(10,42,136,0.06)] dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-50 pb-4.5 dark:border-slate-800">
                <h3 className="text-base font-black text-[#111E79] dark:text-white flex items-center gap-2">
                  <SlidersHorizontal className="size-4.5 text-[#5B35F2]" aria-hidden="true" />
                  <span>Domain Fields</span>
                </h3>
                <button
                  onClick={() => {
                    setActiveCategory("All");
                    toast.success("Category filter reset.");
                  }}
                  className="rounded text-xs font-black text-[#5B35F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-cyan-400"
                >
                  Reset
                </button>
              </div>

              {/* Search filter text */}
              <div className="mt-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" aria-hidden="true" />
                <label htmlFor="course-syllabus-search" className="sr-only">Search syllabus</label>
                <input
                  id="course-syllabus-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search syllabus..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-9 pr-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* Categories list */}
              <div className="mt-5 max-h-[360px] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                <button
                  onClick={() => setActiveCategory("All")}
                  aria-current={activeCategory === "All" ? "true" : undefined}
                  className={[
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    activeCategory === "All"
                      ? "bg-[#5B35F2] text-white dark:bg-cyan-400 dark:text-[#111E79]"
                      : "text-slate-600 hover:bg-[#F1F5FF] dark:text-slate-400 dark:hover:bg-slate-800",
                  ].join(" ")}
                >
                  <span>All Disciplines</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] dark:bg-slate-800 dark:text-slate-400">
                    {coursesData.length}
                  </span>
                </button>

                {courseCategoriesList.map((cat) => {
                  const catCoursesCount = coursesData.filter(c => c.categoryId === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      aria-current={activeCategory === cat.id ? "true" : undefined}
                      className={[
                        "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-black transition text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        activeCategory === cat.id
                          ? "bg-[#5B35F2] text-white dark:bg-cyan-400 dark:text-[#111E79]"
                          : "text-slate-600 hover:bg-[#F1F5FF] dark:text-slate-400 dark:hover:bg-slate-800",
                      ].join(" ")}
                    >
                      <span className="truncate pr-2">{cat.name}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] dark:bg-slate-800 dark:text-slate-400 shrink-0">
                        {catCoursesCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Expand/Collapse controller buttons */}
              <div className="mt-5 pt-4 border-t border-slate-50 dark:border-slate-800 grid grid-cols-2 gap-2">
                <button
                  onClick={expandAll}
                  className="h-8.5 rounded-lg border border-slate-200 text-[10px] font-black text-slate-500 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-slate-800 dark:hover:bg-slate-800"
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAll}
                  className="h-8.5 rounded-lg border border-slate-200 text-[10px] font-black text-slate-500 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-slate-800 dark:hover:bg-slate-800"
                >
                  Collapse All
                </button>
              </div>
            </div>
          </aside>

          {/* Right course listings */}
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-black text-[#111E79] dark:text-white">Courses Catalogue</h3>
                <p className="text-xs font-semibold text-slate-400 mt-1">
                  Matching courses count: <span className="text-[#5B35F2] dark:text-cyan-400 font-black">{filteredCourses.length}</span>
                </p>
              </div>
            </div>

            {/* Skeletons loader screen */}
            {isLoading ? (
              <div className="space-y-6">
                {[1, 2].map((idx) => (
                  <div key={idx} className="rounded-2xl border border-[#E5EAF5] bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-4 animate-pulse">
                    <div className="h-5 w-48 bg-slate-200 rounded dark:bg-slate-800" />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="h-28 bg-slate-100 rounded dark:bg-slate-800" />
                      <div className="h-28 bg-slate-100 rounded dark:bg-slate-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredCourses.length === 0 ? (
              /* Empty state UI */
              <div className="rounded-3xl border border-dashed border-[#E5EAF5] bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <Search className="size-10 mx-auto text-slate-400" aria-hidden="true" />
                <h4 className="text-lg font-black text-[#111E79] dark:text-white">No courses matched your query</h4>
                <p className="text-xs font-semibold text-slate-400 leading-normal max-w-sm mx-auto">
                  Try adjusting filters or checking for other spelling variations (e.g. 'Coding', 'Marketing').
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("All");
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-black text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              /* Group courses by active categories listing */
              <div className="space-y-6">
                {courseCategoriesList
                  .filter((cat) => activeCategory === "All" || cat.id === activeCategory)
                  .map((cat) => {
                    const catCourses = filteredCourses.filter((course) => course.categoryId === cat.id);
                    if (catCourses.length === 0) return null;

                    const isExpanded = expandedCategories[cat.id] !== false; // expanded by default

                    return (
                      <div
                        key={cat.id}
                        className="rounded-3xl border border-[#E5EAF5] bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900 transition-all duration-350"
                      >
                        {/* Expandable Category Header bar */}
                        <button
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          aria-expanded={isExpanded}
                          aria-controls={`course-category-panel-${cat.id}`}
                          className="flex w-full items-center justify-between px-6 py-4.5 bg-slate-50/50 dark:bg-slate-900/60 select-none hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset dark:hover:bg-slate-900"
                        >
                          <div className="flex items-center gap-3">
                            <span className="grid size-9 place-items-center rounded-xl bg-[#F1F5FF] text-[#5B35F2] dark:bg-slate-800 dark:text-cyan-400 shrink-0" aria-hidden="true">
                              <CategoryIcon name={cat.iconName} className="size-4.5" />
                            </span>
                            <div className="text-left">
                              <h4 className="text-sm font-black text-[#111E79] dark:text-white">
                                {cat.name}
                              </h4>
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                Expand to explore syllabus details
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black text-slate-500 dark:bg-slate-800">
                              {catCourses.length} {catCourses.length === 1 ? "Course" : "Courses"}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="size-4.5 text-slate-400" aria-hidden="true" />
                            ) : (
                              <ChevronDown className="size-4.5 text-slate-400" aria-hidden="true" />
                            )}
                          </div>
                        </button>

                        {/* Collapsible panel body containing modern cards */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              id={`course-category-panel-${cat.id}`}
                              initial={{ height: 0 }}
                              animate={{ height: "auto" }}
                              exit={{ height: 0 }}
                              className="overflow-hidden border-t border-slate-50 dark:border-slate-800"
                            >
                              <div className="p-6 grid gap-6 sm:grid-cols-2">
                                {catCourses.map((course) => (
                                  <div
                                    key={course.id}
                                    className="group relative rounded-2xl border border-slate-200 p-5 bg-white hover:border-[#5B35F2]/30 dark:border-slate-800 dark:bg-slate-950 shadow-[0_4px_20px_rgba(10,42,136,0.01)] hover:shadow-lg transition-all"
                                  >
                                    <div className="flex items-start justify-between">
                                      <span className="rounded bg-indigo-50 px-2 py-0.5 text-[9px] font-black uppercase text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400">
                                        {course.category}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-400">
                                        {"0" /* duration stub */}
                                      </span>
                                    </div>

                                    {/* Highlights searched text query */}
                                    <h5 className="mt-4 text-base font-black text-[#111E79] dark:text-white leading-tight">
                                      <HighlightedText text={course.name} query={searchQuery} />
                                    </h5>
                                    <p className="mt-2 text-xs text-slate-400 leading-relaxed font-bold">
                                      {course.summary}
                                    </p>

                                    {/* Skills metrics tags */}
                                    <div className="mt-4 flex flex-wrap gap-1">
                                      {course.skills.map((sk) => (
                                        <span key={sk} className="rounded bg-slate-50 px-1.5 py-0.5 text-[9px] font-black text-slate-400 dark:bg-slate-800">
                                          <HighlightedText text={sk} query={searchQuery} />
                                        </span>
                                      ))}
                                    </div>

                                    {/* CTA bottom */}
                                    <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                                      <div>
                                        <span className="text-[10px] font-bold text-slate-400 line-through block">₹{course.oldPrice.toLocaleString()}</span>
                                        <span className="text-base font-black text-[#111E79] dark:text-white">₹{0}</span>
                                      </div>
                                      <button
                                        onClick={() => handleLearnMore(course.name)}
                                        className="h-9 rounded-lg bg-[#111E79] px-4 text-xs font-black text-white hover:bg-opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-cyan-400 dark:text-[#111E79]"
                                      >
                                        Learn More
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Live Counselling Bookings Modal */}
      <DialogPrimitive.Root open={counsellingModalOpen} onOpenChange={setCounsellingModalOpen}>
        <AnimatePresence>
          {counsellingModalOpen && (
            <DialogPrimitive.Portal forceMount>
              <DialogPrimitive.Overlay asChild forceMount>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 grid place-items-center bg-[#020617]/50 p-4 backdrop-blur-sm"
                />
              </DialogPrimitive.Overlay>
              <DialogPrimitive.Content asChild forceMount aria-describedby={undefined}>
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[#DDE7F6] bg-white p-6 shadow-2xl outline-none dark:border-slate-800 dark:bg-slate-950"
                >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <DialogPrimitive.Title asChild>
                    <h3 className="text-base font-black text-[#111E79] dark:text-white">Book Free Counselling Session</h3>
                  </DialogPrimitive.Title>
                  <p className="text-[10px] font-semibold text-slate-400 mt-1 truncate max-w-64">
                    Course: {selectedCourseForModal}
                  </p>
                </div>
                <DialogPrimitive.Close asChild>
                  <button
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-slate-800"
                    aria-label="Close dialog"
                  >
                    <X className="size-5" aria-hidden="true" />
                  </button>
                </DialogPrimitive.Close>
              </div>

              <form onSubmit={(e) => void submitCounsellingForm(e)} className="mt-5 space-y-4">
                <div className="space-y-1">
                  <label htmlFor="counselling-name" className="text-xs font-black text-[#111E79] dark:text-slate-300">Your Full Name</label>
                  <input
                    id="counselling-name"
                    name="fullName"
                    required
                    className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    placeholder="e.g. Sameer Shah"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="counselling-email" className="text-xs font-black text-[#111E79] dark:text-slate-300">Your Email</label>
                  <input
                    id="counselling-email"
                    name="email"
                    type="email"
                    required
                    className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    placeholder="e.g. sameer@example.com"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="counselling-phone" className="text-xs font-black text-[#111E79] dark:text-slate-300">Your Primary Phone</label>
                  <input
                    id="counselling-phone"
                    name="phone"
                    required
                    className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="counselling-status" className="text-xs font-black text-[#111E79] dark:text-slate-300">Pre-qualification status</label>
                  <select id="counselling-status" name="status" className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                    <option>Fresher Graduate</option>
                    <option>Non-IT professional</option>
                    <option>Current student</option>
                  </select>
                </div>
                <label className="flex items-start gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <input type="checkbox" name="consent" required className="mt-0.5 rounded" />
                  I consent to being contacted by SkillGuru about this enquiry.
                </label>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-5 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCounsellingModalOpen(false)}
                    className="h-11 rounded-xl px-5 text-xs font-black text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCounselling}
                    className="h-11 rounded-xl bg-[#111E79] px-6 text-xs font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 dark:bg-cyan-400 dark:text-[#111E79]"
                  >
                    {submittingCounselling ? "Submitting..." : "Request Callback"}
                  </button>
                </div>
              </form>
                </motion.div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          )}
        </AnimatePresence>
      </DialogPrimitive.Root>
    </main>
  );
}
