import { type Mentor } from "../types";

export function MentorSkills({ mentor }: { mentor: Mentor }) {
  if (!mentor.skills?.length) return null;

  return (
    <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100 mb-8 scroll-mt-24" id="skills">
      <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
        Technical Skills
      </h2>

      <div className="space-y-6">
        {mentor.skills.map((skill) => (
          <div key={skill.id} className="group">
            <div className="flex justify-between items-end mb-2">
              <span className="font-bold text-slate-700">{skill.name}</span>
              <span className="text-sm font-semibold text-[#19C7C8]">{skill.proficiency}%</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#111E79] to-[#19C7C8] rounded-full relative transition-all duration-1000 ease-out origin-left"
                style={{ width: `${skill.proficiency}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
