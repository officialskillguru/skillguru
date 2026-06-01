import { useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  MessageCircle,
  Play,
  Quote,
  Send,
  Star,
  TrendingUp,
  Video,
} from "lucide-react";

import { usePageMeta } from "@/hooks/usePageMeta";
import { usePremiumPageMotion } from "@/components/motion/usePremiumPageMotion";
import { successStories } from "@/data/platform";
import { placementStoryId } from "@/lib/placement-stories";
import { routes } from "@/lib/routes";
import { submitLead } from "@/services/leads";

export default function PlacementStoryPage() {
  const { id } = useParams();
  const pageRef = useRef<HTMLElement>(null);
  usePremiumPageMotion({ rootRef: pageRef });

  // Find matching story, default to first story if not found
  const story = successStories.find((item) => placementStoryId(item) === id) ?? successStories[0]!;

  usePageMeta(`${story.name}'s Placement Success Story`);

  // State for Callback Form
  const [callbackStatus, setCallbackStatus] = useState<string | null>(null);
  
  // State for Mock Video Play
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);

  // Form Submit handler
  async function handleCallbackSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setCallbackStatus("Submitting...");

    try {
      await submitLead("contact", {
        fullName: typeof data.get("fullName") === "string" ? (data.get("fullName") as string) : "",
        email: typeof data.get("email") === "string" ? (data.get("email") as string) : "",
        phone: typeof data.get("phone") === "string" ? (data.get("phone") as string) : "",
        subject: `Callback from Placement Page: ${story.name}`,
        message: `Callback requested for program: ${story.course}`,
        consent: true,
        website: "",
      });
      form.reset();
      setCallbackStatus("Callback request logged! We will contact you shortly.");
    } catch (err) {
      setCallbackStatus(err instanceof Error ? err.message : "Failed to log callback request.");
    }
  }

  return (
    <main ref={pageRef} className="page-shell">
      {/* Breadcrumb & Navigation */}
      <section className="bg-white px-4 py-5 border-b border-[#E5EAF5] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <Link
              to={routes.placements}
              className="inline-flex items-center gap-2 text-sm font-black text-[#1147FF] hover:-translate-x-0.5 transition"
            >
              <ArrowLeft className="size-4" /> Back to Placements
            </Link>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] hidden sm:flex">
              <Link to={routes.home}>Home</Link>
              <ChevronRight className="size-3" />
              <Link to={routes.placements}>Placements</Link>
              <ChevronRight className="size-3" />
              <span>{story.name}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Hero Header Section */}
      <section className="relative overflow-hidden bg-[#061B5C] px-4 py-12 text-white sm:px-6 lg:px-8 lg:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(25,217,255,0.22),transparent_26rem)]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[150px_1fr] lg:items-center">
            {/* Student Avatar */}
            <div className="premium-reveal size-36 shrink-0 overflow-hidden rounded-2xl border-4 border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.3)] bg-slate-800">
              <img src={story.avatar} alt={story.name} className="size-full object-cover object-top" />
            </div>

            <div>
              <div className="premium-reveal flex flex-wrap items-center gap-3">
                <span className="rounded-md bg-[#19D9FF] px-2.5 py-1 text-xs font-black text-[#061B5C] uppercase tracking-wider">
                  Success Story
                </span>
                <span className="rounded-md bg-green-500/20 border border-green-500/35 px-2.5 py-1 text-xs font-black text-green-300">
                  {story.package} Package
                </span>
              </div>
              
              <h1 className="premium-reveal text-4xl font-[900] tracking-tight text-white mt-4 sm:text-5xl">
                How {story.name} Landed a Role as {story.role}
              </h1>
              
              <div className="premium-reveal mt-6 grid gap-4 sm:grid-cols-3 max-w-3xl text-sm text-white/80">
                <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl p-3">
                  <Building2 className="size-5 text-[#19D9FF]" />
                  <span>Placed At: <strong>{story.company}</strong></span>
                </div>
                <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl p-3">
                  <Clock className="size-5 text-[#19D9FF]" />
                  <span>Course Term: <strong>{story.duration}</strong></span>
                </div>
                <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl p-3">
                  <TrendingUp className="size-5 text-[#19D9FF]" />
                  <span>Package Growth: <strong>{story.growth}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Details Section */}
      <section className="bg-[#F8FAFF] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
            
            {/* Story Case Study */}
            <div className="space-y-8">
              
              {/* Before vs After Visualizer */}
              <div className="premium-card-motion grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-red-100 bg-red-50/50 p-6">
                  <p className="text-xs font-black uppercase tracking-wider text-red-700">Before HR Remedy</p>
                  <h3 className="text-xl font-black text-[#061B5C] mt-2">{story.before}</h3>
                  <p className="text-xs text-[#64748B] mt-2">
                    Faced obstacles switching domains, lacked active developer projects, and wanted structured guidance.
                  </p>
                </div>
                <div className="rounded-xl border border-green-100 bg-green-50/50 p-6">
                  <p className="text-xs font-black uppercase tracking-wider text-green-700">Placed Outcome</p>
                  <h3 className="text-xl font-black text-[#061B5C] mt-2">{story.after}</h3>
                  <p className="text-xs text-[#64748B] mt-2">
                    Landed placement at a tier-1 partner with high technical score, portfolio proof, and custom salary packages.
                  </p>
                </div>
              </div>

              {/* Mock Video Interview Block */}
              <div className="premium-card-motion overflow-hidden rounded-xl border border-[#E5EAF5] bg-white shadow-sm p-6">
                <h2 className="text-xl font-black text-[#061B5C] mb-4 flex items-center gap-2">
                  <Video className="size-5 text-[#1147FF]" /> Video Testimonial Preview
                </h2>
                
                <div className="relative aspect-video rounded-xl bg-[#020817] overflow-hidden border border-slate-800">
                  {!isPlayingVideo ? (
                    <>
                      <img
                        src={story.avatar}
                        alt={story.name}
                        className="size-full object-cover object-top opacity-50"
                      />
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center p-4">
                        <button
                          type="button"
                          onClick={() => setIsPlayingVideo(true)}
                          className="grid size-16 place-items-center rounded-full bg-white text-[#1147FF] shadow-lg transition hover:scale-105 hover:bg-[#19D9FF] hover:text-[#061B5C]"
                          aria-label="Play story video"
                        >
                          <Play className="ml-1 size-7 fill-current" />
                        </button>
                        <p className="mt-3 text-xs font-semibold text-white/90">
                          Click to review {story.name}&apos;s video transcript & narrative
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="size-full flex flex-col items-center justify-center p-6 bg-slate-900 text-white text-center">
                      <Quote className="size-10 text-[#19D9FF] opacity-60 mb-4" />
                      <p className="max-w-md text-sm leading-6 italic text-white/90">
                        &quot;{story.quote}&quot;
                      </p>
                      <p className="mt-4 text-xs font-black text-[#19D9FF]">
                        - {story.name} ({story.role} at {story.company})
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsPlayingVideo(false)}
                        className="mt-6 text-xs font-semibold text-white/60 hover:text-white underline"
                      >
                        Reset Video Mockup
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Case Narrative */}
              <div className="premium-card-motion rounded-xl border border-[#E5EAF5] bg-white p-6 shadow-sm sm:p-8 space-y-6">
                <section>
                  <h3 className="text-lg font-black text-[#061B5C]">The Challenge</h3>
                  <p className="text-sm leading-7 text-[#64748B] mt-2">
                    Coming from a background of {story.before}, {story.name} faced difficulty getting recruiter callbacks. Hiring managers were looking for verifiable project proof, custom repository contributions, and familiarity with production standards that self-study courses often omit.
                  </p>
                </section>

                <section className="border-t border-[#E5EAF5] pt-5">
                  <h3 className="text-lg font-black text-[#061B5C]">The HR Remedy Experience</h3>
                  <p className="text-sm leading-7 text-[#64748B] mt-2">
                    Enrolling in the <strong>{story.course}</strong>, they were matched with a senior industry mentor. The core study strategy involved:
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-[#64748B] pl-4 list-disc">
                    <li>Completing structured labs and technical submissions.</li>
                    <li>Building mock projects featuring real APIs and databases.</li>
                    <li>Conducting 1-on-1 mock interview loops with mentor review gates.</li>
                  </ul>
                </section>

                <section className="border-t border-[#E5EAF5] pt-5">
                  <h3 className="text-lg font-black text-[#061B5C]">The Outcome</h3>
                  <p className="text-sm leading-7 text-[#64748B] mt-2">
                    Upon passing the recruitment readiness review, {story.name} was entered into the corporate placement pipeline, securing multiple offers and ultimately accepting a package of <strong>{story.package}</strong> to work as a {story.role} at {story.company}.
                  </p>
                </section>
              </div>

              {/* Course Call-to-action */}
              <div className="premium-card-motion rounded-xl border border-[#E5EAF5] bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-[#1147FF]">Program Taken</p>
                  <h4 className="text-lg font-black text-[#061B5C] mt-1">{story.course}</h4>
                </div>
                <Link
                  to={routes.courses}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1147FF] px-5 text-xs font-black text-white hover:bg-[#0A2A88] transition"
                >
                  Explore Program <ExternalLink className="size-3.5" />
                </Link>
              </div>
            </div>

            {/* Sidebar Callbacks */}
            <aside className="space-y-6">
              
              {/* Form Block */}
              <div className="rounded-xl border border-[#E5EAF5] bg-white p-6 shadow-[0_16px_50px_rgba(10,42,136,0.05)]">
                <h3 className="font-black text-[#061B5C] text-lg">Replicate this success</h3>
                <p className="text-xs text-[#64748B] mt-1 leading-5">
                  Leave your contact details and our team will advise you on course selection and customized career transition goals.
                </p>

                <form onSubmit={(event) => void handleCallbackSubmit(event)} className="mt-5 space-y-3">
                  <input
                    name="fullName"
                    required
                    placeholder="Full Name"
                    className="w-full h-11 rounded-lg border border-[#E5EAF5] px-3.5 text-xs outline-none focus:border-[#1147FF] transition bg-white"
                  />
                  <input
                    name="phone"
                    required
                    placeholder="Phone Number"
                    className="w-full h-11 rounded-lg border border-[#E5EAF5] px-3.5 text-xs outline-none focus:border-[#1147FF] transition bg-white"
                  />
                  <input
                    name="email"
                    required
                    type="email"
                    placeholder="Email Address"
                    className="w-full h-11 rounded-lg border border-[#E5EAF5] px-3.5 text-xs outline-none focus:border-[#1147FF] transition bg-white"
                  />
                  <button
                    type="submit"
                    className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-[#1147FF] text-xs font-black text-white hover:bg-[#0A2A88] transition"
                  >
                    Request Callback <Send className="size-3" />
                  </button>
                  {callbackStatus && (
                    <p className="mt-3 rounded-md bg-[#F1F5FF] p-2.5 text-xs font-semibold text-[#1147FF] leading-5">
                      {callbackStatus}
                    </p>
                  )}
                </form>
              </div>

              {/* Review metrics */}
              <div className="rounded-xl border border-[#E5EAF5] bg-white p-6 shadow-[0_16px_50px_rgba(10,42,136,0.05)]">
                <h3 className="font-black text-[#061B5C] text-base">Key Metrics</h3>
                <div className="mt-4 space-y-4">
                  {[
                    ["Package Offered", story.package, Star],
                    ["Transform Term", story.duration, Calendar],
                    ["Target Company", story.company, BriefcaseBusiness],
                  ].map(([label, val, Icon]) => {
                    const IconComp = Icon as React.ComponentType<{ className?: string }>;
                    return (
                      <div key={label as string} className="flex items-center gap-3">
                        <span className="grid size-8 place-items-center rounded-lg bg-[#F1F5FF] text-[#1147FF] shrink-0">
                          <IconComp className="size-4" />
                        </span>
                        <div>
                          <p className="text-xs text-[#64748B]">{label as string}</p>
                          <p className="text-sm font-black text-[#061B5C] mt-0.5">{val as string}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>

          </div>
        </div>
      </section>
    </main>
  );
}
