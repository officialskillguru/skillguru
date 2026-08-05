import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, X } from "lucide-react";

import {
  getCourseById,
  updateCourse,
  listPublicCategories,
  listCourseMedia,
  createCourseMedia,
  deleteCourseMedia,
  listCourseFaqs,
  createCourseFaq,
  deleteCourseFaq,
  listAllSuccessStoriesForTagging,
  setSuccessStoryCourseId,
} from "@/services/courses.service";
import { getSupabaseClientOrThrow } from "@/services/_shared";
import { FileUpload } from "@/components/common/FileUpload";
import type { UploadResult } from "@/services/storage.service";
import type { Updates } from "@/types/database";

const LEVEL_OPTIONS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "all_levels", label: "All Levels" },
];

type BasicFormState = {
  title: string;
  slug: string;
  description: string;
  short_description: string;
  level: string;
  language: string;
  course_type: string;
  price: string;
  discount_price: string;
  duration: string;
  what_you_will_learn: string[];
  requirements: string[];
  categoryId: string;
  subcategoryId: string;
};

function emptyForm(): BasicFormState {
  return {
    title: "", slug: "", description: "", short_description: "",
    level: "beginner", language: "English", course_type: "",
    price: "", discount_price: "", duration: "",
    what_you_will_learn: [], requirements: [], categoryId: "", subcategoryId: "",
  };
}

/**
 * Shared course-details editor - title/description/pricing/category/media/
 * outcomes/requirements/FAQ/placement tagging. Extracted so both the mentor
 * Course Builder and the admin course editor use one real implementation,
 * matching the pattern CourseCurriculumEditor already established for the
 * curriculum tab.
 */
