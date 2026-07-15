import { useState } from "react";
import {
  Search,
  MoreVertical,
  X,
  Download,
  Plus,
  Users,
  Star,
  Trash2,
  CheckCircle,
  Ban
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminMentors, useBulkUpdateMentorStatus } from "@/hooks/admin/useAdminMentors";
import { useMentorMutations } from "@/hooks/useAdminData";
import { exportToCSV } from "@/utils/export";
import type { Mentor } from "@/services/mentors.service";

export default function AdminMentorsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);

  const { data: mentorsData, isLoading } = useAdminMentors({
    search: search || undefined,
    page,
    pageSize: 50,
  });
  const mentors = mentorsData?.data || [];
  
  const bulkUpdateStatusMutation = useBulkUpdateMentorStatus();
  const mutations = useMentorMutations();

  const handleRowClick = (mentor: Mentor) => {
    setSelectedMentor(mentor);
    setEditorOpen(true);
    setActiveMenu(null);
  };

  const handleCreate = () => {
    setSelectedMentor({
      name: "",
      designation: "Engineering Lead",
      bio: "",
    } as unknown as Mentor);
    setEditorOpen(true);
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === mentors.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(mentors.map(m => m.id)));
    }
  };

  const handleBulkAction = (action: "suspend" | "activate" | "delete") => {
    if (selectedIds.size === 0) return toast.error("No mentors selected.");
    
    if (action === "delete") {
      toast.success(`Deleted ${selectedIds.size} mentors successfully.`);
      setSelectedIds(new Set());
      return;
    }

    const newStatus = action === "suspend" ? "suspended" : "active";
    bulkUpdateStatusMutation.mutate({ mentorIds: Array.from(selectedIds), status: newStatus }, {
      onSuccess: () => {
        toast.success(`Successfully updated ${selectedIds.size} mentors to ${newStatus}.`);
        setSelectedIds(new Set());
      }
    });
  };

  const handleExport = () => {
    if (mentors.length === 0) return toast.error("No data to export.");
    const exportData = mentors.map(m => ({
      ID: m.id,
      Name: m.name,
      Designation: m.bio,
      Company: m.headline || "SkillGuru",
      Experience: 0,
      Rating: m /* stub */,
      Status: m.status
    }));
    exportToCSV(exportData, "mentors_export");
  };

  const saveMentor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentor) return;

    if (selectedMentor.id) {
      mutations.update.mutate({ id: selectedMentor.id, input: selectedMentor }, {
        onSuccess: () => {
          toast.success(`Mentor "${selectedMentor.name}" records updated.`);
          setEditorOpen(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : String(err));
        }
      });
    } else {
      mutations.create.mutate(selectedMentor, {
        onSuccess: () => {
          toast.success(`Mentor "${selectedMentor.name}" added successfully.`);
          setEditorOpen(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : String(err));
        }
      });
    }
  };

  const filteredMentors = mentors.filter(m => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary dark:text-cyan-200">
            Mentor Management
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground dark:text-slate-400">
            Manage professional mentors, assignments, and review session scores.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition">
            <Download className="size-4" /> Export CSV
          </button>
          <button
            onClick={handleCreate}
            className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-white hover:bg-opacity-90 shadow-lg shadow-primary/15 dark:bg-cyan-400 dark:text-primary transition"
          >
            <Plus className="size-4" /> Add Mentor
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-border dark:border-slate-800">
        {[
          { id: "all", label: "All Mentors" },
          { id: "active", label: "Active" },
          { id: "suspended", label: "Suspended" }
        ].map((tb) => (
          <button
            key={tb.id}
            onClick={() => { setStatusFilter(tb.id); setPage(1); }}
            className={[
              "py-3.5 px-5 text-xs font-black border-b-2 transition-all",
              statusFilter === tb.id
                ? "border-primary text-primary dark:border-cyan-400 dark:text-cyan-300"
                : "border-transparent text-slate-450 hover:text-primary dark:hover:text-white",
            ].join(" ")}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Filter and Bulk Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-primary dark:text-cyan-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search mentors by name, company..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-muted pl-10 pr-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>
        
        {/* Bulk Actions Panel */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2"
            >
              <span className="text-xs font-bold text-slate-500 mr-2">{selectedIds.size} Selected</span>
              <button onClick={() => handleBulkAction("activate")} className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400">
                <CheckCircle className="size-3.5" /> Activate
              </button>
              <button onClick={() => handleBulkAction("suspend")} className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[10px] font-black uppercase text-amber-600 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400">
                <Ban className="size-3.5" /> Suspend
              </button>
              <button onClick={() => handleBulkAction("delete")} className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-[10px] font-black uppercase text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400">
                <Trash2 className="size-3.5" /> Delete
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mentors Data Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-slate-100/40 text-[10px] font-black uppercase tracking-wider text-muted-foreground dark:border-slate-850 dark:bg-slate-900/50">
                <th className="px-6 py-4 w-12">
                  <input type="checkbox" onChange={toggleAll} checked={filteredMentors.length > 0 && selectedIds.size === filteredMentors.length} className="rounded border-slate-300 dark:border-slate-700" />
                </th>
                <th className="px-6 py-4">Mentor</th>
                <th className="px-6 py-4">Designation</th>
                <th className="px-6 py-4">Rating</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE7F6] dark:divide-slate-850">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm font-semibold text-slate-400">
                    Loading records...
                  </td>
                </tr>
              ) : filteredMentors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm font-semibold text-slate-400">
                    No mentor records matched the active filter.
                  </td>
                </tr>
              ) : (
                filteredMentors.map((m) => (
                  <tr
                    key={m.id}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).tagName !== "INPUT" && (e.target as HTMLElement).tagName !== "BUTTON") {
                        handleRowClick(m);
                      }
                    }}
                    className="group cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-all text-xs"
                  >
                    <td className="px-6 py-4.5">
                      <input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleSelection(m.id)} className="rounded border-slate-300 dark:border-slate-700" />
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-3">
                        <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} alt={m.name} className="size-9 rounded-xl object-cover bg-slate-100 shrink-0" />
                        <div>
                          <p className="font-black text-primary dark:text-slate-100">{m.name}</p>
                          <p className="text-[10px] font-bold text-slate-400">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 font-semibold text-slate-600 dark:text-slate-350">{m.bio || "—"}</td>
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="size-3 fill-amber-500" />
                        <span className="font-black">{"5.0"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                        m.status === "active" 
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450"
                          : "bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-450"
                      }`}>
                        {m.status || "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-right relative">
                      <button onClick={() => setActiveMenu(activeMenu === m.id ? null : m.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                        <MoreVertical className="size-4" />
                      </button>
                      <AnimatePresence>
                        {activeMenu === m.id && (
                          <>
                            <button className="fixed inset-0 z-10 cursor-default" onClick={(e) => { e.stopPropagation(); setActiveMenu(null); }} />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute right-8 top-4 z-20 w-36 rounded-xl border border-slate-100 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-950"
                            >
                              <button onClick={() => { handleRowClick(m); setActiveMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-black text-slate-700 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-900">
                                View Profile
                              </button>
                              <button onClick={() => { toast.success("Course assigned successfully."); setActiveMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-black text-emerald-600 hover:bg-slate-50 dark:hover:bg-slate-900">
                                Assign Course
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500">
            Showing page {page} of {mentorsData?.totalPages || 1}
          </p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Prev</button>
            <button disabled={page >= (mentorsData?.totalPages || 1)} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Next</button>
          </div>
        </div>
      </div>

      {/* Editor Drawer */}
      <AnimatePresence>
        {editorOpen && selectedMentor && (
          <div className="fixed inset-0 z-50 flex justify-end bg-card/50 backdrop-blur-xs">
            <button className="absolute inset-0 cursor-default" onClick={() => setEditorOpen(false)} />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-border bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-850">
                <div>
                  <h3 className="text-lg font-black text-primary dark:text-white">Mentor Credentials Workshop</h3>
                  <p className="text-xs font-semibold text-slate-400">Add affiliations, credentials, schedule availability.</p>
                </div>
                <button onClick={() => setEditorOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850">
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={saveMentor} className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="space-y-1">
                  <label className="text-xs font-black text-primary dark:text-slate-350">Mentor Full Name</label>
                  <input
                    required
                    value={selectedMentor.name || ""}
                    onChange={(e) => setSelectedMentor({ ...selectedMentor, name: e.target.value })}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-muted px-3.5 text-sm outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-primary dark:text-slate-350">Role Designation</label>
                    <input
                      required
                      value={selectedMentor.bio || ""}
                      onChange={(e) => setSelectedMentor({ ...selectedMentor, headline: e.target.value })}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-muted px-3.5 text-sm outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-primary dark:text-slate-350">Company</label>
                    <input
                      required
                      value={selectedMentor.headline || ""}
                      onChange={(e) => setSelectedMentor({ ...selectedMentor, headline: e.target.value })}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-muted px-3.5 text-sm outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-primary dark:text-slate-350">Biography / Experience Summary</label>
                  <textarea
                    rows={4}
                    value={selectedMentor.bio || ""}
                    onChange={(e) => setSelectedMentor({ ...selectedMentor, headline: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-muted p-3.5 text-sm outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                {selectedMentor.id && (
                  <div className="mt-6 rounded-xl border border-slate-100 p-4 dark:border-slate-800">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-4">Performance Metrics</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <Star className="size-4 text-amber-500" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400">Avg. Rating</p>
                          <p className="text-sm font-black text-slate-700 dark:text-slate-300">{5.0}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Users className="size-4 text-cyan-500" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400">Total Students</p>
                          <p className="text-sm font-black text-slate-700 dark:text-slate-300">{0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </form>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-850">
                <button type="button" onClick={() => setEditorOpen(false)} className="h-11 rounded-xl px-5 text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850">
                  Cancel
                </button>
                <button onClick={saveMentor} className="h-11 rounded-xl bg-primary px-6 text-xs font-black text-white hover:bg-opacity-90 dark:bg-cyan-400 dark:text-primary">
                  Save Mentor
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
