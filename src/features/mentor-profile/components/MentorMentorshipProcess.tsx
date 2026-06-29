import { ArrowDown } from "lucide-react";
import { type Mentor } from "../types";

export function MentorMentorshipProcess({ mentor }: { mentor: Mentor }) {
  if (!mentor.mentorshipProcess?.length) return null;

  return (
    <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100 mb-8 scroll-mt-24" id="process">
      <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
        Mentorship Process
      </h2>

      <div className="flex flex-col gap-4">
        {mentor.mentorshipProcess.map((step, idx) => (
          <div key={idx} className="relative">
            <div className="flex gap-6 items-start p-6 rounded-2xl bg-[#F8FAFC] border border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0 text-[#111E79] font-bold text-lg">
                {step.step}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                  {step.description}
                </p>
              </div>
            </div>
            
            {idx < mentor.mentorshipProcess.length - 1 && (
              <div className="absolute -bottom-4 left-12 w-6 h-6 -ml-3 flex items-center justify-center text-slate-300 z-10">
                <ArrowDown className="w-5 h-5" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