export function CourseDetailsEditor({ courseId, viewerRole }: Readonly<{ courseId: string; viewerRole: "admin" | "mentor" }>) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BasicFormState>(emptyForm());
  const [newOutcome, setNewOutcome] = useState("");
  const [newRequirement, setNewRequirement] = useState("");
  const [faqDraft, setFaqDraft] = useState({ question: "", answer: "" });

  const { data: course, isLoading: isCourseLoading } = useQuery({
    queryKey: ["course-details-editor", courseId],
    queryFn: () => getCourseById(courseId),
  });

  const { data: currentCategoryIds } = useQuery({
    queryKey: ["course-details-editor-categories", courseId],
    queryFn: async () => {
      const supabase = getSupabaseClientOrThrow();
      const { data, error } = await supabase.from("course_categories").select("category_id").eq("course_id", courseId);
      if (error) throw error;
      return (data ?? []).map((r) => r.category_id);
    },
  });

  const { data: categories } = useQuery({ queryKey: ["public-categories"], queryFn: listPublicCategories });
  const { data: gallery, isLoading: isGalleryLoading } = useQuery({ queryKey: ["course-media", courseId, "gallery_image"], queryFn: () => listCourseMedia(courseId, "gallery_image") });
  const { data: faqs, isLoading: isFaqsLoading } = useQuery({ queryKey: ["course-faqs", courseId], queryFn: () => listCourseFaqs(courseId) });
  const { data: allStories } = useQuery({
    queryKey: ["success-stories-tagging"],
    queryFn: listAllSuccessStoriesForTagging,
    enabled: viewerRole === "admin",
  });

  // Seed the local editable form once the course + categories have loaded.
  // Done during render (React's endorsed pattern for "adjust state when an
  // async prop/query result changes") rather than in a useEffect, so it
  // re-seeds exactly once per courseId without an extra render-then-fix pass.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (course && categories && currentCategoryIds && seededFor !== courseId) {
    const flatCategories = categories.flatMap((c) => [c, ...c.subcategories]);
    const selected = currentCategoryIds[0];
    const selectedCat = flatCategories.find((c) => c.id === selected);
    const parentId = selectedCat?.parent_id ?? selected ?? "";
    const subId = selectedCat?.parent_id ? selected : "";
    setSeededFor(courseId);
    setForm({
      title: course.title ?? "",
      slug: course.slug ?? "",
      description: course.description ?? "",
      short_description: course.short_description ?? "",
      level: course.level ?? "beginner",
      language: course.language ?? "English",
      course_type: course.course_type ?? "",
      price: course.price != null ? String(course.price) : "",
      discount_price: course.discount_price != null ? String(course.discount_price) : "",
      duration: course.duration ?? "",
      what_you_will_learn: course.what_you_will_learn ?? [],
      requirements: course.requirements ?? [],
      categoryId: parentId ?? "",
      subcategoryId: subId ?? "",
    });
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const leafCategoryId = form.subcategoryId || form.categoryId;
      const payload: Updates<"courses"> & { selectedCategoryIds?: string[] } = {
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        description: form.description.trim() || null,
        short_description: form.short_description.trim() || null,
        level: form.level as Updates<"courses">["level"],
        language: form.language.trim() || "English",
        course_type: form.course_type.trim() || null,
        price: form.price ? Number(form.price) : null,
        discount_price: form.discount_price ? Number(form.discount_price) : null,
        duration: form.duration.trim() || null,
        what_you_will_learn: form.what_you_will_learn,
        requirements: form.requirements,
        selectedCategoryIds: leafCategoryId ? [leafCategoryId] : [],
      };
      return updateCourse(courseId, payload);
    },
    onSuccess: () => {
      toast.success("Course details saved.");
      void queryClient.invalidateQueries({ queryKey: ["course-details-editor", courseId] });
      void queryClient.invalidateQueries({ queryKey: ["course-details-editor-categories", courseId] });
      void queryClient.invalidateQueries({ queryKey: ["admin_courses"] });
      void queryClient.invalidateQueries({ queryKey: ["mentor", "courses"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save course details."),
  });

  const mediaFieldMutation = useMutation({
    mutationFn: (input: { field: "thumbnail_file_id" | "banner_file_id" | "promo_video_file_id"; fileId: string }) =>
      updateCourse(courseId, { [input.field]: input.fileId }),
    onSuccess: () => {
      toast.success("Media updated.");
      void queryClient.invalidateQueries({ queryKey: ["course-details-editor", courseId] });
      void queryClient.invalidateQueries({ queryKey: ["course-media", courseId] });
    },
    onError: () => toast.error("Failed to save media."),
  });

  const addGalleryImageMutation = useMutation({
    mutationFn: (fileId: string) => createCourseMedia({ course_id: courseId, file_id: fileId, media_type: "gallery_image" }),
    onSuccess: () => {
      toast.success("Image added to gallery.");
      void queryClient.invalidateQueries({ queryKey: ["course-media", courseId, "gallery_image"] });
    },
    onError: () => toast.error("Failed to add gallery image."),
  });

  const deleteGalleryImageMutation = useMutation({
    mutationFn: (id: string) => deleteCourseMedia(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["course-media", courseId, "gallery_image"] }),
    onError: () => toast.error("Failed to remove image."),
  });

  const createFaqMutation = useMutation({
    mutationFn: () => createCourseFaq({ course_id: courseId, question: faqDraft.question.trim(), answer: faqDraft.answer.trim(), sort_order: faqs?.length ?? 0 }),
    onSuccess: () => {
      setFaqDraft({ question: "", answer: "" });
      void queryClient.invalidateQueries({ queryKey: ["course-faqs", courseId] });
    },
    onError: () => toast.error("Failed to add FAQ."),
  });

  const deleteFaqMutation = useMutation({
    mutationFn: (id: string) => deleteCourseFaq(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["course-faqs", courseId] }),
    onError: () => toast.error("Failed to delete FAQ."),
  });

  const tagStoryMutation = useMutation({
    mutationFn: ({ storyId, link }: { storyId: number; link: boolean }) => setSuccessStoryCourseId(storyId, link ? courseId : null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["success-stories-tagging"] });
      void queryClient.invalidateQueries({ queryKey: ["course-success-stories", courseId] });
    },
    onError: () => toast.error("Failed to update placement tagging."),
  });

  if (isCourseLoading || !course) {
    return <div className="py-12 text-center text-sm font-semibold text-muted-foreground">Loading course details…</div>;
  }

  const subcategories = (categories ?? []).find((c) => c.id === form.categoryId)?.subcategories ?? [];

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-black text-foreground">Basic Information</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="cde-title" className="text-xs font-black text-muted-foreground">Course Title</label>
            <input id="cde-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="cde-slug" className="text-xs font-black text-muted-foreground">URL Slug</label>
            <input id="cde-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1 w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="cde-short-desc" className="text-xs font-black text-muted-foreground">Short Description <span className="font-semibold normal-case text-muted-foreground/70">(shown on course cards)</span></label>
            <input id="cde-short-desc" maxLength={160} value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} className="mt-1 w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="cde-desc" className="text-xs font-black text-muted-foreground">Full Description</label>
            <textarea id="cde-desc" rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-muted p-3.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>

          <div>
            <label htmlFor="cde-category" className="text-xs font-black text-muted-foreground">Category</label>
            <select id="cde-category" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value, subcategoryId: "" })} className="mt-1 w-full h-11 rounded-xl border border-border bg-muted px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">Select a category...</option>
              {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="cde-subcategory" className="text-xs font-black text-muted-foreground">Subcategory</label>
            <select id="cde-subcategory" value={form.subcategoryId} onChange={(e) => setForm({ ...form, subcategoryId: e.target.value })} disabled={subcategories.length === 0} className="mt-1 w-full h-11 rounded-xl border border-border bg-muted px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
              <option value="">{subcategories.length === 0 ? "No subcategories" : "None"}</option>
              {subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="cde-level" className="text-xs font-black text-muted-foreground">Level</label>
            <select id="cde-level" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="mt-1 w-full h-11 rounded-xl border border-border bg-muted px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="cde-language" className="text-xs font-black text-muted-foreground">Language</label>
            <input id="cde-language" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="mt-1 w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div>
            <label htmlFor="cde-type" className="text-xs font-black text-muted-foreground">Course Type</label>
            <input id="cde-type" placeholder="e.g. Bootcamp, Self-Paced" value={form.course_type} onChange={(e) => setForm({ ...form, course_type: e.target.value })} className="mt-1 w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div>
            <label htmlFor="cde-duration" className="text-xs font-black text-muted-foreground">Duration</label>
            <input id="cde-duration" placeholder="e.g. 12 Weeks" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="mt-1 w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-black text-foreground">Fees</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cde-price" className="text-xs font-black text-muted-foreground">Price (INR) - leave blank for free</label>
            <input id="cde-price" type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1 w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div>
            <label htmlFor="cde-discount" className="text-xs font-black text-muted-foreground">Discount Price (optional)</label>
            <input id="cde-discount" type="number" min={0} value={form.discount_price} onChange={(e) => setForm({ ...form, discount_price: e.target.value })} className="mt-1 w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-black text-foreground">What You&apos;ll Learn</h3>
        <ul className="mt-3 space-y-1.5">
          {form.what_you_will_learn.map((line, i) => (
            <li key={i} className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm font-semibold text-foreground">
              <span className="flex-1">{line}</span>
              <button type="button" onClick={() => setForm({ ...form, what_you_will_learn: form.what_you_will_learn.filter((_, idx) => idx !== i) })} className="text-muted-foreground hover:text-destructive"><X className="size-4" /></button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <input value={newOutcome} onChange={(e) => setNewOutcome(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newOutcome.trim()) { setForm({ ...form, what_you_will_learn: [...form.what_you_will_learn, newOutcome.trim()] }); setNewOutcome(""); } }} placeholder="e.g. Build production-ready REST APIs" className="flex-1 h-10 rounded-lg border border-border bg-muted px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <button type="button" onClick={() => { if (newOutcome.trim()) { setForm({ ...form, what_you_will_learn: [...form.what_you_will_learn, newOutcome.trim()] }); setNewOutcome(""); } }} className="rounded-lg bg-primary px-3 text-primary-foreground"><Plus className="size-4" /></button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-black text-foreground">Requirements</h3>
        <ul className="mt-3 space-y-1.5">
          {form.requirements.map((line, i) => (
            <li key={i} className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm font-semibold text-foreground">
              <span className="flex-1">{line}</span>
              <button type="button" onClick={() => setForm({ ...form, requirements: form.requirements.filter((_, idx) => idx !== i) })} className="text-muted-foreground hover:text-destructive"><X className="size-4" /></button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <input value={newRequirement} onChange={(e) => setNewRequirement(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newRequirement.trim()) { setForm({ ...form, requirements: [...form.requirements, newRequirement.trim()] }); setNewRequirement(""); } }} placeholder="e.g. Basic familiarity with JavaScript" className="flex-1 h-10 rounded-lg border border-border bg-muted px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <button type="button" onClick={() => { if (newRequirement.trim()) { setForm({ ...form, requirements: [...form.requirements, newRequirement.trim()] }); setNewRequirement(""); } }} className="rounded-lg bg-primary px-3 text-primary-foreground"><Plus className="size-4" /></button>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !form.title.trim()}
          className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-black text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save Course Details
        </button>
      </div>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-black text-foreground">Media</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <FileUpload
            bucket="courses"
            folder={courseId}
            label="Thumbnail"
            accept="image/png,image/jpeg,image/webp"
            hint="png, jpg, or webp"
            value={course.thumbnail_file_id ? "Uploaded" : undefined}
            onUploaded={(result: UploadResult) => mediaFieldMutation.mutate({ field: "thumbnail_file_id", fileId: result.fileId })}
          />
          <FileUpload
            bucket="courses"
            folder={courseId}
            label="Banner"
            accept="image/png,image/jpeg,image/webp"
            hint="png, jpg, or webp"
            value={course.banner_file_id ? "Uploaded" : undefined}
            onUploaded={(result: UploadResult) => mediaFieldMutation.mutate({ field: "banner_file_id", fileId: result.fileId })}
          />
          <FileUpload
            bucket="courses"
            folder={courseId}
            label="Preview / Intro Video"
            accept="video/mp4,video/webm,video/quicktime"
            hint="mp4, webm, or mov"
            value={course.promo_video_file_id ? "Uploaded" : undefined}
            onUploaded={(result: UploadResult) => mediaFieldMutation.mutate({ field: "promo_video_file_id", fileId: result.fileId })}
          />
        </div>

        <h4 className="mt-6 text-sm font-black text-foreground">Gallery Images</h4>
        <div className="mt-2 flex flex-wrap gap-3">
          {isGalleryLoading && <p className="text-xs font-semibold text-muted-foreground">Loading gallery…</p>}
          {(gallery ?? []).map((item) => (
            <div key={item.id} className="relative flex h-16 w-24 items-center justify-center rounded-lg border border-border bg-muted text-[10px] font-bold text-muted-foreground">
              Image
              <button type="button" onClick={() => deleteGalleryImageMutation.mutate(item.id)} className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-destructive text-destructive-foreground shadow">
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 max-w-xs">
          <FileUpload
            bucket="courses"
            folder={`${courseId}/gallery`}
            label="Add gallery image"
            accept="image/png,image/jpeg,image/webp"
            hint="png, jpg, or webp"
            onUploaded={(result: UploadResult) => addGalleryImageMutation.mutate(result.fileId)}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-black text-foreground">Frequently Asked Questions</h3>
        <div className="mt-3 space-y-2">
          {isFaqsLoading && <p className="text-xs font-semibold text-muted-foreground">Loading FAQs…</p>}
          {(faqs ?? []).map((faq) => (
            <div key={faq.id} className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-black text-foreground">{faq.question}</p>
                <button type="button" onClick={() => deleteFaqMutation.mutate(faq.id)} className="shrink-0 text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-2 rounded-lg border border-dashed border-border p-3">
          <input value={faqDraft.question} onChange={(e) => setFaqDraft({ ...faqDraft, question: e.target.value })} placeholder="Question" className="w-full h-10 rounded-lg border border-border bg-muted px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <textarea value={faqDraft.answer} onChange={(e) => setFaqDraft({ ...faqDraft, answer: e.target.value })} placeholder="Answer" rows={2} className="w-full rounded-lg border border-border bg-muted p-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <button
            type="button"
            onClick={() => createFaqMutation.mutate()}
            disabled={createFaqMutation.isPending || !faqDraft.question.trim() || !faqDraft.answer.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-black text-primary-foreground disabled:opacity-50"
          >
            Add FAQ
          </button>
        </div>
      </section>

      {viewerRole === "admin" && (
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-black text-foreground">Placement & Career Outcomes</h3>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">Tag existing success stories to this course so they appear on its public detail page.</p>
          <div className="mt-3 space-y-2">
            {(allStories ?? []).map((story) => {
              const linked = story.course_id === courseId;
              return (
                <div key={story.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{story.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{story.company_name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => tagStoryMutation.mutate({ storyId: story.id, link: !linked })}
                    className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-black ${linked ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
                  >
                    {linked ? "Unlink" : "Link to this course"}
                  </button>
                </div>
              );
            })}
            {(allStories ?? []).length === 0 && <p className="text-xs font-semibold text-muted-foreground">No success stories exist yet - create one on the Success Stories page first.</p>}
          </div>
        </section>
      )}
    </div>
  );
}
