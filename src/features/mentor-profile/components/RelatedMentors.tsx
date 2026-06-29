import { useMemo } from "react";
import { type Mentor } from "../types";
import { mentors as baseMentors } from "@/data/platform";
import { MentorCard } from "@/components/cards/MentorCard";

export function RelatedMentors({ currentMentor }: { currentMentor: Mentor }) {
  const relatedMentors = useMemo(() => {
    return baseMentors
      .filter(m => m.slug !== currentMentor.slug) // Exclude current
      .map(mentor => {
        let score = 0;
        
        // Same category
        if (mentor.category === currentMentor.role) score += 5; // Note: platform.ts mentor.category mapping
        
        // Same technologies (overlap)
        const overlap = mentor.expertise.filter(tech => currentMentor.expertise.includes(tech));
        score += overlap.length * 4;
        
        // Same company
        if (mentor.company === currentMentor.company) score += 3;
        
        // Same experience range (within 2 years)
        const currentExpLen = currentMentor.experience?.[0]?.duration?.length || 0;
        if (Math.abs(mentor.experienceYears - currentExpLen) <= 2) score += 2;
        
        return { mentor, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.mentor);
  }, [currentMentor]);

  if (!relatedMentors.length) return null;

  return (
    <div className="mt-16 mb-8 border-t border-slate-200 pt-12">
      <h2 className="text-2xl font-bold text-slate-900 mb-8">
        Similar Mentors You Might Like
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {relatedMentors.map((mentor) => (
          <MentorCard key={mentor.name} mentor={mentor} />
        ))}
      </div>
    </div>
  );
}
