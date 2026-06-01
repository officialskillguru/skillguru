import { useState } from "react";
import {
  Search,
  Users,
  Award,
  ChevronRight,
  MoreVertical,
  X,
  FileCheck,
  BookOpen,
  GraduationCap,
  Sparkles,
  Play,
  ArrowRight,
  Clock,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface StudentRecord {
  id: string;
  name: string;
  email: string;
  course: string;
  progress: number;
  score: number;
  joined: string;
  status: "Active" | "Completed" | "Pending Approval";
}

const initialStudents: StudentRecord[] = [
  { id: "S-1001", name: "Aarav Singhal", email: "aarav.singhal@gmail.com", course: "Full Stack Web Development", progress: 85, score: 92, joined: "Jan 12, 2026", status: "Active" },
  { id: "S-1002", name: "Priya Patel", email: "priya.patel@yahoo.com", course: "UI/UX Design Expert", progress: 100, score: 88, joined: "Feb 05, 2026", status: "Pending Approval" },
  { id: "S-1003", name: "Rohan Gupta", email: "rohan.gupta@outlook.com", course: "Data Science & AI/ML", progress: 100, score: 95, joined: "Jan 20, 2026", status: "Completed" },
  { id: "S-1004", name: "Neha Deshmukh", email: "neha.desh@gmail.com", course: "Cloud Computing (AWS)", progress: 42, score: 78, joined: "Mar 10, 2026", status: "Active" },
  { id: "S-1005", name: "Sameer Shah", email: "sameer.shah@gmail.com", course: "Full Stack Web Development", progress: 100, score: 91, joined: "Feb 01, 2026", status: "Pending Approval" },
];

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentRecord[]>(initialStudents);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Completed" | "Pending Approval">("All");
  const [activeStudent, setActiveStudent] = useState<StudentRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filteredStudents = students.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.course.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRowClick = (student: StudentRecord) => {
    setActiveStudent(student);
    setDrawerOpen(true);
  };

  const handleApproveCertificate = (id: string) => {
    setStudents(
      students.map((s) => (s.id === id ? { ...s, status: "Completed" } : s))
    );
    if (activeStudent && activeStudent.id === id) {
      setActiveStudent({ ...activeStudent, status: "Completed" });
    }
    toast.success("Tuition verification approved. PG Certificate generated and mailed.");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#0F2B7A] dark:text-cyan-200">
            Student Registers & Outcomes
          </h1>
          <p className="mt-1 text-sm font-semibold text-[#64748B] dark:text-[#94A3B8]">
            Monitor active syllabus progress, verify capstone project scores, and approve tuition PG Certificates.
          </p>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-[#DDE7F6] dark:border-slate-800">
        {[
          { id: "All", label: "All Students" },
          { id: "Active", label: "Active Learners" },
          { id: "Completed", label: "Alumni / Completed" },
          { id: "Pending Approval", label: "Certificates Pending" }
        ].map((tb) => (
          <button
            key={tb.id}
            onClick={() => setStatusFilter(tb.id as any)}
            className={[
              "py-3.5 px-5 text-xs font-black border-b-2 transition-all",
              statusFilter === tb.id
                ? "border-[#0F2B7A] text-[#0F2B7A] dark:border-cyan-400 dark:text-cyan-300"
                : "border-transparent text-slate-450 hover:text-[#0F2B7A] dark:hover:text-white",
            ].join(" ")}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-3 rounded-2xl border border-[#DDE7F6] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#0F2B7A] dark:text-cyan-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students by name, course focus..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-10 pr-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-[#0F2B7A] dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>
      </div>

      {/* Students Data Table */}
      <div className="overflow-hidden rounded-2xl border border-[#DDE7F6] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#DDE7F6] bg-[#EEF3FA]/40 text-[10px] font-black uppercase tracking-wider text-[#64748B] dark:border-slate-850 dark:bg-slate-900/50">
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Registered Program</th>
                <th className="px-6 py-4">Syllabus Progress</th>
                <th className="px-6 py-4">Median Score</th>
                <th className="px-6 py-4">Enrollment Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE7F6] dark:divide-slate-850">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm font-semibold text-slate-400">
                    No student records matched the active filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => handleRowClick(s)}
                    className="group cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-all text-xs"
                  >
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#0F2B7A] to-blue-800 text-white font-black text-xs shrink-0">
                          {s.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-[#0F2B7A] dark:text-slate-100">{s.name}</p>
                          <p className="text-[10px] font-bold text-slate-400">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 font-semibold text-slate-600 dark:text-slate-350">{s.course}</td>
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-700 dark:text-slate-200">{s.progress}%</span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-850 shrink-0">
                          <div className="h-full bg-[#22D3EE] rounded-full" style={{ width: `${s.progress}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 font-black text-cyan-600 dark:text-cyan-400">{s.score}%</td>
                    <td className="px-6 py-4.5 text-slate-450 font-bold">{s.joined}</td>
                    <td className="px-6 py-4.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                        s.status === "Completed"
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450"
                          : s.status === "Pending Approval"
                          ? "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-450"
                          : "bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-450"
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-right">
                      <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                        <MoreVertical className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Progress drawer */}
      <AnimatePresence>
        {drawerOpen && activeStudent && (
          <div className="fixed inset-0 z-50 flex justify-end bg-[#020617]/50 backdrop-blur-xs">
            <button className="absolute inset-0 cursor-default" onClick={() => setDrawerOpen(false)} />

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
                  <h3 className="text-lg font-black text-[#0F2B7A] dark:text-white">Academic Progress Roadmap</h3>
                  <p className="text-xs font-semibold text-slate-400">{activeStudent.name} • {activeStudent.id}</p>
                </div>
                <button onClick={() => setDrawerOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
                  <X className="size-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Score meters */}
                <div className="grid gap-4 grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-850">
                    <p className="text-[9px] font-black uppercase text-slate-450">Syllabus Complete</p>
                    <p className="mt-1 text-xl font-black text-[#0F2B7A] dark:text-white">{activeStudent.progress}%</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-850">
                    <p className="text-[9px] font-black uppercase text-slate-450">Median Test Score</p>
                    <p className="mt-1 text-xl font-black text-cyan-600 dark:text-cyan-400">{activeStudent.score}%</p>
                  </div>
                </div>

                {/* Course outline module list */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-[#0F2B7A] dark:text-cyan-200 uppercase tracking-wider">Syllabus modules audit</h4>
                  {[
                    { name: "Frontend Core Frameworks", status: "Cleared", score: "94%" },
                    { name: "Backend APIs & Databases Modeling", status: activeStudent.progress > 50 ? "Cleared" : "In Progress", score: activeStudent.progress > 50 ? "90%" : "—" },
                    { name: "Cloud Architecture Deployments", status: activeStudent.progress === 100 ? "Cleared" : "Locked", score: "—" },
                  ].map((mod, index) => (
                    <div key={mod.name} className="flex items-center justify-between rounded-xl border border-slate-100 p-3.5 dark:border-slate-850">
                      <div className="space-y-0.5">
                        <p className="text-xs font-black text-[#0F2B7A] dark:text-slate-350">Module {index + 1}: {mod.name}</p>
                        <p className="text-[10px] font-bold text-slate-400">Score: {mod.score}</p>
                      </div>
                      <span className={`rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                        mod.status === "Cleared"
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20"
                          : mod.status === "In Progress"
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-950/20"
                          : "bg-slate-100 text-slate-450 dark:bg-slate-800"
                      }`}>
                        {mod.status}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Certificate action section */}
                {activeStudent.status === "Pending Approval" && (
                  <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/20 p-5 space-y-4 dark:border-amber-900/50">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-amber-600 dark:text-amber-450 uppercase tracking-wider flex items-center gap-2">
                        <Award className="size-4" />
                        <span>Pending Certification Approval</span>
                      </h4>
                      <p className="text-[10px] font-bold text-slate-450 leading-normal">
                        Candidate has successfully completed 100% of coursework syllabus. Verify grade profiles and release PG Diploma.
                      </p>
                    </div>
                    <button
                      onClick={() => handleApproveCertificate(activeStudent.id)}
                      className="h-10 w-full rounded-xl bg-[#0F2B7A] text-xs font-black text-white hover:bg-opacity-90 dark:bg-cyan-400 dark:text-[#0F2B7A]"
                    >
                      Approve & Generate PG Certificate
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-850">
                <button type="button" onClick={() => setDrawerOpen(false)} className="h-11 rounded-xl px-5 text-xs font-black text-slate-500 hover:bg-slate-100">Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
