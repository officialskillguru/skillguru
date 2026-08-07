import { Link } from "react-router-dom";
import { BarChart3, BookOpenCheck, MessageSquare, Star, Users } from "lucide-react";
import { useMentorDashboardMetrics } from "@/hooks/useMentorPortal";
import { useConversations, useUnreadConversationsCount } from "@/hooks/useMentorMessaging";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

function initials(name: string | null | undefined) {
  const source = name?.trim();
  if (!source) return "?";
  const parts = source.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function OverviewTab() {
  const { data: metrics, isLoading } = useMentorDashboardMetrics();
  const { authUser } = useAuth();
  const selfId = authUser?.profile?.id;
  const { data: conversations = [] } = useConversations();
  const unreadCount = useUnreadConversationsCount();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (!metrics) return <div className="py-12 text-center text-sm font-semibold text-muted-foreground">No data available</div>;

  const mentorMetrics = [
    { label: "Assigned Courses", value: metrics.totalCourses, icon: BookOpenCheck },
    { label: "Active Students", value: metrics.activeStudents, icon: Users },
    { label: "Reviews", value: metrics.reviews, icon: Star },
    { label: "Completed Enrollments", value: metrics.completedEnrollments, icon: BarChart3 },
  ];

  const { draft, underReview, published, archived } = metrics.courseStatusBreakdown;
  const recentConversations = [...conversations]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 4);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {mentorMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <Icon className="size-7 text-primary" aria-hidden="true" />
              <p className="mt-4 text-3xl font-black text-foreground">{metric.value}</p>
              <p className="mt-1 text-sm font-bold text-muted-foreground">{metric.label}</p>
            </article>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-foreground">Course Status</h2>
            <BookOpenCheck className="size-5 text-primary" aria-hidden="true" />
          </div>
          {metrics.totalCourses === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              You haven't created any courses yet.{" "}
              <Link to="/mentor/courses/new" className="font-semibold text-primary hover:underline">
                Start your first course
              </Link>
              .
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-2xl font-black text-foreground">{published}</p>
                <p className="text-xs font-semibold text-muted-foreground">Published</p>
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{underReview}</p>
                <p className="text-xs font-semibold text-muted-foreground">Under Review</p>
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{draft}</p>
                <p className="text-xs font-semibold text-muted-foreground">Draft</p>
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{archived}</p>
                <p className="text-xs font-semibold text-muted-foreground">Archived</p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-black text-foreground">
              Recent Messages
              {unreadCount > 0 && <Badge variant="destructive">{unreadCount} unread</Badge>}
            </h2>
            <Link to="/mentor/messages" className="text-xs font-semibold text-primary hover:underline">
              View inbox
            </Link>
          </div>
          {recentConversations.length === 0 ? (
            <div className="mt-4 flex flex-col items-center gap-2 py-4 text-center">
              <MessageSquare className="size-8 text-muted-foreground/40" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">No conversations yet.</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-1">
              {recentConversations.map((conv) => {
                const others = (conv.members ?? []).filter((m) => m.user_id !== selfId);
                const title = conv.title ?? others.map((m) => m.user?.full_name).filter(Boolean).join(", ") ?? "Conversation";
                const own = conv.members?.find((m) => m.user_id === selfId);
                const isUnread = !own?.last_read_at || new Date(own.last_read_at) < new Date(conv.updated_at);
                return (
                  <li key={conv.id}>
                    <Link
                      to={`/mentor/messages/${conv.id}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition hover:bg-muted"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-black text-primary">
                        {initials(title)}
                      </span>
                      <span className={`truncate ${isUnread ? "font-bold text-foreground" : "text-muted-foreground"}`}>{title}</span>
                      {isUnread && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
