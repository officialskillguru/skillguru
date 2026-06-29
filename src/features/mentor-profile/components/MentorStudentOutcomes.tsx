import { TrendingUp, Quote } from "lucide-react";
import { type Mentor } from "../types";

export function MentorStudentOutcomes({ mentor }: { mentor: Mentor }) {
  if (!mentor.testimonials?.length) return null;

  return (
    <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100 mb-8 scroll-mt-24" id="outcomes">
      <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
        Student Outcomes
      </h2>

      <div className="grid grid-cols-1 gap-6">
        {mentor.testimonials.map((test) => (
          <div key={test.id} className="rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden relative">
            <Quote className="absolute top-6 right-6 w-12 h-12 text-slate-200 rotate-180" />
            
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-4 mb-6">
                <img src={test.studentAvatar} alt={test.studentName} className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{test.studentName}</h3>
                  <div className="text-sm font-medium text-slate-500">{test.studentRole}</div>
                </div>
              </div>

              <p className="text-slate-700 italic text-lg leading-relaxed mb-8 relative z-10">
                "{test.quote}"
              </p>

              {/* Transition Block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
                <div className="flex flex-col relative md:after:content-[''] md:after:absolute md:after:right-0 md:after:top-2 md:after:bottom-2 md:after:w-px md:after:bg-slate-100 pr-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Before Mentorship</span>
                  <span className="font-semibold text-slate-900 mb-0.5">{test.previousRole}</span>
                  <span className="text-sm text-slate-500">{test.previousSalary}</span>
                </div>
                
                <div className="flex flex-col pl-4 md:pl-4">
                  <span className="text-xs font-bold text-[#19C7C8] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3" /> After {test.mentorshipDuration}
                  </span>
                  <div className="flex items-center gap-2 mb-0.5">
                    {test.companyLogo && (
                      <img src={test.companyLogo} alt={test.companyName} className="w-4 h-4 object-contain" />
                    )}
                    <span className="font-bold text-slate-900">{test.currentRole}</span>
                  </div>
                  <span className="text-sm font-bold text-[#111E79]">{test.currentSalary}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

