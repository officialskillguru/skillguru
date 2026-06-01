import { useState } from "react";
import {
  Search,
  Star,
  Users,
  Award,
  Video,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  Plus,
  X,
  Briefcase,
  MapPin,
  Calendar,
  Languages,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { mentors as initialMentors } from "@/data/platform";

interface MentorRecord {
  name: string;
  role: string;
  company: string;
  avatar: string;
  category: string;
  experienceYears: number;
  studentsMentored: number;
  rating: number;
  location: string;
  language: string;
  availability: string;
  bio: string;
  expertise: string[];
  workedWith: string[];
}

export default function AdminMentorsPage() {
  const [mentors, setMentors] = useState<MentorRecord[]>(initialMentors);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedMentor, setSelectedMentor] = useState<MentorRecord | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Filtering
  const filteredMentors = mentors.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.company.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "All" || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleEdit = (mentor: MentorRecord) => {
    setSelectedMentor(mentor);
    setEditorOpen(true);
    setActiveMenu(null);
  };

  const handleCreate = () => {
    setSelectedMentor({
      name: "",
      role: "Engineering Lead",
      company: "HR Remedy",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop",
      category: "Development",
      experienceYears: 5,
      studentsMentored: 0,
      rating: 5.0,
      location: "Pune, India",
      language: "English, Hindi",
      availability: "Weekends",
      bio: "",
      expertise: ["Full Stack Development"],
      workedWith: ["HR Remedy"],
    });
    setEditorOpen(true);
  };

  const saveMentor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentor) return;

    if (mentors.some((m) => m.name === selectedMentor.name)) {
      setMentors(mentors.map((m) => (m.name === selectedMentor.name ? selectedMentor : m)));
      toast.success(`Mentor "${selectedMentor.name}" records updated.`);
    } else {
      setMentors([selectedMentor, ...mentors]);
      toast.success(`Mentor "${selectedMentor.name}" added successfully.`);
    }
    setEditorOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#0F2B7A] dark:text-cyan-200">
            Faculty & Mentoring Corps
          </h1>
          <p className="mt-1 text-sm font-semibold text-[#64748B] dark:text-[#94A3B8]">
            Manage professional mentors, approve expert applications, delegate assignments, and review session scores.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex h-11 items-center gap-2 rounded-xl bg-[#0F2B7A] px-5 text-xs font-black text-white hover:bg-opacity-90 shadow-lg shadow-[#0f2b7a]/15 dark:bg-cyan-400 dark:text-[#0F2B7A]"
        >
          <Plus className="size-4" />
          <span>Add Mentor</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          { label: "Elite Mentors", count: mentors.length, color: "text-[#0F2B7A]" },
          { label: "Active Cohorts", count: 24, color: "text-emerald-500" },
          { label: "Average Rating", count: "4.85 / 5", color: "text-amber-500" },
          { label: "Total Mentored", count: "2,450+", color: "text-cyan-600" }
        ].map(st => (
          <div key={st.label} className="rounded-2xl border border-[#DDE7F6] bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{st.label}</p>
            <p className={`mt-1.5 text-2xl font-black ${st.color}`}>{st.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#DDE7F6] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#0F2B7A] dark:text-cyan-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search mentors by name, company..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-10 pr-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-[#0F2B7A] dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-4 text-xs font-black text-[#0F2B7A] outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white md:w-56"
        >
          <option value="All">All Disciplines</option>
          <option value="Data Science">Data Science</option>
          <option value="Cloud Computing">Cloud Computing</option>
          <option value="UI/UX Design">UI/UX Design</option>
        </select>
      </div>

      {/* Mentors Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredMentors.map((m) => (
          <motion.div
            key={m.name}
            whileHover={{ y: -4 }}
            className="relative flex flex-col rounded-3xl border border-[#DDE7F6] bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            {/* Top info */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={m.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=128&auto=format&fit=crop"}
                  alt={m.name}
                  className="size-14 rounded-2xl object-cover bg-slate-100"
                />
                <div>
                  <h3 className="text-base font-black text-[#0F2B7A] dark:text-white">{m.name}</h3>
                  <p className="text-[11px] font-bold text-slate-400">{m.role}</p>
                </div>
              </div>

              {/* Action trigger */}
              <div className="relative">
                <button
                  onClick={() => setActiveMenu(activeMenu === m.name ? null : m.name)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <MoreVertical className="size-4.5" />
                </button>
                <AnimatePresence>
                  {activeMenu === m.name && (
                    <>
                      <button className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-slate-100 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-950"
                      >
                        <button
                          onClick={() => handleEdit(m)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-black text-slate-700 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-900"
                        >
                          <ExternalLink className="size-3 text-[#0F2B7A]" />
                          <span>View Profile</span>
                        </button>
                        <button
                          onClick={() => handleEdit(m)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-black text-slate-700 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-900"
                        >
                          <Award className="size-3 text-emerald-500" />
                          <span>Assign Course</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Profile specifications */}
            <div className="mt-6 grid grid-cols-2 gap-4 border-y border-slate-100 py-4.5 dark:border-slate-850">
              <div className="flex items-center gap-2.5">
                <Briefcase className="size-4 text-[#0F2B7A] dark:text-cyan-300 shrink-0" />
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400">Affiliation</p>
                  <p className="text-xs font-black text-slate-700 dark:text-slate-300 truncate max-w-28">{m.company}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Users className="size-4 text-[#0F2B7A] dark:text-cyan-300 shrink-0" />
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400">Learners</p>
                  <p className="text-xs font-black text-slate-700 dark:text-slate-300">{m.studentsMentored}+</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Star className="size-4 text-amber-500 shrink-0 fill-amber-500" />
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400">Rating</p>
                  <p className="text-xs font-black text-slate-700 dark:text-slate-300">{m.rating} / 5.0</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Award className="size-4 text-[#0F2B7A] dark:text-cyan-300 shrink-0" />
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400">Experience</p>
                  <p className="text-xs font-black text-slate-700 dark:text-slate-300">{m.experienceYears} Years</p>
                </div>
              </div>
            </div>

            {/* Bio */}
            <p className="mt-4 text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
              {m.bio}
            </p>

            {/* Tag expertise */}
            <div className="mt-5 flex flex-wrap gap-1.5">
              {m.expertise.slice(0, 3).map((exp) => (
                <span key={exp} className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-black text-[#64748B] dark:bg-slate-800 dark:text-[#94A3B8]">
                  {exp}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Faculty Profile Editor Drawer */}
      <AnimatePresence>
        {editorOpen && selectedMentor && (
          <div className="fixed inset-0 z-50 flex justify-end bg-[#020617]/50 backdrop-blur-xs">
            <button className="absolute inset-0 cursor-default" onClick={() => setEditorOpen(false)} />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-[#DDE7F6] bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-850">
                <div>
                  <h3 className="text-lg font-black text-[#0F2B7A] dark:text-white">Mentor Credentials Workshop</h3>
                  <p className="text-xs font-semibold text-slate-400">Add affiliations, credentials, schedule availability and reviews.</p>
                </div>
                <button onClick={() => setEditorOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850">
                  <X className="size-5" />
                </button>
              </div>

              {/* Form Scrollable */}
              <form onSubmit={saveMentor} className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="space-y-1">
                  <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-350">Mentor Full Name</label>
                  <input
                    required
                    value={selectedMentor.name}
                    onChange={(e) => setSelectedMentor({ ...selectedMentor, name: e.target.value })}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-350">Role Designation</label>
                    <input
                      required
                      value={selectedMentor.role}
                      onChange={(e) => setSelectedMentor({ ...selectedMentor, role: e.target.value })}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-350">Primary Affiliation / Company</label>
                    <input
                      required
                      value={selectedMentor.company}
                      onChange={(e) => setSelectedMentor({ ...selectedMentor, company: e.target.value })}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-350">Experience (Years)</label>
                    <input
                      type="number"
                      required
                      value={selectedMentor.experienceYears}
                      onChange={(e) => setSelectedMentor({ ...selectedMentor, experienceYears: Number(e.target.value) })}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-350">Aptitude Category</label>
                    <select
                      value={selectedMentor.category}
                      onChange={(e) => setSelectedMentor({ ...selectedMentor, category: e.target.value })}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    >
                      <option>Data Science</option>
                      <option>Cloud Computing</option>
                      <option>UI/UX Design</option>
                      <option>Development</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-350">Biography</label>
                  <textarea
                    rows={4}
                    value={selectedMentor.bio}
                    onChange={(e) => setSelectedMentor({ ...selectedMentor, bio: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] p-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-350">Instructor Video Intro URL (Mock)</label>
                  <div className="relative">
                    <Video className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <input
                      value="https://assets.hr-remedy.edu/faculty/introduction-clip.mp4"
                      className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] pl-10 pr-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                      readOnly
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-350">Schedule Availability & Coordinates</label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <MapPin className="size-4 text-slate-450 shrink-0" />
                      <span>{selectedMentor.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <Languages className="size-4 text-slate-450 shrink-0" />
                      <span>{selectedMentor.language}</span>
                    </div>
                  </div>
                </div>
              </form>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="h-11 rounded-xl px-5 text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850"
                >
                  Close
                </button>
                <button
                  onClick={saveMentor}
                  className="h-11 rounded-xl bg-[#0F2B7A] px-6 text-xs font-black text-white hover:bg-opacity-90 dark:bg-cyan-400 dark:text-[#0F2B7A]"
                >
                  Save Mentor Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
