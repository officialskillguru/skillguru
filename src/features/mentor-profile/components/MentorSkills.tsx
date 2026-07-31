import { type Mentor } from "../types";

export function MentorSkills({ mentor }: { mentor: Mentor }) {
  if (!mentor.skills?.length) return null;

  return (
    <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100 mb-8 scroll-mt-24" id="skills">
      <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
        Technical Skills
      </h2>

      <div className="flex flex-wrap gap-3">
        {mentor.skills.map((skill) => (
          <span
            key={skill.id}
            className="px-4 py-2.5 bg-slate-50 text-slate-700 font-medium rounded-xl border border-slate-200"
          >
            {skill.name}
          </span>
        ))}
      </div>
    </div>
  );
}
