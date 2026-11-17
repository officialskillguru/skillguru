import { useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMentorTestimonials, useReplyToTestimonial } from "@/hooks/useMentorPortal";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export function ReviewsTab() {
  const { data: testimonials = [], isLoading } = useMentorTestimonials();
  const replyMutation = useReplyToTestimonial();
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const startReply = (id: string, existing: string | null) => {
    setReplyingId(id);
    setReplyText(existing ?? "");
  };

  const submitReply = (id: string) => {
    if (!replyText.trim()) {
      toast.error("Reply cannot be empty.");
      return;
    }
    replyMutation.mutate(
      { id, reply: replyText.trim() },
      {
        onSuccess: () => {
          toast.success("Reply posted.");
          setReplyingId(null);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to post reply."),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-foreground text-2xl font-black">Student Reviews</h1>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  if (testimonials.length === 0)
    return (
      <div className="space-y-4">
        <h1 className="text-foreground text-2xl font-black">Student Reviews</h1>
        <div className="text-muted-foreground py-12 text-center text-sm font-semibold">
          No student reviews yet.
        </div>
      </div>
    );

  return (
    <div className="space-y-4">
      <h1 className="text-foreground text-2xl font-black">Student Reviews</h1>
      <div className="space-y-4">
        {testimonials.map((t) => (
          <article key={t.id} className="border-border bg-card rounded-xl border p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-foreground font-black">{t.studentName}</p>
                <p className="text-muted-foreground text-xs font-bold">
                  {t.courseTitle} · {new Date(t.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {t.rating != null && (
                  <span className="text-warning flex items-center gap-1">
                    <Star className="fill-warning size-3.5" aria-hidden="true" />
                    <span className="text-foreground text-sm font-bold">{t.rating}</span>
                    <span className="sr-only"> out of 5 rating</span>
                  </span>
                )}
                {!t.isApproved && <Badge variant="warning">Pending approval</Badge>}
              </div>
            </div>
            <p className="text-foreground/80 mt-3 text-sm">{t.content}</p>

            {t.mentorReply && replyingId !== t.id && (
              <div className="border-border bg-muted/40 mt-4 rounded-lg border p-4">
                <p className="text-muted-foreground text-[10px] font-black tracking-wider uppercase">
                  Your reply
                </p>
                <p className="text-foreground/80 mt-1 text-sm">{t.mentorReply}</p>
                <button
                  onClick={() => startReply(t.id, t.mentorReply)}
                  className="text-primary focus-visible:ring-ring mt-2 rounded text-xs font-bold hover:underline focus-visible:ring-2 focus-visible:outline-none"
                >
                  Edit reply
                </button>
              </div>
            )}

            {replyingId === t.id ? (
              <div className="mt-4 space-y-2">
                <label htmlFor={`reply-${t.id}`} className="sr-only">
                  Reply to {t.studentName}
                </label>
                <textarea
                  id={`reply-${t.id}`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  placeholder="Write a reply to this student..."
                  className="border-border bg-background focus-visible:ring-ring w-full rounded-md border p-3 text-sm outline-none focus-visible:ring-2"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setReplyingId(null)}
                    className="border-border text-foreground hover:bg-muted focus-visible:ring-ring rounded-md border px-3 py-1.5 text-xs font-bold focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => submitReply(t.id)}
                    disabled={replyMutation.isPending}
                    className="bg-primary text-primary-foreground focus-visible:ring-ring flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-black focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
                  >
                    {replyMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : null}
                    Post Reply
                  </button>
                </div>
              </div>
            ) : (
              !t.mentorReply && (
                <button
                  onClick={() => startReply(t.id, null)}
                  className="border-border text-foreground hover:bg-muted focus-visible:ring-ring mt-4 rounded-md border px-3 py-1.5 text-xs font-bold focus-visible:ring-2 focus-visible:outline-none"
                >
                  Reply to review
                </button>
              )
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
