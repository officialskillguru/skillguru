// Resume Builder: an editable form for structured resume content, and a
// clean, ATS-friendly single-column print preview. PDF export uses the
// browser's native print-to-PDF (window.print() + @media print CSS) rather
// than adding a client-side PDF-rendering dependency - no new bundle weight,
// and the output is genuine, selectable text (not a screenshot).
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Pencil, X, Check, Download, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useResumeProfile,
  useUpdateResumeContact,
  useUpdateResumeEducation,
  useResumeExperience,
  useResumeExperienceMutations,
  useResumeProjects,
  useResumeProjectMutations,
  useResumeCertifications,
  useResumeCertificationMutations,
  useResumeAchievements,
  useResumeAchievementMutations,
} from "@/hooks/student/useResume";
import type { ResumeExperience, ResumeProject, ResumeCertification, ResumeAchievement } from "@/services/resume.service";

const inputCls = "w-full h-10 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary";
const textareaCls = "w-full rounded-lg border border-border bg-card p-3 text-sm outline-none focus:border-primary";
const labelCls = "text-xs font-black text-muted-foreground";

export default function ResumeBuilderPage() {
  const [view, setView] = useState<"edit" | "preview">("edit");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground">Resume Builder</h2>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">Build a structured, ATS-friendly resume from your profile data.</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={() => setView("edit")}
            className={`rounded-lg px-4 py-2 text-xs font-black ${view === "edit" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-muted"}`}
          >
            Edit
          </button>
          <button
            onClick={() => setView("preview")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-black ${view === "preview" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-muted"}`}
          >
            <FileText className="size-3.5"  aria-hidden="true" /> Preview
          </button>
        </div>
      </div>

      {view === "edit" ? <ResumeEditView /> : <ResumePreviewView />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Edit view
// ─────────────────────────────────────────────────────────────────────────

function ResumeEditView() {
  return (
    <div className="space-y-6">
      <ContactSection />
      <EducationSection />
      <ExperienceSection />
      <ProjectsSection />
      <CertificationsSection />
      <AchievementsSection />
    </div>
  );
}

function SectionShell({ title, onAdd, addLabel, children }: { title: string; onAdd?: () => void; addLabel?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black text-foreground">{title}</h3>
        {onAdd && (
          <button onClick={onAdd} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground hover:bg-primary/90">
            <Plus className="size-3.5"  aria-hidden="true" /> {addLabel ?? "Add"}
          </button>
        )}
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function RowActions({ onEdit, onDelete, deleting }: { onEdit: () => void; onDelete: () => void; deleting: boolean }) {
  return (
    <div className="flex shrink-0 gap-1">
      <button onClick={onEdit} aria-label="Edit" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
        <Pencil className="size-4"  aria-hidden="true" />
      </button>
      <button onClick={onDelete} disabled={deleting} aria-label="Delete" className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive-text disabled:opacity-50">
        {deleting ? <Loader2 className="size-4 animate-spin"  aria-hidden="true" /> : <Trash2 className="size-4"  aria-hidden="true" />}
      </button>
    </div>
  );
}

function ContactSection() {
  const { data: profile, isLoading } = useResumeProfile();
  const updateContact = useUpdateResumeContact();
  const [form, setForm] = useState({ full_name: "", phone: "", city: "", state: "", country: "", linkedin_url: "", github_url: "", portfolio_url: "", website_url: "", bio: "" });
  const [initialized, setInitialized] = useState(false);

  if (!isLoading && profile && !initialized) {
    setInitialized(true);
    setForm({
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      city: profile.city ?? "",
      state: profile.state ?? "",
      country: profile.country ?? "",
      linkedin_url: profile.linkedin_url ?? "",
      github_url: profile.github_url ?? "",
      portfolio_url: profile.portfolio_url ?? "",
      website_url: profile.website_url ?? "",
      bio: profile.bio ?? "",
    });
  }

  const handleSave = () => {
    updateContact.mutate(form, {
      onSuccess: () => toast.success("Contact details saved."),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save."),
    });
  };

  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  return (
    <SectionShell title="Contact & Professional Summary">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={labelCls}>Full Name</label><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>City</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>State</label><input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>Country</label><input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>LinkedIn URL</label><input value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>GitHub URL</label><input value={form.github_url} onChange={(e) => setForm({ ...form, github_url: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>Portfolio URL</label><input value={form.portfolio_url} onChange={(e) => setForm({ ...form, portfolio_url: e.target.value })} className={inputCls} /></div>
      </div>
      <div>
        <label className={labelCls}>Professional Summary</label>
        <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className={textareaCls} placeholder="A 2-3 sentence pitch about yourself..." />
      </div>
      <button onClick={handleSave} disabled={updateContact.isPending} className="rounded-lg bg-primary px-4 py-2 text-xs font-black text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
        {updateContact.isPending ? <Loader2 className="size-4 animate-spin"  aria-hidden="true" /> : "Save"}
      </button>
    </SectionShell>
  );
}

function EducationSection() {
  const { data: profile, isLoading } = useResumeProfile();
  const updateEducation = useUpdateResumeEducation();
  const [form, setForm] = useState({ education: "", college: "", graduation_year: "", skillsText: "" });
  const [initialized, setInitialized] = useState(false);

  if (!isLoading && profile && !initialized) {
    setInitialized(true);
    setForm({
      education: profile.education ?? "",
      college: profile.college ?? "",
      graduation_year: profile.graduation_year?.toString() ?? "",
      skillsText: (profile.skills ?? []).join(", "),
    });
  }

  const handleSave = () => {
    updateEducation.mutate(
      {
        education: form.education || null,
        college: form.college || null,
        graduation_year: form.graduation_year ? Number(form.graduation_year) : null,
        skills: form.skillsText.split(",").map((s) => s.trim()).filter(Boolean),
      },
      {
        onSuccess: () => toast.success("Education & skills saved."),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save."),
      }
    );
  };

  if (isLoading) return <Skeleton className="h-48 w-full rounded-2xl" />;

  return (
    <SectionShell title="Education & Skills">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={labelCls}>Degree / Program</label><input value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} className={inputCls} placeholder="B.Tech Computer Science" /></div>
        <div><label className={labelCls}>College / University</label><input value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>Graduation Year</label><input type="number" value={form.graduation_year} onChange={(e) => setForm({ ...form, graduation_year: e.target.value })} className={inputCls} /></div>
      </div>
      <div>
        <label className={labelCls}>Skills (comma separated)</label>
        <input value={form.skillsText} onChange={(e) => setForm({ ...form, skillsText: e.target.value })} className={inputCls} placeholder="React, TypeScript, SQL" />
      </div>
      <button onClick={handleSave} disabled={updateEducation.isPending} className="rounded-lg bg-primary px-4 py-2 text-xs font-black text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
        {updateEducation.isPending ? <Loader2 className="size-4 animate-spin"  aria-hidden="true" /> : "Save"}
      </button>
    </SectionShell>
  );
}

type ExperienceForm = { title: string; company: string; location: string; start_date: string; end_date: string; is_current: boolean; description: string };
const emptyExperienceForm: ExperienceForm = { title: "", company: "", location: "", start_date: "", end_date: "", is_current: false, description: "" };
function experienceToForm(row: ResumeExperience): ExperienceForm {
  return { title: row.title, company: row.company, location: row.location ?? "", start_date: row.start_date, end_date: row.end_date ?? "", is_current: row.is_current, description: row.description ?? "" };
}

function ExperienceSection() {
  const { data: rows = [], isLoading } = useResumeExperience();
  const mutations = useResumeExperienceMutations();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<ExperienceForm>(emptyExperienceForm);

  const startEdit = (row: ResumeExperience) => { setForm(experienceToForm(row)); setEditingId(row.id); setAdding(false); };
  const startAdd = () => { setForm(emptyExperienceForm); setAdding(true); setEditingId(null); };
  const cancel = () => { setAdding(false); setEditingId(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.company || !form.start_date) { toast.error("Title, company, and start date are required."); return; }
    const patch = { title: form.title, company: form.company, location: form.location || null, start_date: form.start_date, end_date: form.is_current ? null : form.end_date || null, is_current: form.is_current, description: form.description || null };
    if (editingId) {
      mutations.update.mutate({ id: editingId, patch }, { onSuccess: () => { toast.success("Experience updated."); cancel(); } });
    } else {
      mutations.create.mutate(patch, { onSuccess: () => { toast.success("Experience added."); cancel(); } });
    }
  };

  return (
    <SectionShell title="Work Experience" onAdd={startAdd} addLabel="Add Experience">
      {isLoading ? (
        <Skeleton className="h-20 w-full rounded-xl" />
      ) : rows.length === 0 && !adding ? (
        <p className="py-4 text-center text-sm font-semibold text-muted-foreground">No experience added yet.</p>
      ) : (
        rows.map((row) =>
          editingId === row.id ? (
            <ExperienceForm key={row.id} form={form} setForm={setForm} onSubmit={handleSubmit} onCancel={cancel} pending={mutations.update.isPending} />
          ) : (
            <div key={row.id} className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
              <div>
                <p className="font-bold text-foreground">{row.title} · {row.company}</p>
                <p className="text-xs text-muted-foreground">{row.start_date} - {row.is_current ? "Present" : row.end_date}</p>
              </div>
              <RowActions onEdit={() => startEdit(row)} onDelete={() => mutations.remove.mutate(row.id)} deleting={mutations.remove.isPending} />
            </div>
          )
        )
      )}
      {adding && <ExperienceForm form={form} setForm={setForm} onSubmit={handleSubmit} onCancel={cancel} pending={mutations.create.isPending} />}
    </SectionShell>
  );
}

function ExperienceForm({ form, setForm, onSubmit, onCancel, pending }: { form: ExperienceForm; setForm: (f: ExperienceForm) => void; onSubmit: (e: React.FormEvent) => void; onCancel: () => void; pending: boolean }) {
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Job Title" className={inputCls} />
        <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company" className={inputCls} />
        <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" className={inputCls} />
        <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputCls} />
        {!form.is_current && <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={inputCls} />}
      </div>
      <label className="flex items-center gap-2 text-xs font-bold text-foreground">
        <input type="checkbox" checked={form.is_current} onChange={(e) => setForm({ ...form, is_current: e.target.checked })} /> I currently work here
      </label>
      <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Key responsibilities and achievements..." className={textareaCls} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground disabled:opacity-50">{pending ? <Loader2 className="size-3.5 animate-spin"  aria-hidden="true" /> : <Check className="size-3.5"  aria-hidden="true" />} Save</button>
        <button type="button" onClick={onCancel} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-black text-muted-foreground"><X className="size-3.5"  aria-hidden="true" /> Cancel</button>
      </div>
    </form>
  );
}

type ProjectForm = { title: string; description: string; techStackText: string; project_url: string };
const emptyProjectForm: ProjectForm = { title: "", description: "", techStackText: "", project_url: "" };
function projectToForm(row: ResumeProject): ProjectForm {
  return { title: row.title, description: row.description ?? "", techStackText: (row.tech_stack ?? []).join(", "), project_url: row.project_url ?? "" };
}

function ProjectsSection() {
  const { data: rows = [], isLoading } = useResumeProjects();
  const mutations = useResumeProjectMutations();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<ProjectForm>(emptyProjectForm);

  const startEdit = (row: ResumeProject) => { setForm(projectToForm(row)); setEditingId(row.id); setAdding(false); };
  const startAdd = () => { setForm(emptyProjectForm); setAdding(true); setEditingId(null); };
  const cancel = () => { setAdding(false); setEditingId(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) { toast.error("Project title is required."); return; }
    const patch = { title: form.title, description: form.description || null, tech_stack: form.techStackText.split(",").map((s) => s.trim()).filter(Boolean), project_url: form.project_url || null };
    if (editingId) {
      mutations.update.mutate({ id: editingId, patch }, { onSuccess: () => { toast.success("Project updated."); cancel(); } });
    } else {
      mutations.create.mutate(patch, { onSuccess: () => { toast.success("Project added."); cancel(); } });
    }
  };

  return (
    <SectionShell title="Projects" onAdd={startAdd} addLabel="Add Project">
      {isLoading ? (
        <Skeleton className="h-20 w-full rounded-xl" />
      ) : rows.length === 0 && !adding ? (
        <p className="py-4 text-center text-sm font-semibold text-muted-foreground">No projects added yet.</p>
      ) : (
        rows.map((row) =>
          editingId === row.id ? (
            <form key={row.id} onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Project Title" className={inputCls} />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Description" className={textareaCls} />
              <input value={form.techStackText} onChange={(e) => setForm({ ...form, techStackText: e.target.value })} placeholder="Tech stack (comma separated)" className={inputCls} />
              <input value={form.project_url} onChange={(e) => setForm({ ...form, project_url: e.target.value })} placeholder="Project URL" className={inputCls} />
              <div className="flex gap-2">
                <button type="submit" disabled={mutations.update.isPending} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground disabled:opacity-50">Save</button>
                <button type="button" onClick={cancel} className="rounded-lg border border-border px-3 py-1.5 text-xs font-black text-muted-foreground">Cancel</button>
              </div>
            </form>
          ) : (
            <div key={row.id} className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
              <div>
                <p className="font-bold text-foreground">{row.title}</p>
                <p className="text-xs text-muted-foreground">{(row.tech_stack ?? []).join(", ")}</p>
              </div>
              <RowActions onEdit={() => startEdit(row)} onDelete={() => mutations.remove.mutate(row.id)} deleting={mutations.remove.isPending} />
            </div>
          )
        )
      )}
      {adding && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Project Title" className={inputCls} />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Description" className={textareaCls} />
          <input value={form.techStackText} onChange={(e) => setForm({ ...form, techStackText: e.target.value })} placeholder="Tech stack (comma separated)" className={inputCls} />
          <input value={form.project_url} onChange={(e) => setForm({ ...form, project_url: e.target.value })} placeholder="Project URL" className={inputCls} />
          <div className="flex gap-2">
            <button type="submit" disabled={mutations.create.isPending} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground disabled:opacity-50">Save</button>
            <button type="button" onClick={cancel} className="rounded-lg border border-border px-3 py-1.5 text-xs font-black text-muted-foreground">Cancel</button>
          </div>
        </form>
      )}
    </SectionShell>
  );
}

type CertForm = { name: string; issuer: string; issue_date: string; credential_url: string };
const emptyCertForm: CertForm = { name: "", issuer: "", issue_date: "", credential_url: "" };
function certToForm(row: ResumeCertification): CertForm {
  return { name: row.name, issuer: row.issuer ?? "", issue_date: row.issue_date ?? "", credential_url: row.credential_url ?? "" };
}

function CertificationsSection() {
  const { data: rows = [], isLoading } = useResumeCertifications();
  const mutations = useResumeCertificationMutations();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<CertForm>(emptyCertForm);

  const startEdit = (row: ResumeCertification) => { setForm(certToForm(row)); setEditingId(row.id); setAdding(false); };
  const startAdd = () => { setForm(emptyCertForm); setAdding(true); setEditingId(null); };
  const cancel = () => { setAdding(false); setEditingId(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast.error("Certification name is required."); return; }
    const patch = { name: form.name, issuer: form.issuer || null, issue_date: form.issue_date || null, credential_url: form.credential_url || null };
    if (editingId) {
      mutations.update.mutate({ id: editingId, patch }, { onSuccess: () => { toast.success("Certification updated."); cancel(); } });
    } else {
      mutations.create.mutate(patch, { onSuccess: () => { toast.success("Certification added."); cancel(); } });
    }
  };

  const form_fields = (
    <>
      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Certification Name" className={inputCls} />
      <input value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} placeholder="Issuer" className={inputCls} />
      <input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} className={inputCls} />
      <input value={form.credential_url} onChange={(e) => setForm({ ...form, credential_url: e.target.value })} placeholder="Credential URL" className={inputCls} />
    </>
  );

  return (
    <SectionShell title="Certifications" onAdd={startAdd} addLabel="Add Certification">
      {isLoading ? (
        <Skeleton className="h-20 w-full rounded-xl" />
      ) : rows.length === 0 && !adding ? (
        <p className="py-4 text-center text-sm font-semibold text-muted-foreground">No certifications added yet.</p>
      ) : (
        rows.map((row) =>
          editingId === row.id ? (
            <form key={row.id} onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              {form_fields}
              <div className="flex gap-2">
                <button type="submit" disabled={mutations.update.isPending} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground disabled:opacity-50">Save</button>
                <button type="button" onClick={cancel} className="rounded-lg border border-border px-3 py-1.5 text-xs font-black text-muted-foreground">Cancel</button>
              </div>
            </form>
          ) : (
            <div key={row.id} className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
              <div>
                <p className="font-bold text-foreground">{row.name}</p>
                <p className="text-xs text-muted-foreground">{row.issuer}</p>
              </div>
              <RowActions onEdit={() => startEdit(row)} onDelete={() => mutations.remove.mutate(row.id)} deleting={mutations.remove.isPending} />
            </div>
          )
        )
      )}
      {adding && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          {form_fields}
          <div className="flex gap-2">
            <button type="submit" disabled={mutations.create.isPending} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground disabled:opacity-50">Save</button>
            <button type="button" onClick={cancel} className="rounded-lg border border-border px-3 py-1.5 text-xs font-black text-muted-foreground">Cancel</button>
          </div>
        </form>
      )}
    </SectionShell>
  );
}

type AchievementForm = { title: string; description: string; date_achieved: string };
const emptyAchievementForm: AchievementForm = { title: "", description: "", date_achieved: "" };
function achievementToForm(row: ResumeAchievement): AchievementForm {
  return { title: row.title, description: row.description ?? "", date_achieved: row.date_achieved ?? "" };
}

function AchievementsSection() {
  const { data: rows = [], isLoading } = useResumeAchievements();
  const mutations = useResumeAchievementMutations();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<AchievementForm>(emptyAchievementForm);

  const startEdit = (row: ResumeAchievement) => { setForm(achievementToForm(row)); setEditingId(row.id); setAdding(false); };
  const startAdd = () => { setForm(emptyAchievementForm); setAdding(true); setEditingId(null); };
  const cancel = () => { setAdding(false); setEditingId(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) { toast.error("Achievement title is required."); return; }
    const patch = { title: form.title, description: form.description || null, date_achieved: form.date_achieved || null };
    if (editingId) {
      mutations.update.mutate({ id: editingId, patch }, { onSuccess: () => { toast.success("Achievement updated."); cancel(); } });
    } else {
      mutations.create.mutate(patch, { onSuccess: () => { toast.success("Achievement added."); cancel(); } });
    }
  };

  const fields = (
    <>
      <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Achievement Title" className={inputCls} />
      <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Description" className={textareaCls} />
      <input type="date" value={form.date_achieved} onChange={(e) => setForm({ ...form, date_achieved: e.target.value })} className={inputCls} />
    </>
  );

  return (
    <SectionShell title="Achievements" onAdd={startAdd} addLabel="Add Achievement">
      {isLoading ? (
        <Skeleton className="h-20 w-full rounded-xl" />
      ) : rows.length === 0 && !adding ? (
        <p className="py-4 text-center text-sm font-semibold text-muted-foreground">No achievements added yet.</p>
      ) : (
        rows.map((row) =>
          editingId === row.id ? (
            <form key={row.id} onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              {fields}
              <div className="flex gap-2">
                <button type="submit" disabled={mutations.update.isPending} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground disabled:opacity-50">Save</button>
                <button type="button" onClick={cancel} className="rounded-lg border border-border px-3 py-1.5 text-xs font-black text-muted-foreground">Cancel</button>
              </div>
            </form>
          ) : (
            <div key={row.id} className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
              <div>
                <p className="font-bold text-foreground">{row.title}</p>
                <p className="text-xs text-muted-foreground">{row.date_achieved}</p>
              </div>
              <RowActions onEdit={() => startEdit(row)} onDelete={() => mutations.remove.mutate(row.id)} deleting={mutations.remove.isPending} />
            </div>
          )
        )
      )}
      {adding && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          {fields}
          <div className="flex gap-2">
            <button type="submit" disabled={mutations.create.isPending} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground disabled:opacity-50">Save</button>
            <button type="button" onClick={cancel} className="rounded-lg border border-border px-3 py-1.5 text-xs font-black text-muted-foreground">Cancel</button>
          </div>
        </form>
      )}
    </SectionShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Preview view (print-ready, ATS-friendly)
// ─────────────────────────────────────────────────────────────────────────

function ResumePreviewView() {
  const { data: profile, isLoading: profileLoading } = useResumeProfile();
  const { data: experience = [], isLoading: expLoading } = useResumeExperience();
  const { data: projects = [], isLoading: projLoading } = useResumeProjects();
  const { data: certifications = [], isLoading: certLoading } = useResumeCertifications();
  const { data: achievements = [], isLoading: achLoading } = useResumeAchievements();

  const isLoading = profileLoading || expLoading || projLoading || certLoading || achLoading;

  if (isLoading || !profile) {
    return <Skeleton className="h-[600px] w-full rounded-2xl" />;
  }

  const location = [profile.city, profile.state, profile.country].filter(Boolean).join(", ");

  return (
    <div className="space-y-4">
      <div className="flex justify-end print:hidden">
        <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground hover:bg-primary/90">
          <Download className="size-4" /> Download PDF
        </button>
      </div>

      <div id="resume-preview" className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-10 text-slate-800 shadow-sm print:m-0 print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <header className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-black text-slate-900">{profile.full_name}</h1>
          <p className="mt-1 flex flex-wrap gap-x-3 text-xs font-semibold text-slate-500">
            {profile.email && <span>{profile.email}</span>}
            {profile.phone && <span>· {profile.phone}</span>}
            {location && <span>· {location}</span>}
          </p>
          <p className="mt-1 flex flex-wrap gap-x-3 text-xs font-semibold text-primary">
            {profile.linkedin_url && <span>{profile.linkedin_url}</span>}
            {profile.github_url && <span>· {profile.github_url}</span>}
            {profile.portfolio_url && <span>· {profile.portfolio_url}</span>}
          </p>
        </header>

        {profile.bio && (
          <section className="mt-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">Summary</h2>
            <p className="mt-1 text-sm leading-6">{profile.bio}</p>
          </section>
        )}

        {(profile.education || profile.college) && (
          <section className="mt-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">Education</h2>
            <p className="mt-1 text-sm font-bold text-slate-900">{profile.education}</p>
            <p className="text-xs text-slate-500">{profile.college}{profile.graduation_year ? ` · Class of ${profile.graduation_year}` : ""}</p>
          </section>
        )}

        {experience.length > 0 && (
          <section className="mt-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">Experience</h2>
            <div className="mt-1 space-y-3">
              {experience.map((e) => (
                <div key={e.id}>
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-bold text-slate-900">{e.title} · {e.company}</p>
                    <p className="text-xs text-slate-500">{e.start_date} - {e.is_current ? "Present" : e.end_date}</p>
                  </div>
                  {e.location && <p className="text-xs text-slate-500">{e.location}</p>}
                  {e.description && <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{e.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {projects.length > 0 && (
          <section className="mt-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">Projects</h2>
            <div className="mt-1 space-y-2">
              {projects.map((p) => (
                <div key={p.id}>
                  <p className="text-sm font-bold text-slate-900">{p.title}</p>
                  {p.description && <p className="text-sm leading-6">{p.description}</p>}
                  {(p.tech_stack ?? []).length > 0 && <p className="text-xs text-slate-500">{(p.tech_stack ?? []).join(", ")}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {(profile.skills ?? []).length > 0 && (
          <section className="mt-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">Skills</h2>
            <p className="mt-1 text-sm">{(profile.skills ?? []).join(" · ")}</p>
          </section>
        )}

        {certifications.length > 0 && (
          <section className="mt-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">Certifications</h2>
            <div className="mt-1 space-y-1">
              {certifications.map((c) => (
                <p key={c.id} className="text-sm"><span className="font-bold text-slate-900">{c.name}</span>{c.issuer ? ` — ${c.issuer}` : ""}</p>
              ))}
            </div>
          </section>
        )}

        {achievements.length > 0 && (
          <section className="mt-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">Achievements</h2>
            <div className="mt-1 space-y-1">
              {achievements.map((a) => (
                <p key={a.id} className="text-sm"><span className="font-bold text-slate-900">{a.title}</span>{a.description ? ` — ${a.description}` : ""}</p>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
