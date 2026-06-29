import { type Mentor } from "../types";

export function MentorCompanies({ mentor }: { mentor: Mentor }) {
  if (!mentor.companiesWorkedWith?.length) return null;

  return (
    <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100 mb-8 scroll-mt-24">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">
        Companies Worked With
      </h3>
      <div className="flex flex-wrap items-center gap-8 md:gap-12">
        {mentor.companiesWorkedWith.map((company, i) => (
          <div key={i} className="flex items-center gap-3 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
            <div className="w-8 h-8 md:w-10 md:h-10 relative flex items-center justify-center">
              <img src={company.logo} alt={company.name} className="max-w-full max-h-full object-contain" />
            </div>
            <span className="font-semibold text-slate-700 text-lg">{company.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

