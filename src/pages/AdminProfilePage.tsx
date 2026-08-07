import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { User, Camera, Loader2 } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/student/useProfile";
import { resolveFileUrl } from "@/services/storage.service";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChangePasswordCard } from "@/components/common/ChangePasswordCard";

export default function AdminProfilePage() {
  const { user, authUser } = useAuth();
  const { profile, isLoading, updateProfile, uploadAvatar } = useProfile();

  const { data: avatarUrl } = useQuery({
    queryKey: ["profile-avatar-url", profile?.avatarFileId],
    queryFn: () => resolveFileUrl(profile!.avatarFileId!),
    enabled: !!profile?.avatarFileId,
  });

  const [localFullName, setLocalFullName] = useState<string | null>(null);
  const [localUsername, setLocalUsername] = useState<string | null>(null);
  const [localPhone, setLocalPhone] = useState<string | null>(null);
  const [localBio, setLocalBio] = useState<string | null>(null);
  const [localCity, setLocalCity] = useState<string | null>(null);
  const [localState, setLocalState] = useState<string | null>(null);
  const [localCountry, setLocalCountry] = useState<string | null>(null);
  const [localAddress, setLocalAddress] = useState<string | null>(null);

  const fullName = localFullName ?? profile?.fullName ?? "";
  const username = localUsername ?? profile?.username ?? "";
  const phone = localPhone ?? profile?.phone ?? "";
  const bio = localBio ?? profile?.bio ?? "";
  const city = localCity ?? profile?.city ?? "";
  const state = localState ?? profile?.state ?? "";
  const country = localCountry ?? profile?.country ?? "";
  const address = localAddress ?? profile?.address ?? "";

  if (isLoading || !profile) {
    return (
      <div className="max-w-2xl space-y-6">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      fullName,
      username: username || null,
      phone: phone || null,
      bio: bio || null,
      city: city || null,
      state: state || null,
      country: country || null,
      address: address || null,
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }
    uploadAvatar.mutate({ file, bucket: "admins" });
    e.target.value = "";
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">My Profile</h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          Manage your personal information, photo, and account security.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-6 border-b border-border pb-6">
          <div className="relative">
            <div className="grid size-24 place-items-center overflow-hidden rounded-full border-2 border-border bg-muted text-muted-foreground">
              {avatarUrl ? (
                <img src={avatarUrl} alt={profile.fullName || "Avatar"} className="size-full object-cover" />
              ) : (
                <User className="size-10" aria-hidden="true" />
              )}
            </div>
            <label
              htmlFor="admin-avatar-upload"
              aria-label="Change profile photo"
              className="absolute bottom-0 right-0 grid size-8 cursor-pointer place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:bg-muted focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
            >
              {uploadAvatar.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Camera className="size-4" aria-hidden="true" />
              )}
              <input
                type="file"
                id="admin-avatar-upload"
                className="sr-only"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={uploadAvatar.isPending}
              />
            </label>
          </div>
          <div>
            <h2 className="text-lg font-black text-foreground">{profile.fullName || "Update your name"}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-primary">
              {authUser?.highestRole?.replace("_", " ") ?? "Admin"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} aria-labelledby="profile-details-heading" className="mt-6 space-y-5">
          <h2 id="profile-details-heading" className="sr-only">Personal Information</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="admin-fullName">Full Name</Label>
              <input
                id="admin-fullName"
                value={fullName}
                onChange={(e) => setLocalFullName(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-secondary focus:bg-card"
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-username">Username</Label>
              <input
                id="admin-username"
                value={username}
                onChange={(e) => setLocalUsername(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-secondary focus:bg-card"
                placeholder="jane-doe"
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email Address</Label>
              <input
                id="admin-email"
                value={user?.email || ""}
                disabled
                aria-describedby="admin-email-hint"
                className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm font-medium text-muted-foreground outline-none"
              />
              <p id="admin-email-hint" className="text-xs text-muted-foreground">Contact a super admin to change your login email.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-phone">Phone Number</Label>
              <input
                id="admin-phone"
                value={phone}
                onChange={(e) => setLocalPhone(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-secondary focus:bg-card"
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="admin-city">City</Label>
              <input
                id="admin-city"
                value={city}
                onChange={(e) => setLocalCity(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-secondary focus:bg-card"
                placeholder="Mumbai"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-state">State</Label>
              <input
                id="admin-state"
                value={state}
                onChange={(e) => setLocalState(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-secondary focus:bg-card"
                placeholder="Maharashtra"
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="admin-country">Country</Label>
              <input
                id="admin-country"
                value={country}
                onChange={(e) => setLocalCountry(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-secondary focus:bg-card"
                placeholder="India"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-address">Address</Label>
              <input
                id="admin-address"
                value={address}
                onChange={(e) => setLocalAddress(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-secondary focus:bg-card"
                placeholder="Street address"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-bio">Bio</Label>
            <Textarea
              id="admin-bio"
              value={bio}
              onChange={(e) => setLocalBio(e.target.value)}
              rows={3}
              placeholder="A short line about yourself, visible to other admins."
              className="bg-muted/50"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={updateProfile.isPending}
              aria-busy={updateProfile.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {updateProfile.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      <ChangePasswordCard idPrefix="admin-password" />
    </div>
  );
}
