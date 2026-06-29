import { CheckCircle2, MapPin, Share2 } from "lucide-react";
import { type Mentor } from "../types";

interface MentorHeroProps {
  mentor: Mentor;
}

export function MentorHero({ mentor }: MentorHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#111E79] via-[#2F1F8A] to-[#5B35F2] text-white p-8 md:p-12 mb-8 shadow-xl shadow-[#5B35F2]/10 border border-white/10 isolate">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-96 h-96 bg-[#19C7C8] rounded-full blur-[120px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-96 h-96 bg-[#5B35F2] rounded-full blur-[100px] opacity-40 pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden border-4 border-white/10 shadow-2xl relative">
            {mentor.avatar ? (
              <img src={mentor.avatar} alt={mentor.name} className="w-full h-full object-cover bg-white" />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-4xl font-bold">
                {mentor.name.charAt(0)}
              </div>
            )}
            <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-2xl" />
          </div>
          {mentor.verified && (
            <div className="absolute -bottom-3 -right-3 bg-white text-[#19C7C8] p-1.5 rounded-full shadow-lg">
              <CheckCircle2 className="w-6 h-6 fill-[#19C7C8] text-white" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="grow">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{mentor.name}</h1>
            <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-sm font-medium border border-white/10 text-[#19C7C8]">
              Top Mentor
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-slate-200 text-lg mb-6">
            <span className="font-medium text-white">{mentor.role}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <div className="flex items-center gap-2">
              {mentor.companyLogo && (
                <div className="w-5 h-5 bg-white rounded-md flex items-center justify-center overflow-hidden">
                  <img src={mentor.companyLogo} alt={mentor.company} className="w-full h-full object-contain p-0.5" />
                </div>
              )}
              <span>{mentor.company}</span>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span>{mentor.location}</span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 border-t border-white/10 pt-6">
            {mentor.stats.map((stat, i) => (
              <div key={i}>
                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-slate-300 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions (Desktop only, mobile will have sticky bar) */}
        <div className="hidden md:flex flex-col gap-3 shrink-0 w-48">
          <button className="w-full py-3 px-4 bg-white text-[#111E79] font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5 duration-200 text-sm">
            Book Counselling
          </button>
          <button className="w-full py-3 px-4 bg-white/10 backdrop-blur-md text-white font-medium rounded-xl hover:bg-white/20 border border-white/20 transition-all flex items-center justify-center gap-2 text-sm">
            <Share2 className="w-4 h-4" />
            Share Profile
          </button>
        </div>
      </div>
    </div>
  );
}

