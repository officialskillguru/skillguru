import { useState } from "react";
import {
  Shield,
  Users,
  Lock,
  MoreVertical,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { GsapReveal } from "@/components/motion/gsap-reveal";

interface Operator {
  name: string;
  role: "Super Admin" | "Counsellor" | "Placement Officer" | "Content Manager" | "Mentor";
  email: string;
  status: "Active" | "Inactive";
}

const initialOperators: Operator[] = [
  { name: "Rahul Deshmukh", role: "Super Admin", email: "rahul.operations@skillguru.com", status: "Active" },
  { name: "Neha Verma", role: "Counsellor", email: "neha.counselling@skillguru.com", status: "Active" },
  { name: "Amit Singh", role: "Placement Officer", email: "amit.placements@skillguru.com", status: "Active" },
  { name: "Pooja Rao", role: "Content Manager", email: "pooja.cms@skillguru.com", status: "Active" },
];

interface AuditLog {
  timestamp: string;
  operator: string;
  action: string;
  ip: string;
}

const mockAuditLogs: AuditLog[] = [
  { timestamp: "2026-06-01 16:04:12", operator: "Rahul Deshmukh", action: "Published new academic course: AI-Powered Analytics", ip: "192.168.1.45" },
  { timestamp: "2026-06-01 15:30:45", operator: "Neha Verma", action: "Updated lead pipeline card L-103 to Counselling Scheduled", ip: "192.168.1.88" },
  { timestamp: "2026-06-01 14:15:22", operator: "Amit Singh", action: "Modified success story LPA package for Priya Sharma at Deloitte", ip: "192.168.1.12" },
];

export default function AdminRolePage() {
  const [operators] = useState<Operator[]>(initialOperators);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"roles" | "operators" | "audit">("roles");
  
  // Custom permissions state representation
  const [permissions, setPermissions] = useState({
    "Super Admin": { read: true, write: true, delete: true, publish: true },
    "Counsellor": { read: true, write: true, delete: false, publish: false },
    "Placement Officer": { read: true, write: true, delete: false, publish: true },
    "Content Manager": { read: true, write: true, delete: true, publish: true },
    "Mentor": { read: true, write: false, delete: false, publish: false },
  });

  const togglePermission = (role: keyof typeof permissions, type: "read" | "write" | "delete" | "publish") => {
    const updated = {
      ...permissions,
      [role]: {
        ...permissions[role],
        [type]: !permissions[role][type],
      },
    };
    setPermissions(updated);
    toast.success(`Updated ${role} operational ${type} permission to ${!permissions[role][type] ? "Allowed" : "Restricted"}.`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <GsapReveal direction="up" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#111E79] dark:text-cyan-200">
            System Security & Operators Registry
          </h1>
          <p className="mt-1 text-sm font-semibold text-[#64748B] dark:text-[#94A3B8]">
            Grant functional dashboard scopes, add corporate operations users, allocate security keys and review administrative audit logs.
          </p>
        </div>
      </GsapReveal>

      {/* Tabs */}
      <div className="flex border-b border-[#DDE7F6] dark:border-slate-800">
        {[
          { id: "roles", label: "Permissions Matrix", icon: Shield },
          { id: "operators", label: "Operations Users", count: operators.length, icon: Users },
          { id: "audit", label: "System Audit Logs", count: mockAuditLogs.length, icon: Lock }
        ].map((tb) => {
          const TabIcon = tb.icon;
          return (
            <button
              key={tb.id}
              onClick={() => setActiveSettingsTab(tb.id as typeof activeSettingsTab)}
              className={[
                "py-3.5 px-5 text-xs font-black border-b-2 transition-all flex items-center gap-2",
                activeSettingsTab === tb.id
                  ? "border-[#111E79] text-[#111E79] dark:border-cyan-400 dark:text-cyan-300"
                  : "border-transparent text-slate-450 hover:text-[#111E79] dark:hover:text-white",
              ].join(" ")}
            >
              <TabIcon className="size-4" />
              <span>{tb.label}</span>
              {tb.count !== undefined && (
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] dark:bg-slate-800">{tb.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Permissions Matrix Tab */}
      {activeSettingsTab === "roles" && (
        <GsapReveal direction="up" className="rounded-3xl border border-[#DDE7F6] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DDE7F6] bg-[#EEF3FA]/40 text-[10px] font-black uppercase tracking-wider text-[#64748B] dark:border-slate-850 dark:bg-slate-900/50">
                  <th className="px-6 py-4">Dashboard Role</th>
                  <th className="px-6 py-4 text-center">Read Scopes</th>
                  <th className="px-6 py-4 text-center">Write Scopes</th>
                  <th className="px-6 py-4 text-center">Delete Scopes</th>
                  <th className="px-6 py-4 text-center">Publish Syllabus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE7F6] dark:divide-slate-850">
                {(Object.keys(permissions) as Array<keyof typeof permissions>).map((role) => (
                  <tr key={role} className="text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                    <td className="px-6 py-5 font-black text-[#111E79] dark:text-white">{role}</td>
                    <td className="px-6 py-5 text-center">
                      <input
                        type="checkbox"
                        checked={permissions[role].read}
                        onChange={() => togglePermission(role, "read")}
                        className="rounded border-slate-200 text-[#111E79]"
                      />
                    </td>
                    <td className="px-6 py-5 text-center">
                      <input
                        type="checkbox"
                        checked={permissions[role].write}
                        onChange={() => togglePermission(role, "write")}
                        className="rounded border-slate-200 text-[#111E79]"
                      />
                    </td>
                    <td className="px-6 py-5 text-center">
                      <input
                        type="checkbox"
                        checked={permissions[role].delete}
                        disabled={role === "Super Admin"}
                        onChange={() => togglePermission(role, "delete")}
                        className="rounded border-slate-200 text-[#111E79] disabled:opacity-50"
                      />
                    </td>
                    <td className="px-6 py-5 text-center">
                      <input
                        type="checkbox"
                        checked={permissions[role].publish}
                        disabled={role === "Super Admin"}
                        onChange={() => togglePermission(role, "publish")}
                        className="rounded border-slate-200 text-[#111E79] disabled:opacity-50"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GsapReveal>
      )}

      {/* Operators Tab */}
      {activeSettingsTab === "operators" && (
        <GsapReveal direction="up" className="rounded-3xl border border-[#DDE7F6] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DDE7F6] bg-[#EEF3FA]/40 text-[10px] font-black uppercase tracking-wider text-[#64748B] dark:border-slate-850 dark:bg-slate-900/50">
                  <th className="px-6 py-4">Operator Full Name</th>
                  <th className="px-6 py-4">Department Scope</th>
                  <th className="px-6 py-4">Operator Email</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE7F6] dark:divide-slate-850">
                {operators.map((op) => (
                  <tr key={op.name} className="text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                    <td className="px-6 py-4.5 font-black text-[#111E79] dark:text-white">{op.name}</td>
                    <td className="px-6 py-4.5">
                      <span className="rounded bg-slate-100 px-2.5 py-1 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-350">
                        {op.role}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-slate-450 font-semibold">{op.email}</td>
                    <td className="px-6 py-4.5">
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
                        {op.status}
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

      {/* Audit Logs Tab */}
      {activeSettingsTab === "audit" && (
        <GsapReveal direction="up" className="rounded-3xl border border-[#DDE7F6] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DDE7F6] bg-[#EEF3FA]/40 text-[10px] font-black uppercase tracking-wider text-[#64748B] dark:border-slate-850 dark:bg-slate-900/50">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Operator Name</th>
                  <th className="px-6 py-4">Action Summary Description</th>
                  <th className="px-6 py-4">Client IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE7F6] dark:divide-slate-850 text-xs">
                {mockAuditLogs.map((log) => (
                  <tr key={log.timestamp} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                    <td className="px-6 py-4.5 font-bold text-slate-450 flex items-center gap-2">
                      <Clock className="size-3.5" />
                      <span>{log.timestamp}</span>
                    </td>
                    <td className="px-6 py-4.5 font-black text-[#111E79] dark:text-white">{log.operator}</td>
                    <td className="px-6 py-4.5 font-semibold text-slate-600 dark:text-slate-350">{log.action}</td>
                    <td className="px-6 py-4.5 font-mono text-slate-450 font-bold">{log.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GsapReveal>
      )}
    </div>
  );
}
