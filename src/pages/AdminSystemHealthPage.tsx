import { useQuery } from "@tanstack/react-query";
import { REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, Database, Users, BookOpen, Ticket, Bell, Globe } from "lucide-react";
import { getExtendedSupabaseClient } from "@/services/_shared";
import { GsapReveal } from "@/components/motion/gsap-reveal";
import { Badge } from "@/components/ui/badge";

async function checkRealtimeHealth(): Promise<boolean> {
  const supabase = getExtendedSupabaseClient();
  return new Promise((resolve) => {
    let settled = false;
    const channel = supabase.channel(`health-check-${Date.now()}`);
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      void supabase.removeChannel(channel);
      resolve(false);
    }, 5000);

    channel.subscribe((status) => {
      if (settled) return;
      if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
        settled = true;
        clearTimeout(timeout);
        void supabase.removeChannel(channel);
        resolve(true);
      } else if (
        status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR ||
        status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT ||
        status === REALTIME_SUBSCRIBE_STATES.CLOSED
      ) {
        settled = true;
        clearTimeout(timeout);
        void supabase.removeChannel(channel);
        resolve(false);
      }
    });
  });
}

async function fetchSystemHealth() {
  const supabase = getExtendedSupabaseClient();

  const [
    { count: totalUsers, error: usersErr },
    { count: totalCourses },
    { count: activeEnrollments },
    { count: openTickets },
    { count: unreadNotifs },
    { count: pendingOrders },
    { count: unprocessedWebhooks },
    { error: authErr },
    { error: storageErr },
    realtimeOk,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("courses").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("is_read", false),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "created"),
    supabase.from("webhooks").select("id", { count: "exact", head: true }).eq("processed", false),
    supabase.auth.getSession(),
    supabase.storage.listBuckets(),
    checkRealtimeHealth(),
  ]);

  const dbConnected = !usersErr;

  return {
    dbConnected,
    authOk: !authErr,
    storageOk: !storageErr,
    realtimeOk,
    totalUsers: totalUsers ?? 0,
    totalCourses: totalCourses ?? 0,
    activeEnrollments: activeEnrollments ?? 0,
    openTickets: openTickets ?? 0,
    unreadNotifs: unreadNotifs ?? 0,
    pendingOrders: pendingOrders ?? 0,
    unprocessedWebhooks: unprocessedWebhooks ?? 0,
    checkedAt: new Date().toISOString(),
  };
}

function StatusBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <Badge variant="success" className="gap-1.5">
      <CheckCircle className="size-3" aria-hidden="true" /> Healthy
    </Badge>
  ) : (
    <Badge variant="destructive" className="gap-1.5">
      <XCircle className="size-3" aria-hidden="true" /> Issue
    </Badge>
  );
}

export default function AdminSystemHealthPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["system-health"],
    queryFn: fetchSystemHealth,
    refetchInterval: 60_000, // auto-refresh every 60s
  });

  const metrics = data ? [
    { label: "Total Users",           value: data.totalUsers,           icon: Users,    ok: true },
    { label: "Published Courses",     value: data.totalCourses,         icon: BookOpen, ok: true },
    { label: "Active Enrollments",    value: data.activeEnrollments,    icon: BookOpen, ok: true },
    { label: "Open Tickets",          value: data.openTickets,          icon: Ticket,   ok: data.openTickets < 10 },
    { label: "Unread Notifications",  value: data.unreadNotifs,         icon: Bell,     ok: data.unreadNotifs < 100 },
    { label: "Pending Orders",        value: data.pendingOrders,        icon: Globe,    ok: data.pendingOrders < 5 },
    { label: "Unprocessed Webhooks",  value: data.unprocessedWebhooks,  icon: AlertTriangle, ok: data.unprocessedWebhooks === 0 },
  ] : [];

  return (
    <div className="space-y-6 pb-12">
      <GsapReveal direction="up" className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary dark:text-cyan-200">System Health</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform status and operational metrics.
            {data && <span className="ml-2 text-muted-foreground/60">Last checked: {new Date(data.checkedAt).toLocaleTimeString()}</span>}
          </p>
        </div>
        <button
          onClick={() => void refetch()}
          disabled={isFetching}
          className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      </GsapReveal>

      {/* Database Status */}
      <GsapReveal direction="up" className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3">
              <Database className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-black text-foreground">Supabase Database</p>
              <p className="text-xs text-muted-foreground">PostgreSQL connection via Supabase client</p>
            </div>
          </div>
          {isLoading ? (
            <div className="h-8 w-20 animate-pulse rounded-full bg-muted" />
          ) : (
            <StatusBadge ok={data?.dbConnected ?? false} />
          )}
        </div>
      </GsapReveal>

      {/* Metrics Grid */}
      <GsapReveal direction="up" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
            ))
          : metrics.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.label}
                  className={`rounded-2xl border p-5 shadow-sm ${
                    m.ok
                      ? "border-border bg-card"
                      : "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <Icon className={`size-5 ${m.ok ? "text-primary" : "text-amber-500"}`} />
                    {!m.ok && <AlertTriangle className="size-4 text-amber-500" />}
                  </div>
                  <p className={`mt-3 text-2xl font-black ${m.ok ? "text-foreground" : "text-amber-700 dark:text-amber-400"}`}>
                    {m.value.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">{m.label}</p>
                </div>
              );
            })}
      </GsapReveal>

      {/* Services Status */}
      <GsapReveal direction="up" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-base font-black text-foreground">External Services</h3>
        <p className="mb-4 text-xs font-semibold text-muted-foreground">
          The first three rows are live-checked on every refresh. The last two are informational — this page doesn't ping them, so they're labeled by configuration state, not claimed as "Healthy."
        </p>
        <div className="space-y-3">
          {(isLoading
            ? [
                { name: "Supabase Auth", desc: "Authentication & session management", checked: true, ok: undefined },
                { name: "Supabase Storage", desc: "File storage for media & documents", checked: true, ok: undefined },
                { name: "Supabase Realtime", desc: "Live chat & notification subscriptions", checked: true, ok: undefined },
              ]
            : [
                { name: "Supabase Auth", desc: "Authentication & session management", checked: true, ok: data?.authOk ?? false },
                { name: "Supabase Storage", desc: "File storage for media & documents", checked: true, ok: data?.storageOk ?? false },
                { name: "Supabase Realtime", desc: "Live chat & notification subscriptions", checked: true, ok: data?.realtimeOk ?? false },
              ]
          ).map(service => (
            <div key={service.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="font-semibold text-sm text-foreground">{service.name}</p>
                <p className="text-xs text-muted-foreground">{service.desc}</p>
              </div>
              {service.ok === undefined ? (
                <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
              ) : (
                <StatusBadge ok={service.ok} />
              )}
            </div>
          ))}
          <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div>
              <p className="font-semibold text-sm text-foreground">Payment Provider</p>
              <p className="text-xs text-muted-foreground">MockPaymentProvider active — Razorpay credentials not yet configured (Phase 1.11)</p>
            </div>
            <Badge variant="info">Mock Mode</Badge>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div>
              <p className="font-semibold text-sm text-foreground">Edge Functions</p>
              <p className="text-xs text-muted-foreground">Payment, enrollment, and mentor-provisioning functions deployed</p>
            </div>
            <Badge variant="info">Deployed</Badge>
          </div>
        </div>
      </GsapReveal>
    </div>
  );
}
