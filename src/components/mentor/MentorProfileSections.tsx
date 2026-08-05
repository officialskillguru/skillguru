// Real, data-driven CRUD editors for a mentor's own profile content
// (Experience/Projects/Certifications/Achievements/Availability/Upcoming
// Sessions). Surfaced as sub-sections inside the mentor portal's Profile
// tab. Replaces the previously-fabricated public-profile content with data
// mentors genuinely manage themselves.
import { useId, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Pencil, X, Check } from "lucide-react";
import {
  useMentorProfileId,
  useMentorExperience,
  useMentorExperienceMutations,
  useMentorProjects,
  useMentorProjectMutations,
  useMentorCertifications,
  useMentorCertificationMutations,
  useMentorAchievements,
  useMentorAchievementMutations,
  useMentorAvailability,
  useMentorAvailabilityMutations,
  useMentorUpcomingSessions,
  useCancelMentorSession,
} from "@/hooks/useMentorPortal";
import { uploadFile } from "@/services/storage.service";
import type {
  MentorExperienceRow,
  MentorProjectRow,
  MentorCertificationRow,
  MentorAchievementRow,
} from "@/services/mentor-profile-content.service";
import type { AvailabilityRow } from "@/services/mentor-availability.service";

const inputClass = "w-full h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const textareaClass = "w-full rounded-md border border-border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const labelClass = "text-xs font-black text-muted-foreground";

