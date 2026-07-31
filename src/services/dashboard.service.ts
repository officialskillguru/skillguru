import { getExtendedSupabaseClient } from "./_shared";


export type DashboardMetrics = {
  totalCourses: number;
  totalMentors: number;
  totalStudents: number;
  totalLeads: number;
  totalAdmins: number;
  successStories: number;
  totalOrders: number;
  totalRevenue: number;
  certificatesIssued: number;
};

export type DashboardChartPoint = {
  name: string;
  enrollments: number;
  leads: number;
  revenue: number;
};

export interface IDashboardService {
  getMetrics(): Promise<DashboardMetrics>;
  getRecentActivity(): Promise<Record<string, unknown>[]>;
  getChartData(): Promise<DashboardChartPoint[]>;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = getExtendedSupabaseClient();
  
  const [
    { count: coursesCount },
    { count: mentorsCount },
    { count: studentsCount },
    { count: adminsCount },
    { count: successCount },
    { count: leadsCount },
    { count: ordersCount },
    { count: certificatesCount },
    { data: payments },
  ] = await Promise.all([
    supabase.from('courses').select('id', { count: 'exact', head: true }),
    supabase.from('user_roles').select('user_id', { count: 'exact', head: true }).eq('role_id', (await supabase.from('roles').select('id').eq('code', 'mentor').single()).data?.id || ''),
    supabase.from('user_roles').select('user_id', { count: 'exact', head: true }).eq('role_id', (await supabase.from('roles').select('id').eq('code', 'student').single()).data?.id || ''),
    supabase.from('user_roles').select('user_id', { count: 'exact', head: true }).eq('role_id', (await supabase.from('roles').select('id').eq('code', 'admin').single()).data?.id || ''),
    supabase.from('success_stories').select('id', { count: 'exact', head: true }),
    supabase.from('leads').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('certificates').select('id', { count: 'exact', head: true }),
    supabase.from('payments').select('amount').eq('status', 'completed'),
  ]);

  const totalRevenue = (payments ?? []).reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0);

  return {
    totalCourses: coursesCount ?? 0,
    totalMentors: mentorsCount ?? 0,
    totalStudents: studentsCount ?? 0,
    totalLeads: leadsCount ?? 0,
    totalAdmins: adminsCount ?? 0,
    successStories: successCount ?? 0,
    totalOrders: ordersCount ?? 0,
    totalRevenue,
    certificatesIssued: certificatesCount ?? 0,
  };
}

export async function getDashboardRecent() {
  const supabase = getExtendedSupabaseClient();
  
  // Try to get audit logs, if it fails (not migrated yet), fallback to empty
  const { data: logs, error: logsError } = await supabase
    .from('audit_logs')
    .select('*, profiles!audit_logs_actor_id_fkey(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(10);

  if (logsError || !logs) {
    return [];
  }

  return logs.map((log) => ({
    id: log.id,
    type: log.entity_type,
    message: `${log.profiles?.full_name || log.profiles?.email || 'System'} ${log.action} ${log.entity_type}`,
    time: new Date(log.created_at).toLocaleTimeString(),
    tag: log.entity_type.toUpperCase(),
  }));
}

export async function getDashboardChartData(): Promise<DashboardChartPoint[]> {
  const supabase = getExtendedSupabaseClient();

  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1).toISOString();

  const [{ data: enrollments }, { data: payments }, { data: leads }] = await Promise.all([
    supabase.from('enrollments').select('created_at').gte('created_at', yearStart),
    supabase.from('payments').select('amount, created_at').eq('status', 'completed').gte('created_at', yearStart),
    supabase.from('leads').select('created_at').is('deleted_at', null).gte('created_at', yearStart),
  ]);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const baseData = months.map(m => ({ name: m, enrollments: 0, leads: 0, revenue: 0 }));

  (enrollments ?? []).forEach((enr: { created_at: string }) => {
    const m = new Date(enr.created_at).getMonth();
    if (baseData[m]) baseData[m].enrollments += 1;
  });

  (payments ?? []).forEach((p: { amount: number; created_at: string }) => {
    const m = new Date(p.created_at).getMonth();
    if (baseData[m]) baseData[m].revenue += Number(p.amount);
  });

  (leads ?? []).forEach((l: { created_at: string }) => {
    const m = new Date(l.created_at).getMonth();
    if (baseData[m]) baseData[m].leads += 1;
  });

  return baseData.map(b => ({ ...b, revenue: b.revenue / 100000 })); // Lakhs
}
