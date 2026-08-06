import { useState } from "react";
import { Megaphone, Plus, AlertCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnnouncementComposer } from "@/components/mentor/messaging/AnnouncementComposer";
import { useMyAnnouncements } from "@/hooks/useMentorMessaging";

const AUDIENCE_LABEL: Record<string, string> = {
  my_students: "My Students",
  course_cohort: "Course Cohort",
  selected: "Selected Students",
  all_students: "All Students",
  all_mentors: "All Mentors",
};

const STATUS_BADGE: Record<string, { label: string; variant: "success" | "warning" | "muted" | "destructive" }> = {
  draft: { label: "Draft", variant: "muted" },
  sent: { label: "Sent", variant: "success" },
  scheduled: { label: "Scheduled", variant: "warning" },
  sending: { label: "Sending", variant: "warning" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export default function MentorAnnouncementsPage() {
  const { data: announcements = [], isLoading, isError, refetch } = useMyAnnouncements();
  const [composerOpen, setComposerOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Announcements</h1>
          <p className="text-sm text-muted-foreground">Send updates to your students - audience is always resolved from real enrollments.</p>
        </div>
        <Button onClick={() => setComposerOpen(true)} className="gap-1.5">
          <Plus className="size-4" aria-hidden="true" />
          New Announcement
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
            <AlertCircle className="size-8 text-destructive-text" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">Couldn't load your announcements.</p>
            <Button size="sm" variant="outline" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
            <Megaphone className="size-10 text-muted-foreground/40" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">No announcements yet</p>
            <p className="text-xs text-muted-foreground">Reach your students with a course update, reminder, or announcement.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {announcements.map((a) => {
              const badge = STATUS_BADGE[a.status] ?? STATUS_BADGE.draft!;
              return (
                <li key={a.id} className="flex items-start justify-between gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-foreground">{a.name}</p>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.body}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{AUDIENCE_LABEL[a.audience_type] ?? a.audience_type}</span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" aria-hidden="true" />
                        {a.total_recipients ?? 0} recipient{(a.total_recipients ?? 0) === 1 ? "" : "s"}
                      </span>
                      <span>{a.sent_at ? new Date(a.sent_at).toLocaleString() : `Created ${new Date(a.created_at).toLocaleDateString()}`}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AnnouncementComposer open={composerOpen} onOpenChange={setComposerOpen} />
    </div>
  );
}
