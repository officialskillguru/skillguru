import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { listMentors } from "@/services/mentors.service";
type MentorListParams = unknown;
import { supabase } from "@/lib/supabase/client";

export function useAdminMentors(params: MentorListParams) {
  return useQuery({
    queryKey: ["admin_mentors", params],
    queryFn: async () => {
      return await listMentors(params as Parameters<typeof listMentors>[0]);
    },
    placeholderData: keepPreviousData,
  });
}

export function useBulkUpdateMentorStatus() { return useMutation({ mutationFn: async (vars: unknown) => true }); }
