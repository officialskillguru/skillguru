import { Trophy, Star, Award, Medal, Crown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { type Mentor } from "../types";

const iconMap: Record<string, LucideIcon> = {
  Award: Award,
  Trophy: Trophy,
  Star: Star,
  Medal: Medal,
  Crown: Crown,
};

export function MentorAchievements({ mentor }: { mentor: Mentor }) {
  if (!mentor.achievements?.length) return null;

  return (
    <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100 mb-8 scroll-mt-24" id="achievements">
      <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
        Achievements & Awards
      </h2>

      <div className="space-y-4">
        {mentor.achievements.map((ach) => {
          const IconComponent = iconMap[ach.icon as keyof typeof iconMap];
          if (!IconComponent) return null;
          
          return (
            <div key={ach.id} className="flex gap-4 p-5 rounded-2xl bg-linear-to-r from-amber-50 to-transparent border border-amber-100/50">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-600">
                <IconComponent className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-bold text-slate-900">{ach.title}</h3>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-md">
                    {ach.date}
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {ach.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

