import { useState } from "react";
import {
  FileText,
  MessageSquare,
  HelpCircle,
  Plus,
  X,
  Edit2,
  Trash2,
  Image,
  ChevronRight,
  TrendingUp,
  Award,
  Globe,
  Settings,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface BlogRecord {
  id: string;
  title: string;
  category: string;
  author: string;
  date: string;
  status: "Published" | "Draft";
  views: number;
}

const initialBlogs: BlogRecord[] = [
  { id: "B-201", title: "Top Full Stack Trends in Indian Tech Ecosystem (2026)", category: "Development", author: "Rahul Sharma", date: "May 28, 2026", status: "Published", views: 1240 },
  { id: "B-202", title: "Why Cloud AWS Certification is Critical for Freshers", category: "Cloud", author: "Amit Singh", date: "May 25, 2026", status: "Published", views: 980 },
  { id: "B-203", title: "The Power of Prompt Engineering in Data Science Workflows", category: "Data Science", author: "Neha Verma", date: "May 20, 2026", status: "Draft", views: 0 },
];

interface FAQRecord {
  id: number;
  question: string;
  answer: string;
  category: string;
}

const initialFAQs: FAQRecord[] = [
  { id: 1, question: "Do you guarantee 100% placements support?", answer: "Yes, we provide extensive placement support including direct hiring partner referrals, resume builders and counseling mock interviews.", category: "Placements" },
  { id: 2, question: "Can non-IT freshers transition to Full Stack roles?", answer: "Absolutely. Our program curriculum is structured from scratch. Over 40% of our successful cohorts come from non-IT backgrounds.", category: "Eligibility" },
];

export default function AdminCMSPage() {
  const [blogs, setBlogs] = useState<BlogRecord[]>(initialBlogs);
  const [faqs, setFaqs] = useState<FAQRecord[]>(initialFAQs);
  const [activeSubTab, setActiveSubTab] = useState<"homepage" | "blogs" | "faqs">("homepage");
  
  // Blog form states
  const [blogEditorOpen, setBlogEditorOpen] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState<BlogRecord | null>(null);

  // FAQ states
  const [newFAQQuestion, setNewFAQQuestion] = useState("");
  const [newFAQAnswer, setNewFAQAnswer] = useState("");
  const [faqModalOpen, setFaqModalOpen] = useState(false);

  const handleEditBlog = (blog: BlogRecord) => {
    setSelectedBlog(blog);
    setBlogEditorOpen(true);
  };

  const handleCreateBlog = () => {
    setSelectedBlog({
      id: `B-${200 + blogs.length + 1}`,
      title: "",
      category: "Development",
      author: "Rahul Sharma",
      date: "June 01, 2026",
      status: "Draft",
      views: 0,
    });
    setBlogEditorOpen(true);
  };

  const handleSaveBlog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBlog) return;

    if (blogs.some(b => b.id === selectedBlog.id)) {
      setBlogs(blogs.map(b => b.id === selectedBlog.id ? selectedBlog : b));
      toast.success("Blog article updated.");
    } else {
      setBlogs([selectedBlog, ...blogs]);
      toast.success("Blog article drafted.");
    }
    setBlogEditorOpen(false);
  };

  const handleCreateFAQ = (e: React.FormEvent) => {
    e.preventDefault();
    const newFAQ: FAQRecord = {
      id: faqs.length + 1,
      question: newFAQQuestion,
      answer: newFAQAnswer,
      category: "General",
    };
    setFaqs([...faqs, newFAQ]);
    setFaqModalOpen(false);
    setNewFAQQuestion("");
    setNewFAQAnswer("");
    toast.success("New FAQ query appended.");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#0F2B7A] dark:text-cyan-200">
            Content Management System (CMS)
          </h1>
          <p className="mt-1 text-sm font-semibold text-[#64748B] dark:text-[#94A3B8]">
            Update active homepage modules, publish authority industry articles, compile FAQs list and set SEO settings variables.
          </p>
        </div>
        <div className="flex gap-2">
          {activeSubTab === "blogs" && (
            <button
              onClick={handleCreateBlog}
              className="flex h-11 items-center gap-2 rounded-xl bg-[#0F2B7A] px-5 text-xs font-black text-white dark:bg-cyan-400 dark:text-[#0F2B7A]"
            >
              <Plus className="size-4" />
              <span>Draft Blog</span>
            </button>
          )}
          {activeSubTab === "faqs" && (
            <button
              onClick={() => setFaqModalOpen(true)}
              className="flex h-11 items-center gap-2 rounded-xl bg-[#0F2B7A] px-5 text-xs font-black text-white dark:bg-cyan-400 dark:text-[#0F2B7A]"
            >
              <Plus className="size-4" />
              <span>Create FAQ</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#DDE7F6] dark:border-slate-800">
        {[
          { id: "homepage", label: "Homepage Editor", icon: Globe },
          { id: "blogs", label: "Editorial Articles", count: blogs.length, icon: FileText },
          { id: "faqs", label: "FAQs Registry", count: faqs.length, icon: HelpCircle }
        ].map((tb) => {
          const TabIcon = tb.icon;
          return (
            <button
              key={tb.id}
              onClick={() => setActiveSubTab(tb.id as any)}
              className={[
                "py-3.5 px-5 text-xs font-black border-b-2 transition-all flex items-center gap-2",
                activeSubTab === tb.id
                  ? "border-[#0F2B7A] text-[#0F2B7A] dark:border-cyan-400 dark:text-cyan-300"
                  : "border-transparent text-slate-450 hover:text-[#0F2B7A] dark:hover:text-white",
              ].join(" ")}
            >
              <TabIcon className="size-4" />
              <span>{tb.label}</span>
              {tb.count !== undefined && (
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] dark:bg-slate-800">{tb.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Homepage Editor Tab */}
      {activeSubTab === "homepage" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-[#DDE7F6] bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-base font-black text-[#0F2B7A] dark:text-cyan-200">Landing Page Hero Banner</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400">Hero Main Title (Large Screen)</label>
                <input
                  defaultValue="Unlock Your Career Potential in Indian Tech"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400">Hero Subtext Description</label>
                <textarea
                  rows={3}
                  defaultValue="Join elite tech programs backed by 150+ hiring corporate recruiters. Master coding, analytics or design, and clear placement thresholds successfully."
                  className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 text-sm font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>
            <div className="flex justify-end pt-3 border-t border-slate-50 dark:border-slate-850">
              <button
                onClick={() => toast.success("Homepage Hero edits committed.")}
                className="h-10 rounded-xl bg-[#0F2B7A] px-5 text-xs font-black text-white dark:bg-cyan-400 dark:text-[#0F2B7A]"
              >
                Commit Changes
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[#DDE7F6] bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-base font-black text-[#0F2B7A] dark:text-cyan-200">Rearrange Active Success Testimonials</h3>
            <p className="text-xs font-semibold text-slate-400 leading-normal">
              Select student case card highlights featured prominently on the marketing landing platform page.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {["Neha Verma placed at TCS", "Rahul Sharma placed at Infosys", "Priya Sharma placed at Deloitte"].map((story) => (
                <label key={story} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-4 bg-[#F8FAFC] dark:border-slate-850 dark:bg-slate-950 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-slate-200 text-[#0F2B7A]" />
                  <span className="text-xs font-black text-slate-700 dark:text-slate-350">{story}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Blogs Editorial Tab */}
      {activeSubTab === "blogs" && (
        <div className="rounded-3xl border border-[#DDE7F6] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DDE7F6] bg-[#EEF3FA]/40 text-[10px] font-black uppercase tracking-wider text-[#64748B] dark:border-slate-850 dark:bg-slate-900/50">
                  <th className="px-6 py-4">Article Title</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Author</th>
                  <th className="px-6 py-4">Publish Date</th>
                  <th className="px-6 py-4">Page Views</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE7F6] dark:divide-slate-850">
                {blogs.map((b) => (
                  <tr key={b.id} className="text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                          <Image className="size-4" />
                        </div>
                        <span className="font-black text-[#0F2B7A] dark:text-white truncate max-w-xs">{b.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-850 dark:text-slate-400">
                        {b.category}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 font-bold text-slate-500">{b.author}</td>
                    <td className="px-6 py-4.5 text-slate-450">{b.date}</td>
                    <td className="px-6 py-4.5 font-black">{b.views.toLocaleString()}</td>
                    <td className="px-6 py-4.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                        b.status === "Published"
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20"
                          : "bg-amber-50 text-amber-600 dark:bg-amber-950/20"
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-right">
                      <button
                        onClick={() => handleEditBlog(b)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                      >
                        <Edit2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FAQs Tab */}
      {activeSubTab === "faqs" && (
        <div className="grid gap-6 md:grid-cols-2">
          {faqs.map((faq) => (
            <div key={faq.id} className="rounded-3xl border border-[#DDE7F6] bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase text-slate-500 dark:bg-slate-800">
                  {faq.category}
                </span>
                <span className="text-[10px] font-bold text-slate-400">FAQ-{faq.id}</span>
              </div>
              <h4 className="text-xs font-black text-[#0F2B7A] dark:text-white leading-normal pr-8">
                {faq.question}
              </h4>
              <p className="text-xs font-bold text-slate-500 leading-relaxed">
                {faq.answer}
              </p>
              <button
                onClick={() => {
                  setFaqs(faqs.filter(f => f.id !== faq.id));
                  toast.error("FAQ item removed.");
                }}
                className="absolute right-4 bottom-4 rounded-lg p-1.5 text-slate-350 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Blog Article Editor Drawer */}
      <AnimatePresence>
        {blogEditorOpen && selectedBlog && (
          <div className="fixed inset-0 z-50 flex justify-end bg-[#020617]/50 backdrop-blur-xs">
            <button className="absolute inset-0 cursor-default" onClick={() => setBlogEditorOpen(false)} />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-[#DDE7F6] bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-850">
                <div>
                  <h3 className="text-lg font-black text-[#0F2B7A] dark:text-white">Blog article builder</h3>
                  <p className="text-xs font-semibold text-slate-400">Author search engine optimized authority tech content.</p>
                </div>
                <button onClick={() => setBlogEditorOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
                  <X className="size-5" />
                </button>
              </div>

              {/* Form scrollable */}
              <form onSubmit={handleSaveBlog} className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-350">Article Title</label>
                  <input
                    required
                    value={selectedBlog.title}
                    onChange={(e) => setSelectedBlog({ ...selectedBlog, title: e.target.value })}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-350">Category Topic</label>
                    <select
                      value={selectedBlog.category}
                      onChange={(e) => setSelectedBlog({ ...selectedBlog, category: e.target.value })}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    >
                      <option>Development</option>
                      <option>Cloud</option>
                      <option>Data Science</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-350">Status State</label>
                    <select
                      value={selectedBlog.status}
                      onChange={(e) => setSelectedBlog({ ...selectedBlog, status: e.target.value as any })}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    >
                      <option>Draft</option>
                      <option>Published</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-350">Article Body Content</label>
                  <textarea
                    rows={8}
                    defaultValue="This comprehensive article outlines core technology trends affecting candidate placements in 2026. Micro-services architectures and prompt logic integrations remain vital..."
                    className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </form>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-850">
                <button type="button" onClick={() => setBlogEditorOpen(false)} className="h-11 rounded-xl px-5 text-xs font-black text-slate-500">Cancel</button>
                <button onClick={handleSaveBlog} className="h-11 rounded-xl bg-[#0F2B7A] px-6 text-xs font-black text-white dark:bg-cyan-400 dark:text-[#0F2B7A]">Save Draft</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FAQ Creation Overlay Modal */}
      <AnimatePresence>
        {faqModalOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-[#020617]/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border border-[#DDE7F6] bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-850">
                <h3 className="text-base font-black text-[#0F2B7A] dark:text-white font-display">Create FAQ Query Entry</h3>
                <button onClick={() => setFaqModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleCreateFAQ} className="mt-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-350">FAQ Question Title</label>
                  <input
                    required
                    value={newFAQQuestion}
                    onChange={(e) => setNewFAQQuestion(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-350">Detailed FAQ Answer</label>
                  <textarea
                    required
                    rows={4}
                    value={newFAQAnswer}
                    onChange={(e) => setNewFAQAnswer(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-5">
                  <button type="button" onClick={() => setFaqModalOpen(false)} className="h-11 rounded-xl px-5 text-xs font-black text-slate-500">Cancel</button>
                  <button type="submit" className="h-11 rounded-xl bg-[#0F2B7A] px-6 text-xs font-black text-white dark:bg-cyan-400 dark:text-[#0F2B7A]">Append FAQ</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
