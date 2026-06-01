import { useState } from "react";
import {
  Search,
  Plus,
  MoreVertical,
  X,
  Phone,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  MapPin,
  Clock,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface LeadRecord {
  id: string;
  name: string;
  course: string;
  source: string;
  phone: string;
  priority: "High" | "Medium" | "Low";
  status: "new" | "contacted" | "scheduled" | "demo" | "enrolled";
  time: string;
}

const initialLeads: LeadRecord[] = [
  { id: "L-101", name: "Aarav Singhal", course: "Full Stack Web Development", source: "Facebook Ads", phone: "+91 98765 43210", priority: "High", status: "new", time: "10 mins ago" },
  { id: "L-102", name: "Priya Patel", course: "UI/UX Design Expert", source: "Google Search", phone: "+91 98765 11223", priority: "Medium", status: "new", time: "1 hour ago" },
  { id: "L-103", name: "Karan Johar", course: "Data Science & AI/ML", source: "Referral", phone: "+91 91234 56789", priority: "High", status: "contacted", time: "3 hours ago" },
  { id: "L-104", name: "Neha Deshmukh", course: "Cloud Computing (AWS)", source: "Direct Traffic", phone: "+91 99887 76655", priority: "Low", status: "contacted", time: "5 hours ago" },
  { id: "L-105", name: "Rohan Gupta", course: "Cyber Security Expert", source: "LinkedIn", phone: "+91 98888 77777", priority: "High", status: "scheduled", time: "1 day ago" },
  { id: "L-106", name: "Anjali Verma", course: "Digital Marketing Mastery", source: "Instagram Ads", phone: "+91 95555 44444", priority: "Medium", status: "demo", time: "2 days ago" },
  { id: "L-107", name: "Siddharth Malhotra", course: "Full Stack Web Development", source: "Referral", phone: "+91 93333 22222", priority: "High", status: "enrolled", time: "3 days ago" },
];

const columns = [
  { id: "new", label: "New Lead", color: "border-t-blue-500 bg-blue-50/20" },
  { id: "contacted", label: "Contacted", color: "border-t-amber-500 bg-amber-50/20" },
  { id: "scheduled", label: "Counselling Scheduled", color: "border-t-purple-500 bg-purple-50/20" },
  { id: "demo", label: "Demo Booked", color: "border-t-pink-500 bg-pink-50/20" },
  { id: "enrolled", label: "Enrolled", color: "border-t-emerald-500 bg-emerald-50/20" },
] as const;

export default function AdminCRMPage() {
  const [leads, setLeads] = useState<LeadRecord[]>(initialLeads);
  const [search, setSearch] = useState("");
  const [activeLead, setActiveLead] = useState<LeadRecord | null>(null);
  const [callLogOpen, setCallLogOpen] = useState(false);
  const [newLeadModalOpen, setNewLeadModalOpen] = useState(false);

  // New Lead state
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadCourse, setNewLeadCourse] = useState("Full Stack Web Development");
  const [newLeadPhone, setNewLeadPhone] = useState("");

  const handleCardClick = (lead: LeadRecord) => {
    setActiveLead(lead);
    setCallLogOpen(true);
  };

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    const newL: LeadRecord = {
      id: `L-${100 + leads.length + 1}`,
      name: newLeadName,
      course: newLeadCourse,
      source: "Manual Admin Input",
      phone: newLeadPhone,
      priority: "High",
      status: "new",
      time: "Just now",
    };
    setLeads([newL, ...leads]);
    setNewLeadModalOpen(false);
    setNewLeadName("");
    setNewLeadPhone("");
    toast.success(`Counselor lead generated for "${newL.name}".`);
  };

  const handleStatusChange = (newStatus: typeof columns[number]["id"]) => {
    if (!activeLead) return;
    setLeads(leads.map((l) => (l.id === activeLead.id ? { ...l, status: newStatus } : l)));
    setActiveLead({ ...activeLead, status: newStatus });
    toast.success(`Lead moved to "${newStatus.toUpperCase()}" stage.`);
  };

  const filteredLeads = leads.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()) || l.course.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#0F2B7A] dark:text-cyan-200">
            Counseling Lead pipeline
          </h1>
          <p className="mt-1 text-sm font-semibold text-[#64748B] dark:text-[#94A3B8]">
            Log counseling calls, track demo bookings, monitor conversions, and coordinate with the counselor team.
          </p>
        </div>
        <button
          onClick={() => setNewLeadModalOpen(true)}
          className="flex h-11 items-center gap-2 rounded-xl bg-[#0F2B7A] px-5 text-xs font-black text-white hover:bg-opacity-90 shadow-lg shadow-[#0f2b7a]/15 dark:bg-cyan-400 dark:text-[#0F2B7A]"
        >
          <Plus className="size-4" />
          <span>New Lead</span>
        </button>
      </div>

      {/* CRM Conversion Index Info Banner */}
      <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-[#0F2B7A] to-blue-900 p-6 text-white md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-black uppercase tracking-wider text-cyan-300">Funnel Conversion Rate</p>
          <h3 className="text-2xl font-black">18.2% Average Enrollment Rate</h3>
          <p className="text-xs font-medium text-white/70">Target benchmark: 15% across Indian EdTech segments.</p>
        </div>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-[10px] font-black uppercase text-white/50">Monthly Goal</p>
            <p className="text-lg font-black text-cyan-200">₹85,00,000</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-white/50">Current Gross</p>
            <p className="text-lg font-black text-emerald-400">₹56,40,000</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 rounded-2xl border border-[#DDE7F6] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#0F2B7A] dark:text-cyan-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lead or course query..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-10 pr-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-[#0F2B7A] dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="grid gap-4 overflow-x-auto pb-4 md:grid-cols-5 min-w-[1000px]">
        {columns.map((col) => {
          const colLeads = filteredLeads.filter((l) => l.status === col.id);
          return (
            <div
              key={col.id}
              className={[
                "flex flex-col rounded-3xl border-t-4 border border-[#DDE7F6] p-4.5 min-h-[480px] dark:border-slate-800",
                col.color,
              ].join(" ")}
            >
              {/* Column Header */}
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-black text-[#0F2B7A] dark:text-cyan-300 uppercase tracking-wide">
                  {col.label}
                </span>
                <span className="rounded-md bg-slate-200/60 px-2 py-0.5 text-[10px] font-black text-[#64748B] dark:bg-slate-800 dark:text-slate-400">
                  {colLeads.length}
                </span>
              </div>

              {/* Cards wrapper */}
              <div className="flex-1 space-y-3">
                {colLeads.map((lead) => (
                  <motion.div
                    key={lead.id}
                    layoutId={lead.id}
                    onClick={() => handleCardClick(lead)}
                    whileHover={{ y: -3, scale: 1.01 }}
                    className="cursor-pointer rounded-2xl border border-slate-250 bg-white p-4 shadow-[0_4px_12px_rgba(15,43,122,0.02)] dark:border-slate-850 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-slate-450">{lead.id}</span>
                      <span
                        className={[
                          "rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider",
                          lead.priority === "High"
                            ? "bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-450"
                            : lead.priority === "Medium"
                            ? "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-450"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                        ].join(" ")}
                      >
                        {lead.priority}
                      </span>
                    </div>

                    <h4 className="mt-3 text-xs font-black text-[#0F2B7A] dark:text-white truncate">
                      {lead.name}
                    </h4>
                    <p className="mt-1 text-[10px] font-bold text-slate-450 truncate">
                      {lead.course}
                    </p>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-2.5 dark:border-slate-850">
                      <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                        <Clock className="size-3" />
                        {lead.time}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-[#64748B] dark:bg-slate-800 dark:text-slate-400 truncate max-w-16">
                        {lead.source}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Counseling Call Log Drawer */}
      <AnimatePresence>
        {callLogOpen && activeLead && (
          <div className="fixed inset-0 z-50 flex justify-end bg-[#020617]/50 backdrop-blur-xs">
            <button className="absolute inset-0 cursor-default" onClick={() => setCallLogOpen(false)} />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-[#DDE7F6] bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-850">
                <div>
                  <h3 className="text-lg font-black text-[#0F2B7A] dark:text-white">Counselor call log</h3>
                  <p className="text-xs font-semibold text-slate-400">{activeLead.name} • {activeLead.id}</p>
                </div>
                <button onClick={() => setCallLogOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850">
                  <X className="size-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Details */}
                <div className="rounded-2xl border border-slate-100 p-4 space-y-3 dark:border-slate-850">
                  <p className="text-xs font-black text-[#0F2B7A] dark:text-cyan-300 uppercase tracking-wider">Candidate info</p>
                  <p className="text-sm font-black text-slate-700 dark:text-white">{activeLead.name}</p>
                  <p className="text-xs font-bold text-slate-500">Interested in: <span className="font-black text-[#0F2B7A] dark:text-cyan-400">{activeLead.course}</span></p>
                  <div className="flex items-center gap-2 text-xs font-black text-slate-500">
                    <Phone className="size-4 text-[#0F2B7A] dark:text-cyan-300" />
                    <span>{activeLead.phone}</span>
                  </div>
                </div>

                {/* Status selector */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-350">Pipeline Funnel Stage</label>
                  <div className="grid gap-2 grid-cols-2">
                    {columns.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleStatusChange(c.id)}
                        className={[
                          "h-10 rounded-xl border text-xs font-black transition-all",
                          activeLead.status === c.id
                            ? "bg-[#0F2B7A] text-white border-transparent"
                            : "border-slate-200 bg-[#F8FAFC] text-slate-600 hover:bg-slate-100 dark:border-slate-850 dark:bg-slate-900 dark:text-slate-350",
                        ].join(" ")}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Call Notes input */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-350">Counselling Call Notes</label>
                  <textarea
                    rows={4}
                    defaultValue="Called candidate today. Very interested in Full Stack Dev track. Has basic Java coding background. Scheduled mock demo review session for Wednesday."
                    className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] p-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setCallLogOpen(false)}
                  className="h-11 rounded-xl px-5 text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setCallLogOpen(false);
                    toast.success("Counseling notes committed.");
                  }}
                  className="h-11 rounded-xl bg-[#0F2B7A] px-6 text-xs font-black text-white hover:bg-opacity-90 dark:bg-cyan-400 dark:text-[#0F2B7A]"
                >
                  Commit Log
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Lead Modal */}
      <AnimatePresence>
        {newLeadModalOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-[#020617]/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border border-[#DDE7F6] bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-850">
                <h3 className="text-base font-black text-[#0F2B7A] dark:text-white">Generate Counseling Lead</h3>
                <button onClick={() => setNewLeadModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleCreateLead} className="mt-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-350">Student Full Name</label>
                  <input
                    required
                    value={newLeadName}
                    onChange={(e) => setNewLeadName(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-350">Primary Phone Number</label>
                  <input
                    required
                    value={newLeadPhone}
                    onChange={(e) => setNewLeadPhone(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-350">Course Focus Area</label>
                  <select
                    value={newLeadCourse}
                    onChange={(e) => setNewLeadCourse(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  >
                    <option>Full Stack Web Development</option>
                    <option>Data Science & AI/ML</option>
                    <option>UI/UX Design Expert</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-5">
                  <button type="button" onClick={() => setNewLeadModalOpen(false)} className="h-11 rounded-xl px-5 text-xs font-black text-slate-500">Cancel</button>
                  <button type="submit" className="h-11 rounded-xl bg-[#0F2B7A] px-6 text-xs font-black text-white dark:bg-cyan-400 dark:text-[#0F2B7A]">Create Lead Card</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
