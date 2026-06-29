import { Award, BookOpenCheck, BrainCircuit, BriefcaseBusiness, MessageCircle, Target } from "lucide-react";

const nodes = [
  { label: "Career Counselling", icon: MessageCircle, className: "left-[6%] top-[58%]" },
  { label: "Skill Mapping", icon: Target, className: "left-[18%] top-[22%]" },
  { label: "Live Learning", icon: BookOpenCheck, className: "left-[45%] top-[10%]" },
  { label: "AI Practice", icon: BrainCircuit, className: "right-[14%] top-[30%]" },
  { label: "Certification", icon: Award, className: "right-[8%] bottom-[22%]" },
  { label: "Placement", icon: BriefcaseBusiness, className: "left-[40%] bottom-[8%]" },
];

export function RoadmapVisual() {
  return (
    <div className="relative min-h-[420px] overflow-x-auto rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-2xl backdrop-blur-xl">
      <div className="relative min-h-[420px] min-w-[640px] p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(0,194,255,0.26),transparent_18rem)]" />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 640 440" fill="none" aria-hidden="true" preserveAspectRatio="none">
          <path
            d="M74 288 C160 110 288 360 384 124 C462 -58 532 222 570 320 C618 444 406 390 318 402 C204 418 26 410 74 288Z"
            stroke="url(#roadmapGradient)"
            strokeWidth="3"
            strokeDasharray="10 12"
          />
          <defs>
            <linearGradient id="roadmapGradient" x1="74" x2="570" y1="288" y2="320">
              <stop stopColor="#00C2FF" />
              <stop offset="1" stopColor="#4DE2FF" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute left-1/2 top-1/2 grid size-36 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[2rem] border border-[#00C2FF]/30 bg-[#031B34] shadow-[0_0_60px_rgba(0,194,255,0.30)]">
          <div className="grid size-24 place-items-center rounded-full bg-gradient-to-br from-[#00C2FF] to-[#2563EB]">
            <BrainCircuit className="size-11 text-white" />
          </div>
          <span className="absolute -bottom-10 text-center text-sm font-black text-white">AI Career Engine</span>
        </div>
        {nodes.map((node) => {
          const Icon = node.icon;
          return (
            <div key={node.label} className={`absolute ${node.className}`}>
              <div className="group min-w-28 rounded-2xl border border-white/12 bg-[#071f3f]/90 p-3 text-center shadow-[0_20px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl transition hover:-translate-y-1">
                <div className="mx-auto grid size-11 place-items-center rounded-xl bg-[#00C2FF]/15 text-[#4DE2FF]">
                  <Icon className="size-5" />
                </div>
                <p className="mt-2 text-[11px] font-bold leading-tight text-white/86">{node.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
