import { useQuery } from "@tanstack/react-query";
import { profilesService } from "@/services/profiles.service";

export const useProfile = (id: string | undefined) => {
  return useQuery({
    queryKey: ["profile", id],
    queryFn: () => {
      if (!id) throw new Error("Profile ID is required");
      return profilesService.getProfile(id);
    },
    enabled: !!id,
  });
};
