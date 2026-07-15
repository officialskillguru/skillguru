import { useState } from "react";
import { User, Mail, Camera } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/student/useProfile";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const { profile, updateProfile, uploadAvatar } = useProfile();
  
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
      uploadAvatar.mutate(file);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-foreground">Profile Settings</h2>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-6 border-b border-slate-100 pb-6">
          <div className="relative">
            <div className="grid size-24 place-items-center overflow-hidden rounded-full border-2 border-slate-100 bg-slate-50 text-slate-300">
              {profile.avatarFileId ? (
                <img 
                  src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatarFileId}`}
                  alt={profile?.fullName || "Avatar"}
                  className="size-full object-cover"
                />
              ) : (
                <User className="size-10" />
              )}
            </div>
            <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 grid size-8 cursor-pointer place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50">
              <Camera className="size-4" />
              <input type="file" id="avatar-upload" className="sr-only" accept="image/*" onChange={handleAvatarChange} disabled={uploadAvatar.isPending} />
            </label>
          </div>
          <div>
            <h3 className="text-lg font-black">{profile.fullName || "Update your name"}</h3>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-6 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-bold text-slate-700">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setLocalFullName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium outline-none focus:border-secondary focus:bg-white"
                  placeholder="Enter full name"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-bold text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-bold text-slate-700">Phone Number</label>
            <input
              id="phone"
              value={phone}
              onChange={(e) => setLocalPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium outline-none focus:border-secondary focus:bg-white"
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={updateProfile.isPending}
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
