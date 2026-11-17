import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Camera, ExternalLink, Loader2, Save, ShieldCheck, User, X } from "lucide-react";
import { toast } from "sonner";
import { useMentorProfile, useUpdateMentorProfile } from "@/hooks/useMentorPortal";
import { useProfile } from "@/hooks/student/useProfile";
import { resolveFileUrl } from "@/services/storage.service";
import { getSupabaseClientOrThrow } from "@/services/_shared";
import { createSlug } from "@/lib/slug";
import { getNextTabIndex } from "@/lib/a11y-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChangePasswordCard } from "@/components/common/ChangePasswordCard";
import {
  MentorExperienceSection,
  MentorProjectsSection,
  MentorCertificationsSection,
  MentorAchievementsSection,
  MentorAvailabilitySection,
  MentorUpcomingSessionsSection,
} from "@/components/mentor/MentorProfileSections";

const PROFILE_SUB_TABS = [
  "Basic Info",
  "Experience",
  "Projects",
  "Certifications",
  "Achievements",
  "Availability",
  "Sessions",
  "Security",
] as const;
type ProfileSubTab = (typeof PROFILE_SUB_TABS)[number];

const inputClass =
  "w-full h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const labelClass = "text-xs font-black text-muted-foreground";

export function ProfileTab() {
  const [subTab, setSubTab] = useState<ProfileSubTab>("Basic Info");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const nextIndex = getNextTabIndex(index, e.key, PROFILE_SUB_TABS.length);
    const nextTab = nextIndex === null ? undefined : PROFILE_SUB_TABS[nextIndex];
    if (!nextTab) return;
    e.preventDefault();
    setSubTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-foreground text-2xl font-black">Mentor Profile</h1>
      <div
        role="tablist"
        aria-label="Profile sections"
        className="border-border flex flex-wrap gap-2 border-b pb-3"
      >
        {PROFILE_SUB_TABS.map((tab, i) => (
          <button
            key={tab}
            ref={(el) => {
              tabRefs.current[tab] = el;
            }}
            role="tab"
            id={`mentor-profile-tab-${tab}`}
            aria-controls={`mentor-profile-panel-${tab}`}
            aria-selected={subTab === tab}
            tabIndex={subTab === tab ? 0 : -1}
            onClick={() => setSubTab(tab)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={`focus-visible:ring-ring rounded-md px-3 py-1.5 text-xs font-black tracking-wide uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none ${
              subTab === tab
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`mentor-profile-panel-${subTab}`}
        aria-labelledby={`mentor-profile-tab-${subTab}`}
        tabIndex={0}
      >
        {subTab === "Basic Info" && <ProfileBasicInfo />}
        {subTab === "Experience" && <MentorExperienceSection />}
        {subTab === "Projects" && <MentorProjectsSection />}
        {subTab === "Certifications" && <MentorCertificationsSection />}
        {subTab === "Achievements" && <MentorAchievementsSection />}
        {subTab === "Availability" && <MentorAvailabilitySection />}
        {subTab === "Sessions" && <MentorUpcomingSessionsSection />}
        {subTab === "Security" && <ProfileSecurity />}
      </div>
    </div>
  );
}

function SkillsEditor({
  skills,
  onChange,
}: Readonly<{ skills: string[]; onChange: (skills: string[]) => void }>) {
  const [draft, setDraft] = useState("");

  const addSkill = () => {
    const value = draft.trim();
    if (!value || skills.includes(value)) return;
    onChange([...skills, value]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="mentor-skill-input">Skills</Label>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => (
          <span
            key={skill}
            className="bg-secondary/10 text-secondary flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold"
          >
            {skill}
            <button
              type="button"
              onClick={() => onChange(skills.filter((s) => s !== skill))}
              aria-label={`Remove skill ${skill}`}
              className="text-secondary/70 hover:text-secondary"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          id="mentor-skill-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSkill();
            }
          }}
          placeholder="e.g. React, System Design"
          className={inputClass}
        />
        <button
          type="button"
          onClick={addSkill}
          className="border-border text-foreground hover:bg-muted focus-visible:ring-ring shrink-0 rounded-md border px-3 text-xs font-black focus-visible:ring-2 focus-visible:outline-none"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function ProfileBasicInfo() {
  const { data: mentorProfile, isLoading: isMentorProfileLoading } = useMentorProfile();
  const updateMentorProfile = useUpdateMentorProfile();
  const { profile, isLoading: isProfileLoading, updateProfile, uploadAvatar } = useProfile();

  const { data: avatarUrl } = useQuery({
    queryKey: ["profile-avatar-url", profile?.avatarFileId],
    queryFn: () => resolveFileUrl(profile!.avatarFileId!),
    enabled: !!profile?.avatarFileId,
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    city: "",
    state: "",
    country: "",
    headline: "",
    company: "",
    experienceYears: "",
    bio: "",
    skills: [] as string[],
    linkedinUrl: "",
    githubUrl: "",
    portfolioUrl: "",
    websiteUrl: "",
    twitterUrl: "",
    youtubeUrl: "",
  });

  if (isMentorProfileLoading || isProfileLoading)
    return <Skeleton className="h-96 w-full rounded-xl" />;
  if (!mentorProfile || !profile)
    return (
      <div className="text-muted-foreground py-12 text-center text-sm font-semibold">
        Profile not found.
      </div>
    );

  const startEditing = () => {
    setForm({
      fullName: profile.fullName ?? "",
      phone: profile.phone ?? "",
      city: profile.city ?? "",
      state: profile.state ?? "",
      country: profile.country ?? "",
      headline: mentorProfile.headline ?? "",
      company: mentorProfile.company ?? "",
      experienceYears:
        mentorProfile.experience_years != null ? String(mentorProfile.experience_years) : "",
      bio: mentorProfile.bio ?? "",
      skills: mentorProfile.skills ?? [],
      linkedinUrl: mentorProfile.linkedin_url ?? "",
      githubUrl: mentorProfile.github_url ?? "",
      portfolioUrl: mentorProfile.portfolio_url ?? "",
      websiteUrl: mentorProfile.website_url ?? "",
      twitterUrl: mentorProfile.twitter_url ?? "",
      youtubeUrl: mentorProfile.youtube_url ?? "",
    });
    setEditing(true);
  };

  const isSaving = updateProfile.isPending || updateMentorProfile.isPending;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await Promise.all([
        updateProfile.mutateAsync({
          fullName: form.fullName || undefined,
          phone: form.phone || null,
          city: form.city || null,
          state: form.state || null,
          country: form.country || null,
        }),
        updateMentorProfile.mutateAsync({
          headline: form.headline || null,
          company: form.company || null,
          experience_years: form.experienceYears ? Number(form.experienceYears) : null,
          bio: form.bio || null,
          skills: form.skills,
          linkedin_url: form.linkedinUrl || null,
          github_url: form.githubUrl || null,
          portfolio_url: form.portfolioUrl || null,
          website_url: form.websiteUrl || null,
          twitter_url: form.twitterUrl || null,
          youtube_url: form.youtubeUrl || null,
        }),
      ]);
      toast.success("Profile updated.");
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile.");
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }
    uploadAvatar.mutate({ file, bucket: "mentors" });
    e.target.value = "";
  };

  const publicProfilePath = profile.fullName ? `/mentors/${createSlug(profile.fullName)}` : null;

  return (
    <div className="border-border bg-card rounded-xl border p-6 shadow-sm">
      <div className="border-border flex flex-wrap items-center gap-6 border-b pb-6">
        <div className="relative">
          <div className="border-border bg-muted text-muted-foreground grid size-24 place-items-center overflow-hidden rounded-full border-2">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={profile.fullName || "Avatar"}
                className="size-full object-cover"
              />
            ) : (
              <User className="size-10" aria-hidden="true" />
            )}
          </div>
          <label
            htmlFor="mentor-avatar-upload"
            aria-label="Change profile photo"
            className="border-border bg-card text-muted-foreground hover:bg-muted focus-within:ring-ring absolute right-0 bottom-0 grid size-8 cursor-pointer place-items-center rounded-full border shadow-sm focus-within:ring-2 focus-within:ring-offset-2"
          >
            {uploadAvatar.isPending ? (
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <Camera className="size-4" aria-hidden="true" />
            )}
            <input
              type="file"
              id="mentor-avatar-upload"
              className="sr-only"
              accept="image/*"
              onChange={handleAvatarChange}
              disabled={uploadAvatar.isPending}
            />
          </label>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-foreground text-xl font-black">
            {profile.fullName ?? "Mentor Account"}
          </h3>
          <p className="text-muted-foreground text-sm">{profile.email}</p>
          {mentorProfile.headline && (
            <p className="text-primary mt-1 text-sm font-bold">{mentorProfile.headline}</p>
          )}
        </div>
        {publicProfilePath && (
          <Link
            to={publicProfilePath}
            target="_blank"
            rel="noopener noreferrer"
            className="border-border text-foreground hover:bg-muted focus-visible:ring-ring flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-black focus-visible:ring-2 focus-visible:outline-none"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            View Public Profile
          </Link>
        )}
      </div>

      {!editing ? (
        <div className="mt-6 space-y-3">
          <p className="text-muted-foreground text-sm">
            {mentorProfile.bio || "No bio added yet."}
          </p>
          <dl className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
            {mentorProfile.company && (
              <div>
                <dt className="text-muted-foreground font-black">Company</dt>
                <dd className="text-foreground">{mentorProfile.company}</dd>
              </div>
            )}
            {mentorProfile.experience_years != null && (
              <div>
                <dt className="text-muted-foreground font-black">Experience</dt>
                <dd className="text-foreground">{mentorProfile.experience_years} years</dd>
              </div>
            )}
            {profile.phone && (
              <div>
                <dt className="text-muted-foreground font-black">Phone</dt>
                <dd className="text-foreground">{profile.phone}</dd>
              </div>
            )}
            {(profile.city || profile.state || profile.country) && (
              <div>
                <dt className="text-muted-foreground font-black">Location</dt>
                <dd className="text-foreground">
                  {[profile.city, profile.state, profile.country].filter(Boolean).join(", ")}
                </dd>
              </div>
            )}
          </dl>
          {mentorProfile.skills && mentorProfile.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {mentorProfile.skills.map((skill) => (
                <span
                  key={skill}
                  className="bg-secondary/10 text-secondary rounded-full px-3 py-1 text-xs font-bold"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
          <button
            onClick={startEditing}
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring mt-4 rounded-md px-4 py-2 text-sm font-black transition focus-visible:ring-2 focus-visible:outline-none"
          >
            Edit Profile details
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => void handleSave(e)}
          className="border-border mt-6 space-y-6 border-t pt-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="mentor-full-name" className={labelClass}>
                Full name
              </Label>
              <input
                id="mentor-full-name"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mentor-headline" className={labelClass}>
                Headline
              </Label>
              <input
                id="mentor-headline"
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
                placeholder="e.g. Senior Backend Engineer"
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mentor-company" className={labelClass}>
                Company
              </Label>
              <input
                id="mentor-company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mentor-experience" className={labelClass}>
                Years of experience
              </Label>
              <input
                id="mentor-experience"
                type="number"
                min={0}
                value={form.experienceYears}
                onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mentor-phone" className={labelClass}>
                Phone
              </Label>
              <input
                id="mentor-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="mentor-city" className={labelClass}>
                City
              </Label>
              <input
                id="mentor-city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mentor-state" className={labelClass}>
                State
              </Label>
              <input
                id="mentor-state"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mentor-country" className={labelClass}>
                Country
              </Label>
              <input
                id="mentor-country"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="mentor-bio" className={labelClass}>
              Bio
            </Label>
            <Textarea
              id="mentor-bio"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={4}
            />
          </div>

          <SkillsEditor skills={form.skills} onChange={(skills) => setForm({ ...form, skills })} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="mentor-linkedin" className={labelClass}>
                LinkedIn
              </Label>
              <input
                id="mentor-linkedin"
                type="url"
                value={form.linkedinUrl}
                onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/in/..."
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mentor-github" className={labelClass}>
                GitHub
              </Label>
              <input
                id="mentor-github"
                type="url"
                value={form.githubUrl}
                onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
                placeholder="https://github.com/..."
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mentor-portfolio" className={labelClass}>
                Portfolio
              </Label>
              <input
                id="mentor-portfolio"
                type="url"
                value={form.portfolioUrl}
                onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mentor-website" className={labelClass}>
                Website
              </Label>
              <input
                id="mentor-website"
                type="url"
                value={form.websiteUrl}
                onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mentor-twitter" className={labelClass}>
                Twitter / X
              </Label>
              <input
                id="mentor-twitter"
                type="url"
                value={form.twitterUrl}
                onChange={(e) => setForm({ ...form, twitterUrl: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mentor-youtube" className={labelClass}>
                YouTube
              </Label>
              <input
                id="mentor-youtube"
                type="url"
                value={form.youtubeUrl}
                onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="border-border text-foreground hover:bg-muted focus-visible:ring-ring rounded-md border px-4 py-2 text-sm font-bold focus-visible:ring-2 focus-visible:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              aria-busy={isSaving}
              className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring flex items-center gap-2 rounded-md px-4 py-2 text-sm font-black transition focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <Save className="size-4" aria-hidden="true" />
              )}
              Save Changes
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function formatLoginTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function ProfileSecurity() {
  const { data: history, isLoading } = useQuery({
    queryKey: ["mentor", "login-history"],
    queryFn: async () => {
      const supabase = getSupabaseClientOrThrow();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("login_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <ChangePasswordCard idPrefix="mentor-password" />

      <div className="border-border bg-card rounded-xl border p-6 shadow-sm">
        <div className="border-border flex items-center gap-2 border-b pb-4">
          <ShieldCheck className="text-primary size-5" aria-hidden="true" />
          <h3 className="text-foreground text-lg font-black">Recent Login Activity</h3>
        </div>
        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : !history || history.length === 0 ? (
            <p className="text-muted-foreground text-sm">No login activity recorded yet.</p>
          ) : (
            <ul className="divide-border divide-y">
              {history.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="text-foreground font-semibold">
                      {[entry.browser, entry.os, entry.device_type].filter(Boolean).join(" · ") ||
                        "Unknown device"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {[entry.city, entry.country].filter(Boolean).join(", ") || "Unknown location"}{" "}
                      · {formatLoginTime(entry.created_at)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${entry.success ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive-text"}`}
                  >
                    {entry.success ? "Success" : "Failed"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
