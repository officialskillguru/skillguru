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
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (testimonials.length === 0) return <div className="py-12 text-center text-sm font-semibold text-muted-foreground">No student reviews yet.</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-foreground">Student Reviews</h2>
      <div className="space-y-4">
        {testimonials.map((t) => (
          <article key={t.id} className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-black text-foreground">{t.studentName}</p>
                <p className="text-xs font-bold text-muted-foreground">{t.courseTitle} · {new Date(t.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                {t.rating != null && (
                  <span className="flex items-center gap-1 text-warning">
                    <Star className="size-3.5 fill-warning" aria-hidden="true" />
                    <span className="text-sm font-bold text-foreground">{t.rating}</span>
                    <span className="sr-only"> out of 5 rating</span>
                  </span>
                )}
                {!t.isApproved && <Badge variant="warning">Pending approval</Badge>}
              </div>
            </div>
            <p className="mt-3 text-sm text-foreground/80">{t.content}</p>

            {t.mentorReply && replyingId !== t.id && (
              <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Your reply</p>
                <p className="mt-1 text-sm text-foreground/80">{t.mentorReply}</p>
                <button
                  onClick={() => startReply(t.id, t.mentorReply)}
                  className="mt-2 rounded text-xs font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Edit reply
                </button>
              </div>
            )}

            {replyingId === t.id ? (
              <div className="mt-4 space-y-2">
                <label htmlFor={`reply-${t.id}`} className="sr-only">Reply to {t.studentName}</label>
                <textarea
                  id={`reply-${t.id}`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  placeholder="Write a reply to this student..."
                  className="w-full rounded-md border border-border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setReplyingId(null)}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => submitReply(t.id)}
                    disabled={replyMutation.isPending}
                    className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    {replyMutation.isPending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
                    Post Reply
                  </button>
                </div>
              </div>
            ) : (
              !t.mentorReply && (
                <button
                  onClick={() => startReply(t.id, null)}
                  className="mt-4 rounded-md border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
