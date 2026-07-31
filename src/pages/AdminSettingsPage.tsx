import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  CreditCard,
  Save,
  Eye,
  EyeOff,
  AlertCircle,
  Bell,
  Shield,
  Send,
  Loader2,
  Settings as SettingsIcon,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { GsapReveal } from "@/components/motion/gsap-reveal";
import { useAdminCMSSetting, useSaveAdminCMSSetting } from "@/hooks/admin/useAdminCMS";
import { useBroadcastNotification } from "@/hooks/admin/useAdminSystem";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"platform" | "notifications" | "audit">("platform");

  // Platform Settings
  const [gatewayMode, setGatewayMode] = useState<"test" | "live">("test");
  const { data: remoteSmtp } = useAdminCMSSetting<{ host: string; port: string; email: string; name: string }>("sys_smtp");
  const { data: remoteGateway } = useAdminCMSSetting<{ mode: "test"|"live"; key: string; secret: string }>("sys_gateway");
  const saveSetting = useSaveAdminCMSSetting();

  const [smtpHost, setSmtpHost] = useState("smtp.mailgun.skillguru.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpEmail, setSmtpEmail] = useState("admissions@skillguru.com");
  const [smtpName, setSmtpName] = useState("SkillGuru Admissions");
  
  const [rzpKey, setRzpKey] = useState("rzp_test_Ym12aG9sMTI0NGt");
  const [rzpSecret, setRzpSecret] = useState("••••••••••••••••••••••••");
  const [showRzpSecret, setShowRzpSecret] = useState(false);

  useEffect(() => {
    if (remoteSmtp) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setSmtpHost(remoteSmtp.host);
      setSmtpPort(remoteSmtp.port);
      setSmtpEmail(remoteSmtp.email);
      setSmtpName(remoteSmtp.name);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [remoteSmtp]);

  useEffect(() => {
    if (remoteGateway) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setGatewayMode(remoteGateway.mode);
      setRzpKey(remoteGateway.key);
      setRzpSecret(remoteGateway.secret);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [remoteGateway]);

  const handleSavePlatformSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSetting.mutate({
      key: "sys_smtp",
      value: { host: smtpHost, port: smtpPort, email: smtpEmail, name: smtpName }
    });
    saveSetting.mutate({
      key: "sys_gateway",
      value: { mode: gatewayMode, key: rzpKey, secret: rzpSecret }
    }, {
      onSuccess: () => toast.success("System parameters saved successfully.")
    });
  };

  // Notifications
  const [notiTitle, setNotiTitle] = useState("");
  const [notiMessage, setNotiMessage] = useState("");
  const [notiType, setNotiType] = useState("info");
  const broadcastMutation = useBroadcastNotification();

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notiTitle || !notiMessage) return toast.error("Please fill all fields");
    
    broadcastMutation.mutate({ title: notiTitle, message: notiMessage }, {
      onSuccess: () => {
        toast.success("Broadcast message scheduled and sent.");
        setNotiTitle("");
        setNotiMessage("");
      },
      onError: (err) => {
        toast.error(`Broadcast failed: ${err.message}`);
      }
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <GsapReveal direction="up" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary dark:text-cyan-200">
            System Control Center
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground dark:text-slate-400">
            Configure system parameters, broadcast notifications, and review security audit logs.
          </p>
        </div>
      </GsapReveal>

      {/* Tabs */}
      <div className="flex border-b border-border dark:border-slate-800">
        {[
          { id: "platform", label: "Platform Parameters", icon: SettingsIcon },
          { id: "notifications", label: "Notification Center", icon: Bell },
          { id: "audit", label: "Security & Audit", icon: Shield }
        ].map((tb) => {
          const TabIcon = tb.icon;
          return (
            <button
              key={tb.id}
              onClick={() => setActiveTab(tb.id as "platform" | "notifications" | "audit")}
              className={[
                "py-3.5 px-5 text-xs font-black border-b-2 transition-all flex items-center gap-2",
                activeTab === tb.id
                  ? "border-primary text-primary dark:border-cyan-400 dark:text-cyan-300"
                  : "border-transparent text-slate-450 hover:text-primary dark:hover:text-white",
              ].join(" ")}
            >
              <TabIcon className="size-4" />
              <span>{tb.label}</span>
            </button>
          );
        })}
      </div>

      {/* Platform Settings Tab */}
      {activeTab === "platform" && (
        <form onSubmit={handleSavePlatformSettings} className="grid gap-6 md:grid-cols-12 mt-6">
          <div className="space-y-6 md:col-span-8">
            {/* Outbound SMTP configurations */}
            <GsapReveal direction="up" className="rounded-3xl border border-border bg-card p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <h3 className="text-base font-black text-primary dark:text-cyan-200 flex items-center gap-2">
                <Mail className="size-5" />
                <span>Outbound SMTP System</span>
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400">SMTP Host Server</label>
                  <input
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-muted px-3.5 text-sm font-semibold outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400">SMTP Port</label>
                  <input
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-muted px-3.5 text-sm font-semibold outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400">Default Sender Email</label>
                  <input
                    value={smtpEmail}
                    onChange={(e) => setSmtpEmail(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-muted px-3.5 text-sm font-semibold outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400">Sender Display Name</label>
                  <input
                    value={smtpName}
                    onChange={(e) => setSmtpName(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-muted px-3.5 text-sm font-semibold outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>
            </GsapReveal>

            {/* Outbound Payment integrations */}
            <GsapReveal direction="up" delay={0.1} className="rounded-3xl border border-border bg-card p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <h3 className="text-base font-black text-primary dark:text-cyan-200 flex items-center gap-2">
                <CreditCard className="size-5" />
                <span>Tuition Payment Gateway</span>
              </h3>

              <div className="flex items-center justify-between rounded-2xl bg-secondary/10 p-4 dark:bg-slate-800/40">
                <div className="space-y-1">
                  <p className="text-xs font-black text-primary dark:text-cyan-300">Gateway Operation Mode</p>
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
                        ? "bg-white text-primary shadow-sm dark:bg-primary dark:text-white"
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
                  <label className="text-xs font-black text-slate-400">API Key ID</label>
                  <input
                    value={rzpKey}
                    onChange={(e) => setRzpKey(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-muted px-3.5 text-sm font-semibold outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400">API Secret</label>
                  <div className="relative">
                    <input
                      type={showRzpSecret ? "text" : "password"}
                      value={rzpSecret}
                      onChange={(e) => setRzpSecret(e.target.value)}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-muted px-3.5 pr-10 text-sm font-semibold outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRzpSecret((v) => !v)}
                      aria-label={showRzpSecret ? "Hide API secret" : "Show API secret"}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary"
                    >
                      {showRzpSecret ? <EyeOff className="size-4.5" aria-hidden="true" /> : <Eye className="size-4.5" aria-hidden="true" />}
                    </button>
                  </div>
                </div>
              </div>
            </GsapReveal>
          </div>

          <div className="space-y-6 md:col-span-4">
            <GsapReveal direction="up" delay={0.2} className="rounded-3xl border border-border bg-card p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <h3 className="text-xs font-black text-primary dark:text-cyan-200 uppercase tracking-wider">Save variables</h3>
              <p className="text-xs font-bold text-slate-500 leading-normal">
                Committed settings become globally active across Admissions platforms, SMS dispatch networks, and student portals instantly.
              </p>
              <button
                type="submit"
                disabled={saveSetting.isPending}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs font-black text-white hover:bg-opacity-90 dark:bg-cyan-400 dark:text-primary disabled:opacity-50"
              >
                {saveSetting.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                <span>Commit System Parameters</span>
              </button>
            </GsapReveal>

            <GsapReveal direction="up" delay={0.25} className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/20 p-6 space-y-4 dark:border-emerald-900/50">
              <h3 className="text-xs font-black text-emerald-600 dark:text-emerald-450 uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="size-4" />
                <span>System Status</span>
              </h3>
              <p className="text-xs font-bold text-slate-500 leading-normal">
                System parameters are correctly linked to the remote database 'system_settings' table. Edits here will persist.
              </p>
            </GsapReveal>
          </div>
        </form>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <GsapReveal direction="up" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <h3 className="text-base font-black text-primary dark:text-cyan-200 flex items-center gap-2">
                <Send className="size-5" />
                <span>Broadcast New Notification</span>
              </h3>
              <form onSubmit={handleBroadcast} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400">Notification Title</label>
                  <input
                    required
                    value={notiTitle}
                    onChange={(e) => setNotiTitle(e.target.value)}
                    placeholder="e.g. System Maintenance"
                    className="w-full h-11 rounded-xl border border-slate-200 bg-muted px-3.5 text-sm font-semibold outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400">Message Body</label>
                  <textarea
                    required
                    rows={4}
                    value={notiMessage}
                    onChange={(e) => setNotiMessage(e.target.value)}
                    placeholder="Provide detailed information for the users..."
                    className="w-full rounded-xl border border-slate-200 bg-muted p-3.5 text-sm font-semibold outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400">Notification Type</label>
                  <select
                    value={notiType}
                    onChange={(e) => setNotiType(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-muted px-3.5 text-sm font-semibold outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="system">System Alert</option>
                    <option value="course">Course Update</option>
                    <option value="marketing">Marketing/Offers</option>
                  </select>
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={broadcastMutation.isPending}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs font-black text-white hover:bg-opacity-90 dark:bg-cyan-400 dark:text-primary disabled:opacity-50"
                  >
                    {broadcastMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    <span>Broadcast Now</span>
                  </button>
                </div>
              </form>
            </div>

            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-6 flex flex-col items-center justify-center text-center dark:border-slate-800 dark:bg-slate-900/20">
              <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4 dark:bg-slate-800">
                <Bell className="size-8" />
              </div>
              <h4 className="text-sm font-black text-primary dark:text-white">Recent Broadcasts</h4>
              <p className="text-xs font-bold text-slate-400 mt-2 max-w-sm">
                Notifications are pushed to user devices in real-time via Supabase realtime channels. Scheduled broadcasts are dispatched via pg_cron.
              </p>
            </div>
          </div>
        </GsapReveal>
      )}

      {/* Audit Logs Tab */}
      {activeTab === "audit" && (
        <GsapReveal direction="up" className="mt-6">
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-card p-12 text-center shadow-sm">
            <Shield className="size-10 text-muted-foreground" />
            <h3 className="text-base font-black text-foreground">Security & Audit</h3>
            <p className="max-w-sm text-xs font-bold text-muted-foreground">
              The full, searchable audit trail — every create/update/delete action across the platform, with actor and timestamp — lives on its own dedicated page rather than duplicated here.
            </p>
            <Link
              to="/admin/audit-logs"
              className="mt-2 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-black text-primary-foreground hover:bg-primary/90"
            >
              Open Audit Logs <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </GsapReveal>
      )}
    </div>
  );
}
