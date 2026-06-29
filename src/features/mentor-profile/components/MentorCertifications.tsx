import { Award } from "lucide-react";
import { type Mentor } from "../types";

export function MentorCertifications({ mentor }: { mentor: Mentor }) {
  if (!mentor.certifications?.length) return null;

  return (
    <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100 mb-8 scroll-mt-24" id="certifications">
      <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
        Certifications
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mentor.certifications.map((cert) => (
          <div key={cert.id} className="flex items-start gap-4 p-5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 hover:shadow-md transition-all group">
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center p-2 shrink-0">
              {cert.issuerLogo ? (
                <img src={cert.issuerLogo} alt={cert.issuer} className="w-full h-full object-contain" />
              ) : (
                <Award className="w-6 h-6 text-slate-400" />
              )}
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#111E79] transition-colors line-clamp-2 leading-tight mb-1">
                {cert.name}
              </h3>
              <div className="text-sm font-medium text-slate-500">
                {cert.issuer} &bull; {cert.issueDate}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

