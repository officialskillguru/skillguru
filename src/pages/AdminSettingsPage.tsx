import { useState } from "react";
import {
  Settings,
  Mail,
  CreditCard,
  Layers,
  Save,
  CheckCircle,
  Eye,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { GsapReveal } from "@/components/motion/gsap-reveal";

export default function AdminSettingsPage() {
  const [gatewayMode, setGatewayMode] = useState<"test" | "live">("test");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("EdTech platform settings committed to secure configuration ledger.");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <GsapReveal direction="up" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#0F2B7A] dark:text-cyan-200">
            EdTech System Settings
          </h1>
          <p className="mt-1 text-sm font-semibold text-[#64748B] dark:text-[#94A3B8]">
            Configure outbound SMTP mail systems, payment gateways billing tokens, Google Analytics tracking scripts, and platform defaults.
          </p>
        </div>
      </GsapReveal>

      {/* Main Settings Form Grid */}
      <form onSubmit={handleSave} className="grid gap-6 md:grid-cols-12">
        {/* Left main form controls */}
        <div className="space-y-6 md:col-span-8">
          {/* Outbound SMTP configurations */}
          <GsapReveal direction="up" className="rounded-3xl border border-[#DDE7F6] bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-base font-black text-[#0F2B7A] dark:text-cyan-200 flex items-center gap-2">
              <Mail className="size-5" />
              <span>Outbound SMTP System</span>
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400">SMTP Host Server</label>
                <input
                  defaultValue="smtp.mailgun.hrremedy.edu"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400">SMTP Port</label>
                <input
                  defaultValue="587"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400">Default Sender Email</label>
                <input
                  defaultValue="admissions@hrremedy.edu.in"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400">Sender Display Name</label>
                <input
                  defaultValue="HR Remedy Admissions"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>
          </GsapReveal>

          {/* Outbound Payment integrations Razorpay / Stripe */}
          <GsapReveal direction="up" delay={0.1} className="rounded-3xl border border-[#DDE7F6] bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-base font-black text-[#0F2B7A] dark:text-cyan-200 flex items-center gap-2">
              <CreditCard className="size-5" />
              <span>Razorpay Tuition Gateway</span>
            </h3>

            {/* Test/Live toggle slider */}
            <div className="flex items-center justify-between rounded-2xl bg-[#EEF3FA]/40 p-4 dark:bg-slate-800/40">
              <div className="space-y-1">
                <p className="text-xs font-black text-[#0F2B7A] dark:text-cyan-300">Tuition Gateway Operation Mode</p>
                <p className="text-[10px] font-bold text-slate-400 leading-normal">
                  Toggle gateway mode between Sandbox testing and active live payments processing.
                </p>
              </div>
              <div className="flex h-11 items-center rounded-xl bg-slate-200 p-1 dark:bg-slate-700">
                <button
                  type="button"
                  onClick={() => setGatewayMode("test")}
                  className={[
                    "h-9 rounded-lg px-4 text-xs font-black transition-all",
                    gatewayMode === "test"
                      ? "bg-white text-[#0F2B7A] shadow-sm dark:bg-[#0F2B7A] dark:text-white"
                      : "text-slate-500",
                  ].join(" ")}
                >
                  Sandbox
                </button>
                <button
                  type="button"
                  onClick={() => setGatewayMode("live")}
                  className={[
                    "h-9 rounded-lg px-4 text-xs font-black transition-all",
                    gatewayMode === "live"
                      ? "bg-rose-600 text-white shadow-sm"
                      : "text-slate-500",
                  ].join(" ")}
                >
                  Production
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400">Razorpay Key ID</label>
                <input
                  defaultValue="rzp_test_Ym12aG9sMTI0NGt"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400">Razorpay Key Secret</label>
                <div className="relative">
                  <input
                    type="password"
                    defaultValue="••••••••••••••••••••••••"
                    className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 pr-10 text-sm font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                  <button type="button" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Eye className="size-4.5" />
                  </button>
                </div>
              </div>
            </div>
          </GsapReveal>
        </div>

        {/* Right side parameters summary actions */}
        <div className="space-y-6 md:col-span-4">
          <GsapReveal direction="up" delay={0.2} className="rounded-3xl border border-[#DDE7F6] bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-xs font-black text-[#0F2B7A] dark:text-cyan-200 uppercase tracking-wider">Save variables</h3>
            <p className="text-xs font-bold text-slate-500 leading-normal">
              Committed settings become globally active across Admissions platforms, SMS dispatch networks, and student portals instantly.
            </p>
            <button
              type="submit"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0F2B7A] text-xs font-black text-white hover:bg-opacity-90 shadow-lg shadow-[#0f2b7a]/15 dark:bg-cyan-400 dark:text-[#0F2B7A]"
            >
              <Save className="size-4" />
              <span>Commit System Parameters</span>
            </button>
          </GsapReveal>

          <GsapReveal direction="up" delay={0.25} className="rounded-3xl border border-dashed border-amber-200 bg-amber-50/20 p-6 space-y-4 dark:border-amber-900/50">
            <h3 className="text-xs font-black text-amber-600 dark:text-amber-450 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="size-4" />
              <span>System Backup Alert</span>
            </h3>
            <p className="text-xs font-bold text-slate-500 leading-normal">
              Outbound admissions automated reports dispatch schedule runs daily at 00:00 IST. Next sync queues 14,820 candidate registers successfully.
            </p>
          </GsapReveal>
        </div>
      </form>
    </div>
  );
}
