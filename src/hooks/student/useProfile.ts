import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profileService } from "@/services/profile.service";
import { profilesService } from "@/services/profiles.service";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { UpdateProfileDto } from "@/domain/auth/dtos/UpdateProfileDto";

export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["auth-profile", userId],
    queryFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      const res = await profilesService.getProfile(userId);
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!userId,
  });

  const updateProfile = useMutation({
    mutationFn: async (data: UpdateProfileDto) => {
      if (!userId) throw new Error("Not authenticated");
      const res = await profileService.updateProfile(userId, data);
      if (!res.success) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      toast.success("Profile updated successfully");
      void queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update profile.");
    },
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      if (!userId) throw new Error("Not authenticated");
      const res = await profileService.uploadAvatar(userId, file);
      if (!res.success) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      toast.success("Avatar uploaded successfully"); void queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
    },
    onError: (err) => {
      toast.error(`Avatar upload failed: ${err.message}`);
    }
  });

  return {
    profile,
    isLoading,
    updateProfile,
    uploadAvatar
  };
}
