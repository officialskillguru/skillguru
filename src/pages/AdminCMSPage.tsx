import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  HelpCircle,
  Plus,
  X,
  Trash2,
  Globe,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminCMSSetting, useSaveAdminCMSSetting } from "@/hooks/admin/useAdminCMS";
import { listSuccessStories } from "@/services/successStories.service";

interface FAQRecord {
  id: number;
  question: string;
  answer: string;
  category: string;
}

const defaultFAQs: FAQRecord[] = [
  { id: 1, question: "Do you guarantee 100% placements support?", answer: "Yes, we provide extensive placement support including direct hiring partner referrals, resume builders and counseling mock interviews.", category: "Placements" },
  { id: 2, question: "Can non-IT freshers transition to Full Stack roles?", answer: "Absolutely. Our program curriculum is structured from scratch. Over 40% of our successful cohorts come from non-IT backgrounds.", category: "Eligibility" },
];

export default function AdminCMSPage() {
  const [activeSubTab, setActiveSubTab] = useState<"homepage" | "blogs" | "faqs">("homepage");

  // CMS Settings Hooks
  const { data: remoteFaqs, isLoading: loadingFaqs } = useAdminCMSSetting<FAQRecord[]>("cms_faqs");
  const saveSetting = useSaveAdminCMSSetting();

  const { data: remoteHomepage, isLoading: loadingHomepage } = useAdminCMSSetting<{ title: string; subtitle: string; selectedStories: string[] }>("cms_homepage");

  const { data: successStoriesData } = useQuery({
    queryKey: ["cms-success-stories-picker"],
    queryFn: () => listSuccessStories({ published: true, pageSize: 50 }),
  });
  const availableStories = successStoriesData?.data ?? [];

  const [faqs, setFaqs] = useState<FAQRecord[]>(defaultFAQs);

  // Homepage State
  const [heroTitle, setHeroTitle] = useState("Unlock Your Career Potential in Indian Tech");
  const [heroSubtitle, setHeroSubtitle] = useState("Join elite tech programs backed by 150+ hiring corporate recruiters. Master coding, analytics or design, and clear placement thresholds successfully.");
  const [selectedStories, setSelectedStories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (remoteFaqs) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setFaqs(remoteFaqs);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [remoteFaqs]);

  useEffect(() => {
    if (remoteHomepage) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setHeroTitle(remoteHomepage.title);
      setHeroSubtitle(remoteHomepage.subtitle);
      setSelectedStories(new Set(remoteHomepage.selectedStories));
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [remoteHomepage]);

  // FAQ states
  const [newFAQQuestion, setNewFAQQuestion] = useState("");
  const [newFAQAnswer, setNewFAQAnswer] = useState("");
  const [faqModalOpen, setFaqModalOpen] = useState(false);

  const handleCreateFAQ = (e: React.FormEvent) => {
    e.preventDefault();
    const newFAQ: FAQRecord = {
      id: faqs.length > 0 ? Math.max(...faqs.map(f => f.id)) + 1 : 1,
      question: newFAQQuestion,
      answer: newFAQAnswer,
      category: "General",
    };
    
    const newFaqs = [...faqs, newFAQ];
    setFaqs(newFaqs);
    
    saveSetting.mutate({ key: "cms_faqs", value: newFaqs }, {
      onSuccess: () => {
        setFaqModalOpen(false);
        setNewFAQQuestion("");
        setNewFAQAnswer("");
        toast.success("New FAQ query appended.");
      }
    });
  };

  const handleDeleteFAQ = (id: number) => {
    const newFaqs = faqs.filter(f => f.id !== id);
    setFaqs(newFaqs);
    saveSetting.mutate({ key: "cms_faqs", value: newFaqs }, {
      onSuccess: () => toast.success("FAQ item removed.")
    });
  };

  const handleSaveHomepage = () => {
    saveSetting.mutate({
      key: "cms_homepage",
      value: {
        title: heroTitle,
        subtitle: heroSubtitle,
        selectedStories: Array.from(selectedStories)
      }
    }, {
      onSuccess: () => toast.success("Homepage Hero edits committed to Database.")
    });
  };

  const toggleStory = (story: string) => {
    const newStories = new Set(selectedStories);
    if (newStories.has(story)) newStories.delete(story);
    else newStories.add(story);
    setSelectedStories(newStories);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary dark:text-cyan-200">
            Content Management System
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground dark:text-slate-400">
            Update active homepage modules, publish authority industry articles, and compile FAQs list.
          </p>
        </div>
        <div className="flex gap-2">
          {activeSubTab === "faqs" && (
            <button
              onClick={() => setFaqModalOpen(true)}
              className="flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-black text-white dark:bg-cyan-400 dark:text-primary"
            >
              <Plus className="size-4" />
              <span>Create FAQ</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border dark:border-slate-800">
        {[
          { id: "homepage", label: "Homepage Editor", icon: Globe },
          { id: "blogs", label: "Editorial Articles", icon: FileText },
          { id: "faqs", label: "FAQs Registry", count: faqs.length, icon: HelpCircle }
        ].map((tb) => {
          const TabIcon = tb.icon;
          return (
            <button
              key={tb.id}
              onClick={() => setActiveSubTab(tb.id as typeof activeSubTab)}
              className={[
                "py-3.5 px-5 text-xs font-black border-b-2 transition-all flex items-center gap-2",
                activeSubTab === tb.id
                  ? "border-primary text-primary dark:border-cyan-400 dark:text-cyan-300"
                  : "border-transparent text-slate-450 hover:text-primary dark:hover:text-white",
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
          {loadingHomepage ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin text-primary size-6" /></div>
          ) : (
          <div className="rounded-3xl border border-border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-base font-black text-primary dark:text-cyan-200">Landing Page Hero Banner</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400">Hero Main Title (Large Screen)</label>
                <input
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-muted px-3.5 text-sm font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400">Hero Subtext Description</label>
                <textarea
                  rows={3}
                  value={heroSubtitle}
                  onChange={(e) => setHeroSubtitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-muted p-3 text-sm font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>
            
            <h3 className="text-base font-black text-primary dark:text-cyan-200 mt-8 pt-4 border-t border-slate-50 dark:border-slate-850">Rearrange Active Success Testimonials</h3>
            <p className="text-xs font-semibold text-slate-400 leading-normal mb-4">
              Select published success stories to feature prominently on the marketing landing page.
            </p>
            {availableStories.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-muted p-4 text-xs font-bold text-muted-foreground">
                No published success stories yet — publish one from the Success Stories page first.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {availableStories.map((story) => (
                  <label key={story.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-4 bg-muted dark:border-slate-850 dark:bg-slate-950 cursor-pointer">
                    <input type="checkbox" checked={selectedStories.has(String(story.id))} onChange={() => toggleStory(String(story.id))} className="rounded border-slate-200 text-primary" />
                    <span className="text-xs font-black text-slate-700 dark:text-slate-350">{story.title}{story.company_name ? ` — ${story.company_name}` : ""}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-6">
              <button
                onClick={handleSaveHomepage}
                disabled={saveSetting.isPending}
                className="h-11 rounded-xl bg-primary px-6 text-xs font-black text-white dark:bg-cyan-400 dark:text-primary disabled:opacity-50"
              >
                {saveSetting.isPending ? "Saving..." : "Commit Changes to Production"}
              </button>
            </div>
          </div>
          )}
        </div>
      )}

      {/* Blogs Editorial Tab */}
      {activeSubTab === "blogs" && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-card p-12 text-center shadow-sm">
          <FileText className="size-10 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Feature Not Available</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            There's no blog/article table in the production schema yet. This tab previously let you "save" articles that only ever existed in local component state — that's been removed rather than left in place.
          </p>
        </div>
      )}

      {/* FAQs Tab */}
      {activeSubTab === "faqs" && (
        <div className="grid gap-6 md:grid-cols-2">
          {loadingFaqs ? (
            <div className="col-span-2 flex justify-center p-12"><Loader2 className="animate-spin text-primary size-6" /></div>
          ) : faqs.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-sm font-semibold text-slate-500">No FAQs found. Create one.</div>
          ) : faqs.map((faq) => (
            <div key={faq.id} className="rounded-3xl border border-border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3 relative group">
              <div className="flex items-center justify-between">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase text-slate-500 dark:bg-slate-800">
                  {faq.category}
                </span>
                <span className="text-[10px] font-bold text-slate-400">FAQ-{faq.id}</span>
              </div>
              <h4 className="text-xs font-black text-primary dark:text-white leading-normal pr-8">
                {faq.question}
              </h4>
              <p className="text-xs font-bold text-slate-500 leading-relaxed">
                {faq.answer}
              </p>
              <button
                onClick={() => handleDeleteFAQ(faq.id)}
                disabled={saveSetting.isPending}
                className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1.5 text-slate-350 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* FAQ Creation Overlay Modal */}
      <AnimatePresence>
        {faqModalOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-card/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border border-border bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-850">
                <h3 className="text-base font-black text-primary dark:text-white font-display">Create FAQ Query Entry</h3>
                <button onClick={() => setFaqModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850">
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleCreateFAQ} className="mt-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-primary dark:text-slate-350">FAQ Question Title</label>
                  <input
                    required
                    value={newFAQQuestion}
                    onChange={(e) => setNewFAQQuestion(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-muted px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-primary dark:text-slate-350">Detailed FAQ Answer</label>
                  <textarea
                    required
                    rows={4}
                    value={newFAQAnswer}
                    onChange={(e) => setNewFAQAnswer(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-muted p-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-5 dark:border-slate-850">
                  <button type="button" onClick={() => setFaqModalOpen(false)} className="h-11 rounded-xl px-5 text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850">Cancel</button>
                  <button disabled={saveSetting.isPending} type="submit" className="h-11 rounded-xl bg-primary px-6 text-xs font-black text-white dark:bg-cyan-400 dark:text-primary disabled:opacity-50">Append FAQ</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
