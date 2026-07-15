import { Briefcase } from "lucide-react";
import { type Mentor } from "../types";

export function MentorExperience({ mentor }: { mentor: Mentor }) {
  if (!mentor.experience?.length) return null;

  return (
    <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100 mb-8 scroll-mt-24" id="experience">
      <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
        Industry Experience
      </h2>

      <div className="relative border-l-2 border-slate-100 ml-4 md:ml-6 space-y-12">
        {mentor.experience.map((exp) => (
          <div key={exp.id} className="relative pl-8 md:pl-10">
            {/* Timeline Dot */}
            <div className="absolute -left-[21px] top-1 w-10 h-10 bg-white rounded-full border-4 border-white shadow-sm flex items-center justify-center">
              {exp.companyLogo ? (
                <img src={exp.companyLogo} alt="" className="w-6 h-6 object-contain" />
              ) : (
                <Briefcase className="w-4 h-4 text-slate-400" />
              )}
            </div>

            <div className="flex flex-col md:row md:items-start justify-between gap-2 mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{exp.role}</h3>
                <div className="text-lg font-medium text-slate-600 mt-1">{exp.company}</div>
              </div>
              <div className="flex flex-col items-start md:items-end text-sm text-slate-500 font-medium">
                <span>{exp.startDate} – {exp.endDate || "Present"}</span>
                <span className="text-slate-400">{exp.duration}</span>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              {exp.responsibilities.map((resp, idx) => (
                <li key={idx} className="text-slate-600 leading-relaxed relative pl-5">
                  <span className="absolute left-0 top-2.5 w-1.5 h-1.5 rounded-full bg-slate-300" />
                  {resp}
                </li>
              ))}
            </ul>

            {exp.achievements?.length > 0 && (
              <div className="bg-muted rounded-xl p-5 border border-slate-100">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  </span>
                  Key Achievements
                </h4>
                <ul className="space-y-2">
                  {exp.achievements.map((ach, idx) => (
                    <li key={idx} className="text-slate-700 font-medium text-sm">
                      {ach}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

