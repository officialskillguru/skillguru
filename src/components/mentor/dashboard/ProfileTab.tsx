import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { UserCircle, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useMentorProfile, useUpdateMentorProfile } from "@/hooks/useMentorPortal";
import { getNextTabIndex } from "@/lib/a11y-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MentorExperienceSection,
  MentorProjectsSection,
  MentorCertificationsSection,
  MentorAchievementsSection,
  MentorAvailabilitySection,
  MentorUpcomingSessionsSection,
} from "@/components/mentor/MentorProfileSections";

const PROFILE_SUB_TABS = ["Basic Info", "Experience", "Projects", "Certifications", "Achievements", "Availability", "Sessions"] as const;
type ProfileSubTab = typeof PROFILE_SUB_TABS[number];

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
      <h2 className="text-2xl font-black text-foreground">Mentor Profile</h2>
      <div role="tablist" aria-label="Profile sections" className="flex flex-wrap gap-2 border-b border-border pb-3">
        {PROFILE_SUB_TABS.map((tab, i) => (
          <button
            key={tab}
            ref={(el) => { tabRefs.current[tab] = el; }}
            role="tab"
            id={`mentor-profile-tab-${tab}`}
            aria-controls={`mentor-profile-panel-${tab}`}
            aria-selected={subTab === tab}
            tabIndex={subTab === tab ? 0 : -1}
            onClick={() => setSubTab(tab)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={`rounded-md px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              subTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`mentor-profile-panel-${subTab}`} aria-labelledby={`mentor-profile-tab-${subTab}`} tabIndex={0}>
        {subTab === "Basic Info" && <ProfileBasicInfo />}
        {subTab === "Experience" && <MentorExperienceSection />}
        {subTab === "Projects" && <MentorProjectsSection />}
        {subTab === "Certifications" && <MentorCertificationsSection />}
        {subTab === "Achievements" && <MentorAchievementsSection />}
        {subTab === "Availability" && <MentorAvailabilitySection />}
        {subTab === "Sessions" && <MentorUpcomingSessionsSection />}
      </div>
    </div>
  );
}

function ProfileBasicInfo() {
  const { data: profile, isLoading } = useMentorProfile();
  const updateProfile = useUpdateMentorProfile();
  const [editing, setEditing] = useState(false);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [company, setCompany] = useState("");

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!profile) return <div className="py-12 text-center text-sm font-semibold text-muted-foreground">Profile not found.</div>;

  const startEditing = () => {
    setHeadline(profile.headline ?? "");
    setBio(profile.bio ?? "");
    setCompany(profile.company ?? "");
    setEditing(true);
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(
      { headline: headline || null, bio: bio || null, company: company || null },
      {
        onSuccess: () => {
          toast.success("Profile updated.");
          setEditing(false);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update profile."),
      }
    );
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-6">
        <div className="flex size-24 items-center justify-center rounded-full bg-muted border border-border">
          <UserCircle className="size-12 text-muted-foreground" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-xl font-black text-foreground">{profile.full_name ?? "Mentor Account"}</h3>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
          {profile.headline && <p className="mt-1 text-sm font-bold text-primary">{profile.headline}</p>}
        </div>
      </div>

      {!editing ? (
        <div className="mt-6 border-t border-border pt-6">
          <p className="text-sm text-muted-foreground">{profile.bio || "No bio added yet."}</p>
          {profile.company && <p className="mt-2 text-xs font-bold text-muted-foreground">Company: {profile.company}</p>}
          <button
            onClick={startEditing}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Edit Profile details
          </button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="mt-6 space-y-4 border-t border-border pt-6">
          <div className="space-y-1">
            <label htmlFor="mentor-headline" className="text-xs font-black text-muted-foreground">Headline</label>
            <input
              id="mentor-headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Senior Backend Engineer"
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="mentor-company" className="text-xs font-black text-muted-foreground">Company</label>
            <input
              id="mentor-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="mentor-bio" className="text-xs font-black text-muted-foreground">Bio</label>
            <textarea
              id="mentor-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-border px-4 py-2 text-sm font-bold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateProfile.isPending}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {updateProfile.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
              Save Changes
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
