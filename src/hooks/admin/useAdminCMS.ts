import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cmsService } from "@/services/cms.service";

export function useAdminCMSSetting<T>(key: string) {
  return useQuery({
    queryKey: ["cms_setting", key],
    queryFn: async () => {
      const res = await cmsService.getSetting<T>(key);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    }
  });
}

export function useSaveAdminCMSSetting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string | number | boolean | object | null }) => {
      const res = await cmsService.setSetting(key, value);
      if (!res.success) throw new Error(res.error.message);
      return true;
    },
    onSuccess: (_, { key }) => {
      void queryClient.invalidateQueries({ queryKey: ["cms_setting", key] });
    }
  });
}
