import { useState } from "react";
import {
  Search,
  MoreVertical,
  Plus,
  X,
  Building2,
  DollarSign,
  Quote,
  Trash2,
  Edit2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useSuccessStories, useSuccessStoryMutations } from "@/hooks/useAdminData";
import type { SuccessStory } from "@/services/successStories.service";

export default function AdminSuccessStoriesPage() {
  const [search, setSearch] = useState("");
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Partial<SuccessStory> | null>(null);

  const { data: storiesData, isLoading } = useSuccessStories({ search: search || undefined });
  const stories = storiesData?.data ?? [];
  const mutations = useSuccessStoryMutations();

  // Search Logic (handled mostly by backend, but we can do extra client side if needed)
  const filteredStories = stories;

  const packageValues = stories
    .map((s) => Number.parseFloat(s.package ?? ""))
    .filter((n) => !Number.isNaN(n));
  const topPackage = packageValues.length > 0 ? Math.max(...packageValues) : null;
  const avgPackage = packageValues.length > 0 ? packageValues.reduce((a, b) => a + b, 0) / packageValues.length : null;
  const publishedCount = stories.filter((s) => s.published).length;

  const handleEdit = (story: SuccessStory) => {
    setSelectedStory(story);
    setEditorOpen(true);
    setActiveMenu(null);
  };

  const handleCreate = () => {
    setSelectedStory({
      title: "",
      job_role: "Software Engineer",
      company_name: "Wipro",
      image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop",
      full_story: "",
      package: "10 LPA",
    });
    setEditorOpen(true);
  };

  const handleDelete = (id: number) => {
    mutations.update.mutate({ id, input: { published: false } }, {
      onSuccess: () => {
        toast.error("Success story unpublished.");
        setActiveMenu(null);
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to unpublish success story."),
    });
  };

  const saveStory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStory) return;

    if (selectedStory.id) {
      mutations.update.mutate({ id: selectedStory.id, input: selectedStory }, {
        onSuccess: () => {
          toast.success(`Success story "${selectedStory.title}" updated.`);
          setEditorOpen(false);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update success story."),
      });
    } else {
      const newStory = {
        ...selectedStory,
        created_at: selectedStory.created_at || new Date().toISOString(),
      };

      mutations.create.mutate(newStory, {
        onSuccess: () => {
          toast.success(`Success story "${selectedStory.title}" created.`);
          setEditorOpen(false);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create success story."),
      });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary dark:text-cyan-200">
            Student Endorsements & Success Stories
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground dark:text-slate-400">
            Manage placement success case files, verify salary package offers, and format testimonial highlights for the homepage.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-black text-primary-foreground hover:bg-primary/90 shadow-lg dark:bg-cyan-400 dark:text-primary"
        >
          <Plus className="size-4" />
          <span>Add Success Story</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          { label: "Stories Active", count: stories.length, color: "text-primary" },
          { label: "Published", count: publishedCount, color: "text-emerald-500" },
          { label: "Top Package", count: topPackage !== null ? `${topPackage} LPA` : "—", color: "text-amber-500" },
          { label: "Average Package", count: avgPackage !== null ? `${avgPackage.toFixed(1)} LPA` : "—", color: "text-cyan-600" }
        ].map(st => (
          <div key={st.label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{st.label}</p>
            <p className={`mt-1.5 text-2xl font-black ${st.color}`}>{st.count}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-primary dark:text-cyan-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search placed candidates, corporate recruiters, courses..."
            className="h-11 w-full rounded-xl border border-border bg-muted pl-10 pr-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>
      </div>

      {/* Stories list */}
      {isLoading ? (
        <div className="py-12 text-center text-sm font-semibold text-slate-400">Loading stories...</div>
      ) : filteredStories.length === 0 ? (
        <div className="py-12 text-center text-sm font-semibold text-slate-400">No success stories found.</div>
      ) : (
      <div className="grid gap-6 md:grid-cols-2">
        {filteredStories.map((story) => (
          <motion.div
            key={story.id}
            whileHover={{ y: -4 }}
            className="relative flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              {/* Header profile info */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={story.image_url ?? "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=128&auto=format&fit=crop"}
                    alt={story.title || ""}
                    className="size-12 rounded-xl object-cover bg-slate-100"
                  />
                  <div>
                    <h3 className="text-sm font-black text-primary dark:text-white">{story.title}</h3>
                    <p className="text-[10px] font-bold text-slate-400">{story.job_role}</p>
                  </div>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setActiveMenu(activeMenu === story.id ? null : story.id)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <MoreVertical className="size-4" />
                  </button>
                  <AnimatePresence>
                    {activeMenu === story.id && (
                      <>
                        <button className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-slate-100 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-950"
                        >
                          <button
                            onClick={() => handleEdit(story)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-black text-slate-700 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-900"
                          >
                            <Edit2 className="size-3 text-primary" />
                            <span>Edit Record</span>
                          </button>
                          <button
                            onClick={() => handleDelete(story.id)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-black text-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-950/10"
                          >
                            <Trash2 className="size-3" />
                            <span>Unpublish</span>
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 rounded-2xl bg-secondary/10 p-4.5 dark:bg-slate-800/40">
                <div className="flex items-center gap-2.5">
                  <Building2 className="size-4.5 text-primary dark:text-cyan-300 shrink-0" />
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400">Corporation</p>
                    <p className="text-xs font-black text-primary dark:text-slate-200">{story.company_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <DollarSign className="size-4.5 text-primary dark:text-cyan-300 shrink-0" />
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400">Compensation</p>
                    <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">{story.package}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <span>Before</span>
                <ArrowRight className="size-3.5 text-slate-300 shrink-0" />
                <span className="text-primary dark:text-cyan-300">Placed</span>
              </div>

              <div className="mt-4 relative bg-slate-50 p-4 rounded-2xl border border-slate-100 dark:bg-slate-900/60 dark:border-slate-850">
                <Quote className="absolute right-3.5 top-3.5 size-4 text-primary/10 dark:text-cyan-300/10" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed italic pr-4">
                  "{story.full_story || "The placement support at SkillGuru assisted me at each transition phase. Clear mock sessions and resume endorsements guaranteed success."}"
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      )}

      {/* Editor Modal Overlay */}
      <AnimatePresence>
        {editorOpen && selectedStory && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <h3 className="text-lg font-black text-primary dark:text-white">Success Record Sheet</h3>
                <button
                  onClick={() => setEditorOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Form Scrollable */}
              <form onSubmit={saveStory} className="mt-5 space-y-4 max-h-[60svh] overflow-y-auto pr-1">
                <div className="space-y-1">
                  <label className="text-xs font-black text-primary dark:text-slate-350">Student Full Name</label>
                  <input
                    required
                    value={selectedStory.title || ""}
                    onChange={(e) => setSelectedStory({ ...selectedStory, title: e.target.value })}
                    className="w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-primary dark:text-slate-350">Placed Corporate Partner</label>
                    <input
                      required
                      value={selectedStory.company_name || ""}
                      onChange={(e) => setSelectedStory({ ...selectedStory, company_name: e.target.value })}
                      className="w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-primary dark:text-slate-350">Compensation Package (LPA)</label>
                    <input
                      required
                      value={selectedStory.package || ""}
                      onChange={(e) => setSelectedStory({ ...selectedStory, package: e.target.value })}
                      className="w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-primary dark:text-slate-350">Placed Role</label>
                    <input
                      required
                      value={selectedStory.job_role || ""}
                      onChange={(e) => setSelectedStory({ ...selectedStory, job_role: e.target.value })}
                      className="w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-primary dark:text-slate-350">Review Endorsement Quote</label>
                  <textarea
                    rows={3}
                    value={selectedStory.full_story || ""}
                    onChange={(e) => setSelectedStory({ ...selectedStory, full_story: e.target.value })}
                    className="w-full rounded-xl border border-border bg-muted p-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                {/* Placement timeline builder representation */}
                <div className="space-y-3 rounded-2xl border border-dashed border-slate-200 p-4 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-black text-primary dark:text-cyan-300">Placement Roadmap Audit</p>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                    <span>Enrolled</span>
                    <ArrowRight className="size-3" />
                    <span className="text-primary dark:text-cyan-400">Mock Cleared</span>
                    <ArrowRight className="size-3" />
                    <span className="text-primary dark:text-cyan-400">Interviews</span>
                    <ArrowRight className="size-3" />
                    <span className="text-emerald-500">Offer Placed</span>
                  </div>
                </div>
              </form>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="h-11 rounded-xl px-5 text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850"
                >
                  Cancel
                </button>
                <button
                  onClick={saveStory}
                  className="h-11 rounded-xl bg-primary px-6 text-xs font-black text-primary-foreground hover:bg-primary/90 dark:bg-cyan-400 dark:text-primary"
                >
                  Save Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
