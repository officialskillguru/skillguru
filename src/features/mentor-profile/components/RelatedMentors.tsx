import { useQuery } from "@tanstack/react-query";
import { type Mentor } from "../types";
import { mentorService } from "../services/mentor.service";
import { MentorCard } from "@/components/cards/MentorCard";

export function RelatedMentors({ currentMentor }: { currentMentor: Mentor }) {
  const { data: relatedMentors, isLoading, isError } = useQuery({
    queryKey: ["mentor-profile", "related", currentMentor.id],
    queryFn: () => mentorService.getRelatedMentors(currentMentor.id, currentMentor.expertise, 3),
  });

  if (isLoading) {
    return (
      <div className="mt-16 mb-8 border-t border-slate-200 pt-12" role="status" aria-label="Loading similar mentors">
        <div className="h-8 w-64 animate-pulse rounded bg-slate-100 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  // A failed lookup and a genuinely empty result both render nothing here -
  // this is a "you might also like" widget, not critical content, so a
  // retry affordance isn't worth the visual noise. The isError check exists
  // so this is a deliberate choice, not an accidental silent failure.
  if (isError || !relatedMentors?.length) return null;

  return (
    <div className="mt-16 mb-8 border-t border-slate-200 pt-12">
      <h2 className="text-2xl font-bold text-slate-900 mb-8">
        Similar Mentors You Might Like
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {relatedMentors.map((mentor) => (
          <MentorCard key={mentor.slug} mentor={mentor} />
        ))}
      </div>
    </div>
  );
}
