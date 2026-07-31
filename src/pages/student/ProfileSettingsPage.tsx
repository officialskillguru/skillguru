import { useState } from "react";
import { User, Mail, Camera } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/student/useProfile";
import { resolveFileUrl } from "@/services/storage.service";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const { profile, updateProfile, uploadAvatar } = useProfile();

  const { data: avatarUrl } = useQuery({
    queryKey: ["profile-avatar-url", profile?.avatarFileId],
    queryFn: () => resolveFileUrl(profile!.avatarFileId!),
    enabled: !!profile?.avatarFileId,
  });

  const [localFullName, setLocalFullName] = useState<string | null>(null);
  const [localPhone, setLocalPhone] = useState<string | null>(null);

  const fullName = localFullName ?? profile?.fullName ?? "";
  const phone = localPhone ?? profile?.phone ?? "";

  if (!profile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      fullName: fullName,
      phone: phone,
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File size must be less than 2MB");
        return;
      }
      uploadAvatar.mutate({ file });
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-foreground">Profile Settings</h2>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-6 border-b border-border pb-6">
          <div className="relative">
            <div className="grid size-24 place-items-center overflow-hidden rounded-full border-2 border-border bg-muted text-muted-foreground">
              {avatarUrl ? (
                <img src={avatarUrl} alt={profile?.fullName || "Avatar"} className="size-full object-cover" />
              ) : (
                <User className="size-10" aria-hidden="true" />
              )}
            </div>
            <label
              htmlFor="avatar-upload"
              aria-label="Change profile photo"
              className="absolute bottom-0 right-0 grid size-8 cursor-pointer place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:bg-muted focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
            >
              <Camera className="size-4" aria-hidden="true" />
              <input
                type="file"
                id="avatar-upload"
                className="sr-only"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={uploadAvatar.isPending}
              />
            </label>
          </div>
          <div>
            <h3 className="text-lg font-black text-foreground">{profile.fullName || "Update your name"}</h3>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-6 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-bold text-foreground">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setLocalFullName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/50 py-2.5 pl-10 pr-4 text-sm font-medium outline-none focus:border-secondary focus:bg-card"
                  placeholder="Enter full name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-bold text-foreground">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  aria-describedby="email-hint"
                  className="w-full rounded-xl border border-border bg-muted py-2.5 pl-10 pr-4 text-sm font-medium text-muted-foreground outline-none"
                />
              </div>
              <p id="email-hint" className="text-xs text-muted-foreground">Contact support to change your email address.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-bold text-foreground">Phone Number</label>
            <input
              id="phone"
              value={phone}
              onChange={(e) => setLocalPhone(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm font-medium outline-none focus:border-secondary focus:bg-card"
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={updateProfile.isPending}
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
