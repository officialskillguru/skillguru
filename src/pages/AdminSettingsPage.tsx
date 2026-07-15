import { useState, useEffect } from "react";
import {
  Mail,
  CreditCard,
  Save,
  Eye,
  AlertCircle,
  Bell,
  Shield,
  Send,
  Loader2,
  Settings as SettingsIcon,
  Search,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { GsapReveal } from "@/components/motion/gsap-reveal";
import { useAdminCMSSetting, useSaveAdminCMSSetting } from "@/hooks/admin/useAdminCMS";
import { useAuditLogs, useBroadcastNotification } from "@/hooks/admin/useAdminSystem";

type StubAuditLog = {
  id: string;
  created_at: string;
  action: string;
  table_name: string;
  record_id: string;
  user_id: string;
  ip: string;
};

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
    
    broadcastMutation.mutate({ title: notiTitle, message: notiMessage, type: notiType }, {
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

  // Audit Logs
  const [auditPage, setAuditPage] = useState(1);
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const { data: auditData, isLoading: loadingAudit } = useAuditLogs({ page: auditPage, pageSize: 20, action: auditActionFilter || undefined });

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
                      type="password"
                      value={rzpSecret}
                      onChange={(e) => setRzpSecret(e.target.value)}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-muted px-3.5 pr-10 text-sm font-semibold outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                    <button type="button" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 opacity-60">
                      <Eye className="size-4.5" />
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
        <GsapReveal direction="up" className="mt-6 space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-primary dark:text-cyan-300" />
              <input
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                placeholder="Filter by action (e.g. UPDATE, DELETE)..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-muted pl-10 pr-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-slate-100/40 text-[10px] font-black uppercase tracking-wider text-muted-foreground dark:border-slate-850 dark:bg-slate-900/50">
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Table</th>
                    <th className="px-6 py-4">Record ID</th>
                    <th className="px-6 py-4">User / IP</th>
                    <th className="px-6 py-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDE7F6] dark:divide-slate-850">
                  {loadingAudit ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm font-semibold text-slate-400">
                        <Loader2 className="size-6 animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : ((auditData as unknown as { data: StubAuditLog[] })?.data || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm font-semibold text-slate-400">
                        No audit logs matched the criteria.
                      </td>
                    </tr>
                  ) : (
                    ((auditData as unknown as { data: StubAuditLog[] })?.data || []).map((log: StubAuditLog) => (
                      <tr key={log.id} className="text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                        <td className="px-6 py-4.5 font-bold text-slate-500 whitespace-nowrap">
                          {new Date(log.created_at || "").toLocaleString()}
                        </td>
                        <td className="px-6 py-4.5">
                          <span className={`inline-flex rounded-md px-2 py-0.5 text-[9px] font-black uppercase ${
                            log.action === "DELETE" ? "bg-rose-50 text-rose-600 dark:bg-rose-950/20" : 
                            log.action === "UPDATE" ? "bg-amber-50 text-amber-600 dark:bg-amber-950/20" :
                            "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20"
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4.5 font-bold text-primary dark:text-cyan-300">
                          {log.table_name}
                        </td>
                        <td className="px-6 py-4.5 text-slate-500 font-mono text-[10px]">
                          {log.record_id}
                        </td>
                        <td className="px-6 py-4.5 text-slate-450">
                          {log.user_id ? log.user_id.split("-")[0] : "System"} <br/>
                          <span className="text-[9px] text-slate-400">{log.ip || "Unknown IP"}</span>
                        </td>
                        <td className="px-6 py-4.5 text-right">
                          <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                            <Filter className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-6 py-4 flex items-center justify-between dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-500">
                Showing page {auditPage} of {(auditData as unknown as { totalPages: number })?.totalPages || 1}
              </p>
              <div className="flex gap-2">
                <button disabled={auditPage === 1} onClick={() => setAuditPage(p => p - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Prev</button>
                <button disabled={auditPage >= (((auditData as unknown as { totalPages: number })?.totalPages) || 1)} onClick={() => setAuditPage(p => p + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Next</button>
              </div>
            </div>
          </div>
        </GsapReveal>
      )}
    </div>
  );
}
