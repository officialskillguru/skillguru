import { useQuery } from "@tanstack/react-query";
import { Users, Search, CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listMentors, type Mentor as ServiceMentor } from "@/services/mentors.service";
import { MentorCard } from "@/components/cards/MentorCard";
import type { Mentor as MarketingMentor } from "@/types/platform";
import { useMyMentorSessions, useCancelMyMentorSession } from "@/hooks/student/useMentorSessions";

import { useState } from "react";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString();
}

function MyMentorSessions() {
  const { data: sessions = [], isLoading, isError, refetch } = useMyMentorSessions();
  const cancelMutation = useCancelMyMentorSession();

  if (isLoading) {
    return <div className="h-20 animate-pulse rounded-2xl bg-card" />;
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm font-semibold text-red-700">Failed to load your sessions.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-2 rounded-md bg-red-100 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-red-700 hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  if (sessions.length === 0) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-primary">
        <CalendarClock className="size-4" aria-hidden="true" /> My Upcoming Sessions
      </h3>
      <div className="space-y-2">
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <div>
              <p className="text-sm font-bold text-foreground">{s.mentorName ? `Session with ${s.mentorName}` : s.title}</p>
              <p className="text-xs font-semibold text-muted-foreground">
                {formatDateTime(s.starts_at)} – {new Date(s.ends_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                cancelMutation.mutate(s.id, {
                  onSuccess: () => toast.success("Session cancelled."),
                  onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to cancel."),
                })
              }
              disabled={cancelMutation.isPending}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50"
            >
              {cancelMutation.isPending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
              Cancel
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function toMarketingMentor(mentor: ServiceMentor): MarketingMentor {
  return {
    slug: mentor.id,
    name: mentor.name ?? "Unknown Mentor",
    role: mentor.headline ?? "Mentor",
    company: mentor.company ?? "",
    companyLogo: "",
    avatar: mentor.avatar ?? "",
    category: mentor.expertise?.[0] ?? "General",
    experience: mentor.years_of_experience ? `${mentor.years_of_experience}+ yrs` : "N/A",
    experienceYears: mentor.years_of_experience ?? mentor.experience_years ?? 0,
    studentsMentored: 0,
    rating: 0,
    location: "Remote",
    language: "English",
    availability: "Flexible",
    bio: mentor.bio ?? "",
    expertise: mentor.expertise ?? [],
    workedWith: mentor.skills ?? [],
  };
}

export default function StudentMentorsPage() {
  const [search, setSearch] = useState("");

  const { data: mentorsData, isLoading } = useQuery({
    queryKey: ["mentors", search],
    queryFn: () => listMentors({ search }),
  });

  const mentors = (mentorsData?.data || []).map(toMarketingMentor);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-2xl font-black text-foreground">
          <Users className="size-6 text-secondary" aria-hidden="true" />
          Mentors
        </h2>
        <p className="text-sm text-foreground/70">Connect with industry experts for 1:1 guidance and project reviews.</p>
      </div>

      <MyMentorSessions />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/40" aria-hidden="true" />
          <label htmlFor="mentor-search" className="sr-only">Search mentors</label>
          <input
            id="mentor-search"
            type="text"
            placeholder="Search mentors by name, company or expertise..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm font-semibold text-primary outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="status" aria-label="Loading mentors">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[300px] animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      ) : mentors.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {mentors.map((mentor) => (
            <MentorCard key={mentor.slug} mentor={mentor} />
          ))}
        </div>
      ) : (
        <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 text-center">
          <Users className="size-10 text-primary/20" aria-hidden="true" />
          <h3 className="mt-4 text-sm font-black text-primary">No Mentors Found</h3>
          <p className="mt-1 text-xs font-semibold text-primary/60">Try adjusting your search criteria</p>
        </div>
      )}
    </div>
  );
}
