import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuth } from "@/hooks/useAuth";
import { getSupabaseClientOrThrow } from "@/services/_shared";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileRow {
  full_name: string | null;
  phone: string | null;
  bio: string | null;
  email: string;
}

function initials(name: string | null | undefined) {
  const source = name?.trim();
  if (!source) return "?";
  const parts = source.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

async function fetchOwnProfile(userId: string): Promise<ProfileRow | null> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("profiles").select("full_name, phone, bio, email").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export default function CounsellorProfilePage() {
  usePageMeta("My Profile");
  const auth = useAuth();
  const userId = auth.authUser?.profile?.id;

  const { data: profile, isLoading } = useQuery({
    queryKey: ["counsellor-own-profile", userId],
    queryFn: () => fetchOwnProfile(userId!),
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="max-w-lg space-y-4">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your Counsellor account details.</p>
      </div>

      {profile && userId && <ProfileForm key={userId} userId={userId} profile={profile} />}
    </div>
  );
}

// Keyed on userId by the parent so its local form state initializes fresh
// from the fetched profile exactly once, without needing a
// useEffect+setState synchronization (which cascades an extra render).
function ProfileForm({ userId, profile }: Readonly<{ userId: string; profile: ProfileRow }>) {
  const [form, setForm] = useState({
    full_name: profile.full_name ?? "",
    phone: profile.phone ?? "",
    bio: profile.bio ?? "",
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const supabase = getSupabaseClientOrThrow();
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: form.full_name.trim(), phone: form.phone || null, bio: form.bio || null })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => toast.success("Profile updated. Refresh to see this reflected across the portal."),
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Failed to update profile."),
  });

  return (
    <>
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          <AvatarFallback className="text-lg">{initials(form.full_name)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-foreground">{form.full_name || "—"}</p>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <label htmlFor="cp-name" className="text-sm font-semibold text-foreground">Full Name</label>
          <Input id="cp-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cp-phone" className="text-sm font-semibold text-foreground">Phone</label>
          <Input id="cp-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cp-bio" className="text-sm font-semibold text-foreground">Bio</label>
          <Textarea id="cp-bio" rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </div>
        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </form>
    </>
  );
}
