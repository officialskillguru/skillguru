import { useState } from "react";
import {
  Brain,
  Zap,
  ArrowRight,
  TrendingUp,
  Cpu,
  Database,
  Radio,
  FileCheck,
  CheckCircle,
  AlertTriangle,
  Play,
  Settings,
  MoreVertical,
  Activity,
  Code,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { GsapReveal } from "@/components/motion/gsap-reveal";

interface AssessmentRecord {
  id: string;
  name: string;
  score: number;
  strength: string;
  recommendation: string;
  status: "Completed" | "Pending Review";
}

const mockAssessments: AssessmentRecord[] = [
  { id: "ASM-882", name: "Aarav Singhal", score: 92, strength: "Logical Reasoning, System Logic", recommendation: "Backend Cloud Engineer", status: "Completed" },
  { id: "ASM-883", name: "Priya Patel", score: 88, strength: "Visual Hierarchy, Color Psychology", recommendation: "Product Designer (UI/UX)", status: "Completed" },
  { id: "ASM-884", name: "Rohan Gupta", score: 95, strength: "Scripting, Network Protocols", recommendation: "SOC / Security Associate", status: "Completed" },
  { id: "ASM-885", name: "Neha Deshmukh", score: 78, strength: "Cloud Services, Command Line", recommendation: "DevOps / Support Associate", status: "Pending Review" },
];

export default function AdminAIGuidancePage() {
  const [assessments, setAssessments] = useState<AssessmentRecord[]>(mockAssessments);
  const [activeIntegrationTab, setActiveIntegrationTab] = useState<"assessments" | "callbacks" | "webhooks">("assessments");
  const [webhookActive, setWebhookActive] = useState(true);

  const triggerTestPayload = () => {
    toast.info("Sending mock webhook payload to n8n webhook listener...");
    setTimeout(() => {
      toast.success("Webhook status 200 OK. n8n received and processed profile details.");
    }, 1200);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <GsapReveal direction="up" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#0F2B7A] dark:text-cyan-200 flex items-center gap-3">
            <Brain className="size-8 text-[#22D3EE] animate-pulse" />
            <span>AI Career Guidance & Automation</span>
          </h1>
          <p className="mt-1 text-sm font-semibold text-[#64748B] dark:text-[#94A3B8]">
            Configure career profiling heuristics, assess user outcomes, review counselling priority alerts and link automation endpoints.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">AI Engines Active</span>
        </div>
      </GsapReveal>

      {/* Integration Options Navigation */}
      <div className="flex border-b border-[#DDE7F6] dark:border-slate-800">
        {[
          { id: "assessments", label: "Aptitude Logs", count: assessments.length },
          { id: "callbacks", label: "Priority Auto-Callbacks", count: 2 },
          { id: "webhooks", label: "n8n Webhook Triggers", count: "Ready" }
        ].map((tb) => (
          <button
            key={tb.id}
            onClick={() => setActiveIntegrationTab(tb.id as any)}
            className={[
              "py-3.5 px-5 text-xs font-black border-b-2 transition-all flex items-center gap-2",
              activeIntegrationTab === tb.id
                ? "border-[#0F2B7A] text-[#0F2B7A] dark:border-cyan-400 dark:text-cyan-300"
                : "border-transparent text-slate-450 hover:text-[#0F2B7A] dark:hover:text-white",
            ].join(" ")}
          >
            <span>{tb.label}</span>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] dark:bg-slate-800">{tb.count}</span>
          </button>
        ))}
      </div>

      {/* Assessments Tab */}
      {activeIntegrationTab === "assessments" && (
        <GsapReveal direction="up" className="rounded-2xl border border-[#DDE7F6] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DDE7F6] bg-[#EEF3FA]/40 text-[10px] font-black uppercase tracking-wider text-[#64748B] dark:border-slate-850 dark:bg-slate-900/50">
                  <th className="px-6 py-4">Assessment ID</th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Aptitude Score</th>
                  <th className="px-6 py-4">Identified Strengths</th>
                  <th className="px-6 py-4">AI Recommended Career</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE7F6] dark:divide-slate-850">
                {assessments.map((asm) => (
                  <tr key={asm.id} className="text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                    <td className="px-6 py-4.5 font-bold text-slate-450">{asm.id}</td>
                    <td className="px-6 py-4.5 font-black text-[#0F2B7A] dark:text-white">{asm.name}</td>
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-cyan-600 dark:text-cyan-400">{asm.score}%</span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${asm.score}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 font-bold text-slate-500">{asm.strength}</td>
                    <td className="px-6 py-4.5">
                      <span className="rounded bg-indigo-50 px-2 py-1 text-[11px] font-black text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400">
                        {asm.recommendation}
                      </span>
                    </td>
                    <td className="px-6 py-4.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                        asm.status === "Completed"
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                          : "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400"
                      }`}>
                        {asm.status}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-right">
                      <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                        <MoreVertical className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GsapReveal>
      )}

      {/* Auto-Callbacks Tab */}
      {activeIntegrationTab === "callbacks" && (
        <GsapReveal direction="up" className="grid gap-6 md:grid-cols-2">
          {[
            { id: "A-501", name: "Neha Deshmukh", reason: "Score below threshold (78%), Cloud Engineering. Requires guidance on course path adjustment.", strength: "Cloud services basics", icon: AlertTriangle, status: "High Priority Callback" },
            { id: "A-502", name: "Rohan Gupta", reason: "Score exceptionally high (95%), Cyber Security. Ideal candidate for direct placement fast-track.", strength: "Advanced scripting, Linux", icon: CheckCircle, status: "Elite Candidate Fast-Track" }
          ].map((item) => {
            const AlertIcon = item.icon;
            return (
              <div key={item.id} className="rounded-3xl border border-[#DDE7F6] bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-rose-50 px-2 py-0.5 text-[9px] font-black uppercase text-rose-600 dark:bg-rose-950/20 dark:text-rose-450">
                    {item.status}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{item.id}</span>
                </div>

                <div className="flex items-start gap-3.5">
                  <span className="rounded-xl bg-slate-100 p-2.5 text-[#0F2B7A] dark:bg-slate-800 dark:text-cyan-300">
                    <AlertIcon className="size-5" />
                  </span>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-[#0F2B7A] dark:text-white">{item.name}</h4>
                    <p className="text-[11px] font-bold text-slate-400">Primary Strength: {item.strength}</p>
                    <p className="text-xs font-bold text-slate-500 leading-normal">{item.reason}</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-50 dark:border-slate-850">
                  <button
                    onClick={() => toast.success("Scheduled counseling call with counselor board.")}
                    className="h-10 rounded-xl bg-[#0F2B7A] px-5 text-xs font-black text-white dark:bg-cyan-400 dark:text-[#0F2B7A]"
                  >
                    Initiate Callback
                  </button>
                </div>
              </div>
            );
          })}
        </GsapReveal>
      )}

      {/* n8n Integrations and Automation Flow Webhooks */}
      {activeIntegrationTab === "webhooks" && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Active integrations details */}
          <GsapReveal direction="up" className="rounded-2xl border border-[#DDE7F6] bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-7 space-y-6">
            <div>
              <h3 className="text-base font-black text-[#0F2B7A] dark:text-cyan-200">Active Webhook Integrations</h3>
              <p className="text-xs font-semibold text-slate-400">Map lead metadata triggers and outgoing payloads variables</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 dark:border-slate-850">
                <div className="flex items-center gap-3">
                  <Cpu className="size-5 text-[#0F2B7A] dark:text-cyan-300" />
                  <div>
                    <h4 className="text-xs font-black text-[#0F2B7A] dark:text-white">n8n Workflow Listener</h4>
                    <p className="text-[10px] font-bold text-slate-450">URL: https://n8n.hr-remedy.edu/hooks/lead-analysis</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-block size-2 rounded-full ${webhookActive ? "bg-emerald-500" : "bg-slate-350"}`} />
                  <button
                    type="button"
                    onClick={() => {
                      setWebhookActive(!webhookActive);
                      toast.success(webhookActive ? "Webhook paused." : "Webhook activated.");
                    }}
                    className="text-xs font-black text-cyan-600 uppercase"
                  >
                    {webhookActive ? "Pause" : "Resume"}
                  </button>
                </div>
              </div>

              {/* Sample payload representation */}
              <div className="rounded-2xl bg-slate-950 p-4 border border-slate-850">
                <div className="flex items-center justify-between pb-2 border-b border-slate-850 mb-3">
                  <span className="text-[10px] font-black uppercase text-cyan-400 flex items-center gap-2">
                    <Code className="size-3.5" />
                    <span>Payload Schema Sample</span>
                  </span>
                  <button
                    onClick={triggerTestPayload}
                    className="flex items-center gap-1.5 text-[9px] font-black uppercase text-white hover:text-cyan-300"
                  >
                    <Play className="size-3" />
                    <span>Test Event</span>
                  </button>
                </div>
                <pre className="text-[10px] font-mono text-slate-350 overflow-x-auto leading-normal">
{`{
  "leadId": "L-101",
  "name": "Aarav Singhal",
  "aptitudeScore": 92,
  "careerStrength": "System Logic",
  "assignedChannel": "n8n_OpenAI_Counsellor",
  "timestamp": "2026-06-01T16:05:00Z"
}`}
                </pre>
              </div>
            </div>
          </GsapReveal>

          {/* Flow representation layout */}
          <GsapReveal direction="up" delay={0.1} className="rounded-2xl border border-[#DDE7F6] bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-5 space-y-6">
            <div>
              <h3 className="text-base font-black text-[#0F2B7A] dark:text-cyan-200">n8n Automation Flow Graph</h3>
              <p className="text-xs font-semibold text-slate-400">Visual mapping of active micro-services</p>
            </div>

            {/* Simulated node connection flow */}
            <div className="space-y-4 py-4">
              {[
                { name: "Counselling Webhook", desc: "Incoming lead triggers event", color: "bg-blue-500", icon: Radio },
                { name: "OpenAI Analysis", desc: "Formulates aptitude profiles recommendation", color: "bg-purple-500", icon: Cpu },
                { name: "Salesforce CRM Sync", desc: "Creates client card in command deck", color: "bg-indigo-500", icon: Database },
                { name: "SMS Twilio Alert", desc: "Dispatches counseling appointment link", color: "bg-emerald-500", icon: CheckCircle }
              ].map((step, idx, arr) => {
                const StepIcon = step.icon;
                return (
                  <div key={step.name} className="flex flex-col items-center">
                    <div className="flex w-full items-center gap-3.5 rounded-2xl border border-slate-100 p-3 dark:border-slate-850">
                      <span className={`inline-grid size-8 place-items-center rounded-lg ${step.color} text-white shrink-0`}>
                        <StepIcon className="size-4.5" />
                      </span>
                      <div>
                        <h4 className="text-xs font-black text-[#0F2B7A] dark:text-white">{step.name}</h4>
                        <p className="text-[9px] font-bold text-slate-400">{step.desc}</p>
                      </div>
                    </div>
                    {idx < arr.length - 1 && (
                      <div className="h-6 w-0.5 bg-slate-200 my-1 dark:bg-slate-800" />
                    )}
                  </div>
                );
              })}
            </div>
          </GsapReveal>
        </div>
      )}
    </div>
  );
}
