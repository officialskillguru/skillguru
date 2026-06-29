import { type Mentor } from "../types";

export function MentorTools({ mentor }: { mentor: Mentor }) {
  if (!mentor.tools?.length) return null;

  return (
    <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100 mb-8 scroll-mt-24">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">
        Tools & Technologies
      </h3>
      <div className="flex flex-wrap gap-3">
        {mentor.tools.map((tool, i) => (
          <div 
            key={i}
            className="px-4 py-2.5 bg-slate-50 text-slate-700 font-medium rounded-xl border border-slate-200 hover:border-[#19C7C8] hover:text-[#111E79] hover:bg-[#19C7C8]/5 transition-colors cursor-default"
          >
            {tool}
          </div>
        ))}
      </div>
    </div>
  );
}