function SectionShell({ title, onAdd, addLabel, children }: { title: string; onAdd?: () => void; addLabel?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-foreground">{title}</h3>
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            {addLabel ?? "Add"}
          </button>
        )}
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function LabeledField({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <p className="py-6 text-center text-sm font-semibold text-muted-foreground">{label}</p>;
}

function RowActions({ onEdit, onDelete, deleting }: { onEdit: () => void; onDelete: () => void; deleting: boolean }) {
  return (
    <div className="flex shrink-0 gap-1">
      <button onClick={onEdit} aria-label="Edit" className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Pencil className="size-4" />
      </button>
      <button
        onClick={onDelete}
        disabled={deleting}
        aria-label="Delete"
        className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      </button>
    </div>
  );
}

// ─── Experience ───────────────────────────────────────────────────────────────

type ExperienceFormState = { company: string; role: string; startsOn: string; endsOn: string; isCurrent: boolean; responsibilities: string };

function experienceRowToForm(row: MentorExperienceRow): ExperienceFormState {
  return {
    company: row.company,
    role: row.role,
    startsOn: row.starts_on,
    endsOn: row.ends_on ?? "",
    isCurrent: row.is_current,
    responsibilities: row.responsibilities.join("\n"),
  };
}

const emptyExperienceForm: ExperienceFormState = { company: "", role: "", startsOn: "", endsOn: "", isCurrent: false, responsibilities: "" };

export function MentorExperienceSection() {
  const { data: mentorId } = useMentorProfileId();
  const { data: rows = [], isLoading } = useMentorExperience();
  const mutations = useMentorExperienceMutations();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<ExperienceFormState>(emptyExperienceForm);

  const startEdit = (row: MentorExperienceRow) => {
    setForm(experienceRowToForm(row));
    setEditingId(row.id);
    setAdding(false);
  };
  const startAdd = () => {
    setForm(emptyExperienceForm);
    setAdding(true);
    setEditingId(null);
  };
  const cancel = () => {
    setAdding(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company.trim() || !form.role.trim() || !form.startsOn) {
      toast.error("Company, role, and start date are required.");
      return;
    }
    const payload = {
      company: form.company.trim(),
      role: form.role.trim(),
      starts_on: form.startsOn,
      ends_on: form.isCurrent ? null : form.endsOn || null,
      is_current: form.isCurrent,
      responsibilities: form.responsibilities.split("\n").map((s) => s.trim()).filter(Boolean),
    };
    if (editingId) {
      mutations.update.mutate(
        { id: editingId, input: payload },
        { onSuccess: () => { toast.success("Experience updated."); cancel(); }, onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update.") }
      );
    } else if (mentorId) {
      mutations.create.mutate(
        { ...payload, mentor_id: mentorId },
        { onSuccess: () => { toast.success("Experience added."); cancel(); }, onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to add.") }
      );
    }
  };

  return (
    <SectionShell title="Work Experience" onAdd={startAdd} addLabel="Add Experience">
      {isLoading ? (
        <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" role="status" aria-label="Loading" />
      ) : rows.length === 0 && !adding ? (
        <EmptyRow label="No experience added yet." />
      ) : (
        rows.map((row) =>
          editingId === row.id ? (
            <ExperienceForm key={row.id} form={form} setForm={setForm} onSubmit={handleSubmit} onCancel={cancel} pending={mutations.update.isPending} />
          ) : (
            <div key={row.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-4">
              <div>
                <p className="font-black text-foreground">{row.role}</p>
                <p className="text-sm text-muted-foreground">{row.company}</p>
                <p className="text-xs text-muted-foreground/70">{row.starts_on} – {row.is_current ? "Present" : row.ends_on ?? ""}</p>
              </div>
              <RowActions onEdit={() => startEdit(row)} onDelete={() => mutations.remove.mutate(row.id, { onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete.") })} deleting={mutations.remove.isPending} />
            </div>
          )
        )
      )}
      {adding && <ExperienceForm form={form} setForm={setForm} onSubmit={handleSubmit} onCancel={cancel} pending={mutations.create.isPending} />}
    </SectionShell>
  );
}

function ExperienceForm({ form, setForm, onSubmit, onCancel, pending }: { form: ExperienceFormState; setForm: (f: ExperienceFormState) => void; onSubmit: (e: React.FormEvent) => void; onCancel: () => void; pending: boolean }) {
  const uid = useId();
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <LabeledField label="Company" htmlFor={`${uid}-company`}>
          <input id={`${uid}-company`} className={inputClass} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </LabeledField>
        <LabeledField label="Role" htmlFor={`${uid}-role`}>
          <input id={`${uid}-role`} className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        </LabeledField>
        <LabeledField label="Start Date" htmlFor={`${uid}-starts-on`}>
          <input id={`${uid}-starts-on`} type="date" className={inputClass} value={form.startsOn} onChange={(e) => setForm({ ...form, startsOn: e.target.value })} />
        </LabeledField>
        <LabeledField label="End Date" htmlFor={`${uid}-ends-on`}>
          <input id={`${uid}-ends-on`} type="date" className={inputClass} value={form.endsOn} disabled={form.isCurrent} onChange={(e) => setForm({ ...form, endsOn: e.target.value })} />
        </LabeledField>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <input type="checkbox" checked={form.isCurrent} onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })} />
        I currently work here
      </label>
      <LabeledField label="Responsibilities (one per line)" htmlFor={`${uid}-responsibilities`}>
        <textarea id={`${uid}-responsibilities`} className={textareaClass} rows={3} value={form.responsibilities} onChange={(e) => setForm({ ...form, responsibilities: e.target.value })} />
      </LabeledField>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted">Cancel</button>
        <button type="submit" disabled={pending} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground disabled:opacity-50">
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Save
        </button>
      </div>
    </form>
  );
}

// ─── Projects ─────────────────────────────────────────────────────────────────

type ProjectFormState = { title: string; description: string; techStack: string; githubUrl: string; liveUrl: string };
const emptyProjectForm: ProjectFormState = { title: "", description: "", techStack: "", githubUrl: "", liveUrl: "" };

export function MentorProjectsSection() {
  const { data: mentorId } = useMentorProfileId();
  const { data: rows = [], isLoading } = useMentorProjects();
  const mutations = useMentorProjectMutations();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<ProjectFormState>(emptyProjectForm);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const startEdit = (row: MentorProjectRow) => {
    setForm({ title: row.title, description: row.description ?? "", techStack: row.tech_stack.join(", "), githubUrl: row.github_url ?? "", liveUrl: row.live_url ?? "" });
    setEditingId(row.id);
    setAdding(false);
    setFile(null);
  };
  const startAdd = () => { setForm(emptyProjectForm); setAdding(true); setEditingId(null); setFile(null); };
  const cancel = () => { setAdding(false); setEditingId(null); setFile(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required."); return; }

    let imageFileId: string | undefined;
    if (file) {
      try {
        setUploading(true);
        const uploaded = await uploadFile("mentors", file, "projects");
        imageFileId = uploaded.fileId;
      } catch (err) {
        setUploading(false);
        toast.error(err instanceof Error ? err.message : "Image upload failed.");
        return;
      }
      setUploading(false);
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      tech_stack: form.techStack.split(",").map((s) => s.trim()).filter(Boolean),
      github_url: form.githubUrl.trim() || null,
      live_url: form.liveUrl.trim() || null,
      ...(imageFileId ? { image_file_id: imageFileId } : {}),
    };

    if (editingId) {
      mutations.update.mutate({ id: editingId, input: payload }, { onSuccess: () => { toast.success("Project updated."); cancel(); }, onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update.") });
    } else if (mentorId) {
      mutations.create.mutate({ ...payload, mentor_id: mentorId }, { onSuccess: () => { toast.success("Project added."); cancel(); }, onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to add.") });
    }
  };

  return (
    <SectionShell title="Portfolio Projects" onAdd={startAdd} addLabel="Add Project">
      {isLoading ? (
        <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" role="status" aria-label="Loading" />
      ) : rows.length === 0 && !adding ? (
        <EmptyRow label="No projects added yet." />
      ) : (
        rows.map((row) =>
          editingId === row.id ? (
            <ProjectForm key={row.id} form={form} setForm={setForm} file={file} setFile={setFile} uploading={uploading} onSubmit={(e) => void handleSubmit(e)} onCancel={cancel} pending={mutations.update.isPending} />
          ) : (
            <div key={row.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-4">
              <div>
                <p className="font-black text-foreground">{row.title}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{row.description}</p>
                {row.tech_stack.length > 0 && <p className="mt-1 text-xs font-bold text-muted-foreground/70">{row.tech_stack.join(", ")}</p>}
              </div>
              <RowActions onEdit={() => startEdit(row)} onDelete={() => mutations.remove.mutate(row.id, { onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete.") })} deleting={mutations.remove.isPending} />
            </div>
          )
        )
      )}
      {adding && <ProjectForm form={form} setForm={setForm} file={file} setFile={setFile} uploading={uploading} onSubmit={(e) => void handleSubmit(e)} onCancel={cancel} pending={mutations.create.isPending} />}
    </SectionShell>
  );
}

function ProjectForm({ form, setForm, file, setFile, uploading, onSubmit, onCancel, pending }: {
  form: ProjectFormState; setForm: (f: ProjectFormState) => void; file: File | null; setFile: (f: File | null) => void; uploading: boolean;
  onSubmit: (e: React.FormEvent) => void; onCancel: () => void; pending: boolean;
}) {
  const uid = useId();
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <LabeledField label="Title" htmlFor={`${uid}-title`}>
        <input id={`${uid}-title`} className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </LabeledField>
      <LabeledField label="Description" htmlFor={`${uid}-description`}>
        <textarea id={`${uid}-description`} className={textareaClass} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </LabeledField>
      <LabeledField label="Tech Stack (comma separated)" htmlFor={`${uid}-tech-stack`}>
        <input id={`${uid}-tech-stack`} className={inputClass} value={form.techStack} onChange={(e) => setForm({ ...form, techStack: e.target.value })} />
      </LabeledField>
      <div className="grid gap-3 sm:grid-cols-2">
        <LabeledField label="GitHub URL" htmlFor={`${uid}-github-url`}>
          <input id={`${uid}-github-url`} className={inputClass} value={form.githubUrl} onChange={(e) => setForm({ ...form, githubUrl: e.target.value })} />
        </LabeledField>
        <LabeledField label="Live URL" htmlFor={`${uid}-live-url`}>
          <input id={`${uid}-live-url`} className={inputClass} value={form.liveUrl} onChange={(e) => setForm({ ...form, liveUrl: e.target.value })} />
        </LabeledField>
      </div>
      <LabeledField label="Project Image" htmlFor={`${uid}-image`}>
        <input id={`${uid}-image`} type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
        {file && <p className="text-xs text-muted-foreground">Selected: {file.name}</p>}
      </LabeledField>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted"><X className="inline size-3.5" /> Cancel</button>
        <button type="submit" disabled={pending || uploading} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground disabled:opacity-50">
          {pending || uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Save
        </button>
      </div>
    </form>
  );
}

// ─── Certifications ───────────────────────────────────────────────────────────

type CertificationFormState = { name: string; issuer: string; issueDate: string; credentialUrl: string };
const emptyCertificationForm: CertificationFormState = { name: "", issuer: "", issueDate: "", credentialUrl: "" };

export function MentorCertificationsSection() {
  const { data: mentorId } = useMentorProfileId();
  const { data: rows = [], isLoading } = useMentorCertifications();
  const mutations = useMentorCertificationMutations();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<CertificationFormState>(emptyCertificationForm);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const startEdit = (row: MentorCertificationRow) => {
    setForm({ name: row.name, issuer: row.issuer, issueDate: row.issue_date ?? "", credentialUrl: row.credential_url ?? "" });
    setEditingId(row.id);
    setAdding(false);
    setFile(null);
  };
  const startAdd = () => { setForm(emptyCertificationForm); setAdding(true); setEditingId(null); setFile(null); };
  const cancel = () => { setAdding(false); setEditingId(null); setFile(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.issuer.trim()) { toast.error("Name and issuer are required."); return; }

    let issuerLogoFileId: string | undefined;
    if (file) {
      try {
        setUploading(true);
        const uploaded = await uploadFile("mentors", file, "certifications");
        issuerLogoFileId = uploaded.fileId;
      } catch (err) {
        setUploading(false);
        toast.error(err instanceof Error ? err.message : "Logo upload failed.");
        return;
      }
      setUploading(false);
    }

    const payload = {
      name: form.name.trim(),
      issuer: form.issuer.trim(),
      issue_date: form.issueDate || null,
      credential_url: form.credentialUrl.trim() || null,
      ...(issuerLogoFileId ? { issuer_logo_file_id: issuerLogoFileId } : {}),
    };

    if (editingId) {
      mutations.update.mutate({ id: editingId, input: payload }, { onSuccess: () => { toast.success("Certification updated."); cancel(); }, onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update.") });
    } else if (mentorId) {
      mutations.create.mutate({ ...payload, mentor_id: mentorId }, { onSuccess: () => { toast.success("Certification added."); cancel(); }, onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to add.") });
    }
  };

  return (
    <SectionShell title="Certifications" onAdd={startAdd} addLabel="Add Certification">
      {isLoading ? (
        <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" role="status" aria-label="Loading" />
      ) : rows.length === 0 && !adding ? (
        <EmptyRow label="No certifications added yet." />
      ) : (
        rows.map((row) =>
          editingId === row.id ? (
            <CertificationForm key={row.id} form={form} setForm={setForm} file={file} setFile={setFile} uploading={uploading} onSubmit={(e) => void handleSubmit(e)} onCancel={cancel} pending={mutations.update.isPending} />
          ) : (
            <div key={row.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-4">
              <div>
                <p className="font-black text-foreground">{row.name}</p>
                <p className="text-sm text-muted-foreground">{row.issuer} {row.issue_date ? `• ${row.issue_date}` : ""}</p>
              </div>
              <RowActions onEdit={() => startEdit(row)} onDelete={() => mutations.remove.mutate(row.id, { onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete.") })} deleting={mutations.remove.isPending} />
            </div>
          )
        )
      )}
      {adding && <CertificationForm form={form} setForm={setForm} file={file} setFile={setFile} uploading={uploading} onSubmit={(e) => void handleSubmit(e)} onCancel={cancel} pending={mutations.create.isPending} />}
    </SectionShell>
  );
}

function CertificationForm({ form, setForm, file, setFile, uploading, onSubmit, onCancel, pending }: {
  form: CertificationFormState; setForm: (f: CertificationFormState) => void; file: File | null; setFile: (f: File | null) => void; uploading: boolean;
  onSubmit: (e: React.FormEvent) => void; onCancel: () => void; pending: boolean;
}) {
  const uid = useId();
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <LabeledField label="Name" htmlFor={`${uid}-name`}>
          <input id={`${uid}-name`} className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </LabeledField>
        <LabeledField label="Issuer" htmlFor={`${uid}-issuer`}>
          <input id={`${uid}-issuer`} className={inputClass} value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} />
        </LabeledField>
        <LabeledField label="Issue Date" htmlFor={`${uid}-issue-date`}>
          <input id={`${uid}-issue-date`} type="date" className={inputClass} value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
        </LabeledField>
        <LabeledField label="Credential URL" htmlFor={`${uid}-credential-url`}>
          <input id={`${uid}-credential-url`} className={inputClass} value={form.credentialUrl} onChange={(e) => setForm({ ...form, credentialUrl: e.target.value })} />
        </LabeledField>
      </div>
      <LabeledField label="Issuer Logo" htmlFor={`${uid}-logo`}>
        <input id={`${uid}-logo`} type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
        {file && <p className="text-xs text-muted-foreground">Selected: {file.name}</p>}
      </LabeledField>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted">Cancel</button>
        <button type="submit" disabled={pending || uploading} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground disabled:opacity-50">
          {pending || uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Save
        </button>
      </div>
    </form>
  );
}

// ─── Achievements ─────────────────────────────────────────────────────────────

const ACHIEVEMENT_ICONS = ["Award", "Trophy", "Star", "Medal", "Crown"] as const;
type AchievementFormState = { title: string; description: string; achievedOn: string; icon: string };
const emptyAchievementForm: AchievementFormState = { title: "", description: "", achievedOn: "", icon: ACHIEVEMENT_ICONS[0] };

export function MentorAchievementsSection() {
  const { data: mentorId } = useMentorProfileId();
  const { data: rows = [], isLoading } = useMentorAchievements();
  const mutations = useMentorAchievementMutations();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<AchievementFormState>(emptyAchievementForm);

  const startEdit = (row: MentorAchievementRow) => {
    setForm({ title: row.title, description: row.description ?? "", achievedOn: row.achieved_on ?? "", icon: row.icon ?? ACHIEVEMENT_ICONS[0] });
    setEditingId(row.id);
    setAdding(false);
  };
  const startAdd = () => { setForm(emptyAchievementForm); setAdding(true); setEditingId(null); };
  const cancel = () => { setAdding(false); setEditingId(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required."); return; }
    const payload = { title: form.title.trim(), description: form.description.trim() || null, achieved_on: form.achievedOn || null, icon: form.icon };
    if (editingId) {
      mutations.update.mutate({ id: editingId, input: payload }, { onSuccess: () => { toast.success("Achievement updated."); cancel(); }, onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update.") });
    } else if (mentorId) {
      mutations.create.mutate({ ...payload, mentor_id: mentorId }, { onSuccess: () => { toast.success("Achievement added."); cancel(); }, onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to add.") });
    }
  };

  return (
    <SectionShell title="Achievements & Awards" onAdd={startAdd} addLabel="Add Achievement">
      {isLoading ? (
        <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" role="status" aria-label="Loading" />
      ) : rows.length === 0 && !adding ? (
        <EmptyRow label="No achievements added yet." />
      ) : (
        rows.map((row) =>
          editingId === row.id ? (
            <AchievementForm key={row.id} form={form} setForm={setForm} onSubmit={handleSubmit} onCancel={cancel} pending={mutations.update.isPending} />
          ) : (
            <div key={row.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-4">
              <div>
                <p className="font-black text-foreground">{row.title}</p>
                <p className="text-sm text-muted-foreground">{row.description}</p>
              </div>
              <RowActions onEdit={() => startEdit(row)} onDelete={() => mutations.remove.mutate(row.id, { onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete.") })} deleting={mutations.remove.isPending} />
            </div>
          )
        )
      )}
      {adding && <AchievementForm form={form} setForm={setForm} onSubmit={handleSubmit} onCancel={cancel} pending={mutations.create.isPending} />}
    </SectionShell>
  );
}

function AchievementForm({ form, setForm, onSubmit, onCancel, pending }: { form: AchievementFormState; setForm: (f: AchievementFormState) => void; onSubmit: (e: React.FormEvent) => void; onCancel: () => void; pending: boolean }) {
  const uid = useId();
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <LabeledField label="Title" htmlFor={`${uid}-title`}>
        <input id={`${uid}-title`} className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </LabeledField>
      <LabeledField label="Description" htmlFor={`${uid}-description`}>
        <textarea id={`${uid}-description`} className={textareaClass} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </LabeledField>
      <div className="grid gap-3 sm:grid-cols-2">
        <LabeledField label="Date" htmlFor={`${uid}-date`}>
          <input id={`${uid}-date`} type="date" className={inputClass} value={form.achievedOn} onChange={(e) => setForm({ ...form, achievedOn: e.target.value })} />
        </LabeledField>
        <LabeledField label="Icon" htmlFor={`${uid}-icon`}>
          <select id={`${uid}-icon`} className={inputClass} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
            {ACHIEVEMENT_ICONS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
          </select>
        </LabeledField>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted">Cancel</button>
        <button type="submit" disabled={pending} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground disabled:opacity-50">
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Save
        </button>
      </div>
    </form>
  );
}

// ─── Availability ─────────────────────────────────────────────────────────────

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function MentorAvailabilitySection() {
  const uid = useId();
  const { data: mentorId } = useMentorProfileId();
  const { data: rows = [], isLoading } = useMentorAvailability();
  const mutations = useMentorAvailabilityMutations();
  const [adding, setAdding] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mentorId) return;
    if (startTime >= endTime) { toast.error("End time must be after start time."); return; }
    mutations.create.mutate(
      { user_id: mentorId, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime, is_active: true },
      { onSuccess: () => { toast.success("Availability added."); setAdding(false); }, onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to add.") }
    );
  };

  return (
    <SectionShell title="Weekly Availability" onAdd={() => setAdding(true)} addLabel="Add Slot">
      {isLoading ? (
        <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" role="status" aria-label="Loading" />
      ) : rows.length === 0 && !adding ? (
        <EmptyRow label="No availability set yet. Students can't book sessions until you add some." />
      ) : (
        rows.map((row: AvailabilityRow) => (
          <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-4">
            <div>
              <p className="font-black text-foreground">{WEEKDAYS[row.day_of_week]}</p>
              <p className="text-sm text-muted-foreground">{row.start_time.slice(0, 5)} – {row.end_time.slice(0, 5)} ({row.timezone})</p>
            </div>
            <button
              onClick={() => mutations.remove.mutate(row.id, { onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to remove.") })}
              disabled={mutations.remove.isPending}
              aria-label="Remove slot"
              className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))
      )}
      {adding && (
        <form onSubmit={handleAdd} className="grid gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:grid-cols-3">
          <LabeledField label="Day" htmlFor={`${uid}-day`}>
            <select id={`${uid}-day`} className={inputClass} value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))}>
              {WEEKDAYS.map((day, i) => <option key={day} value={i}>{day}</option>)}
            </select>
          </LabeledField>
          <LabeledField label="Start Time" htmlFor={`${uid}-start-time`}>
            <input id={`${uid}-start-time`} type="time" className={inputClass} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </LabeledField>
          <LabeledField label="End Time" htmlFor={`${uid}-end-time`}>
            <input id={`${uid}-end-time`} type="time" className={inputClass} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </LabeledField>
          <div className="flex gap-2 sm:col-span-3">
            <button type="button" onClick={() => setAdding(false)} className="rounded-md border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted">Cancel</button>
            <button type="submit" disabled={mutations.create.isPending} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground disabled:opacity-50">
              {mutations.create.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Add
            </button>
          </div>
        </form>
      )}
    </SectionShell>
  );
}

// ─── Upcoming Sessions ────────────────────────────────────────────────────────

export function MentorUpcomingSessionsSection() {
  const { data: sessions = [], isLoading } = useMentorUpcomingSessions();
  const cancelMutation = useCancelMentorSession();

  return (
    <SectionShell title="Upcoming Sessions">
      {isLoading ? (
        <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" role="status" aria-label="Loading" />
      ) : sessions.length === 0 ? (
        <EmptyRow label="No upcoming sessions booked." />
      ) : (
        sessions.map((session) => (
          <div key={session.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-4">
            <div>
              <p className="font-black text-foreground">{session.title}</p>
              <p className="text-sm text-muted-foreground">{new Date(session.starts_at).toLocaleString()} – {new Date(session.ends_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
            </div>
            <button
              onClick={() => cancelMutation.mutate(session.id, { onSuccess: () => toast.success("Session cancelled."), onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to cancel.") })}
              disabled={cancelMutation.isPending}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        ))
      )}
    </SectionShell>
  );
}
