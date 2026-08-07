import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImageIcon, Loader2, Trash2 } from "lucide-react";
import { FileUpload } from "@/components/common/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCourseMediaUrl } from "@/hooks/useMentorPortal";
import { listCourseMedia, createCourseMedia, deleteCourseMedia, listCourseFaqs, createCourseFaq, deleteCourseFaq } from "@/services/courses.service";
import type { UploadResult } from "@/services/storage.service";
import type { StepProps } from "@/components/mentor/course-builder/types";

function GalleryThumbnail({ mediaId, fileId, caption, onDelete, isDeleting }: Readonly<{ mediaId: string; fileId: string; caption: string | null; onDelete: () => void; isDeleting: boolean }>) {
  const { data: url, isLoading } = useCourseMediaUrl(fileId);
  return (
    <div className="group relative h-28 w-40 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
      {isLoading ? (
        <div className="grid size-full place-items-center">
          <Loader2 className="size-4 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden="true" />
        </div>
      ) : url ? (
        <img src={url} alt={caption ?? ""} className="size-full object-cover" />
      ) : (
        <div className="grid size-full place-items-center text-muted-foreground">
          <ImageIcon className="size-6" aria-hidden="true" />
        </div>
      )}
      <button
        type="button"
        onClick={onDelete}
        disabled={isDeleting}
        aria-label="Remove gallery image"
        className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-100"
      >
        {isDeleting ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Trash2 className="size-3.5" aria-hidden="true" />}
      </button>
      <p className="sr-only">{mediaId}</p>
    </div>
  );
}

export function GalleryFaqStep({ course }: Readonly<StepProps>) {
  const queryClient = useQueryClient();
  const [faqDraft, setFaqDraft] = useState({ question: "", answer: "" });

  const { data: gallery = [], isLoading: isGalleryLoading } = useQuery({
    queryKey: ["course-media", course.id, "gallery_image"],
    queryFn: () => listCourseMedia(course.id, "gallery_image"),
  });
  const { data: faqs = [], isLoading: isFaqsLoading } = useQuery({
    queryKey: ["course-faqs", course.id],
    queryFn: () => listCourseFaqs(course.id),
  });

  const addImage = useMutation({
    mutationFn: (fileId: string) => createCourseMedia({ course_id: course.id, file_id: fileId, media_type: "gallery_image" }),
    onSuccess: () => {
      toast.success("Image added to gallery.");
      void queryClient.invalidateQueries({ queryKey: ["course-media", course.id, "gallery_image"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to add gallery image."),
  });

  const deleteImage = useMutation({
    mutationFn: (id: string) => deleteCourseMedia(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["course-media", course.id, "gallery_image"] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to remove image."),
  });

  const addFaq = useMutation({
    mutationFn: () => createCourseFaq({ course_id: course.id, question: faqDraft.question.trim(), answer: faqDraft.answer.trim(), sort_order: faqs.length }),
    onSuccess: () => {
      setFaqDraft({ question: "", answer: "" });
      toast.success("FAQ added.");
      void queryClient.invalidateQueries({ queryKey: ["course-faqs", course.id] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to add FAQ."),
  });

  const deleteFaq = useMutation({
    mutationFn: (id: string) => deleteCourseFaq(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["course-faqs", course.id] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete FAQ."),
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-foreground">Gallery & FAQs</h2>
        <p className="text-sm text-muted-foreground">Optional. Shown on the public course page below the curriculum.</p>
      </div>

      <div className="space-y-3">
        <Label>Gallery images</Label>
        <div className="flex flex-wrap gap-3">
          {isGalleryLoading ? (
            <p className="text-xs text-muted-foreground">Loading gallery…</p>
          ) : (
            gallery.map((item) => (
              <GalleryThumbnail
                key={item.id}
                mediaId={item.id}
                fileId={item.file_id}
                caption={item.caption}
                onDelete={() => deleteImage.mutate(item.id)}
                isDeleting={deleteImage.isPending && deleteImage.variables === item.id}
              />
            ))
          )}
        </div>
        <div className="max-w-xs">
          <FileUpload
            bucket="courses"
            folder={`${course.id}/gallery`}
            label="Add gallery image"
            accept="image/png,image/jpeg,image/webp"
            hint="png, jpg, or webp"
            onUploaded={(result: UploadResult) => addImage.mutate(result.fileId)}
          />
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-6">
        <Label>Frequently asked questions</Label>
        {isFaqsLoading ? (
          <p className="text-xs text-muted-foreground">Loading FAQs…</p>
        ) : faqs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No FAQs yet - add common questions students ask before enrolling.</p>
        ) : (
          <ul className="space-y-2">
            {faqs.map((faq) => (
              <li key={faq.id} className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-foreground">{faq.question}</p>
                  <button
                    type="button"
                    onClick={() => deleteFaq.mutate(faq.id)}
                    disabled={deleteFaq.isPending && deleteFaq.variables === faq.id}
                    aria-label={`Delete FAQ: ${faq.question}`}
                    className="shrink-0 text-muted-foreground transition hover:text-destructive-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{faq.answer}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
          <Label htmlFor="faq-question">Question</Label>
          <Input id="faq-question" value={faqDraft.question} onChange={(e) => setFaqDraft({ ...faqDraft, question: e.target.value })} placeholder="e.g. Do I get a certificate?" />
          <Label htmlFor="faq-answer">Answer</Label>
          <Textarea id="faq-answer" rows={2} value={faqDraft.answer} onChange={(e) => setFaqDraft({ ...faqDraft, answer: e.target.value })} placeholder="Yes, a certificate of completion is issued..." />
          <Button
            type="button"
            size="sm"
            onClick={() => addFaq.mutate()}
            disabled={addFaq.isPending || !faqDraft.question.trim() || !faqDraft.answer.trim()}
            className="gap-1.5"
          >
            {addFaq.isPending ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
            Add FAQ
          </Button>
        </div>
      </div>
    </div>
  );
}
