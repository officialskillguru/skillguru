import type { Mentor } from "../types";

interface MentorAboutProps {
  mentor: Mentor;
}

export function MentorAbout({ mentor }: MentorAboutProps) {
  return (
    <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100 mb-8 scroll-mt-24" id="about">
      <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
        About {mentor.name.split(' ')[0]}
      </h2>
      
      <div className="prose prose-lg prose-slate max-w-none mb-8">
        {mentor.about.split('\n').map((paragraph, i) => (
          <p key={i} className="text-slate-600 leading-relaxed mb-4">
            {paragraph}
          </p>
        ))}
      </div>

      {mentor.teachingPhilosophy && (
        <div className="bg-[#F8FAFC] rounded-2xl p-6 border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-3">Teaching Philosophy</h3>
          <p className="text-slate-600 italic leading-relaxed">
            "{mentor.teachingPhilosophy}"
          </p>
        </div>
      )}
    </div>
  );
}

