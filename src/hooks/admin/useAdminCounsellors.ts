import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listCounsellors,
  getCounsellor,
  createCounsellor,
  updateCounsellor,
  lockCounsellor,
  unlockCounsellor,
  softDeleteCounsellor,
  restoreCounsellor,
  setCounsellorPassword,
  forceCounsellorPasswordChange,
  forceCounsellorLogout,
  changeCounsellorEmail,
  listCounsellorLoginHistory,
  listCounsellorActiveSessions,
  type CounsellorListParams,
  type CounsellorFullUpdateInput,
} from "@/services/counsellors.service";

const keys = {
  list: (params: CounsellorListParams) => ["admin-counsellors", params],
  detail: (id: string) => ["admin-counsellors", "detail", id],
};

export function useAdminCounsellors(params: CounsellorListParams) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: () => listCounsellors(params),
  });
}

export function useAdminCounsellor(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: keys.detail(id ?? ""),
    queryFn: () => getCounsellor(id!),
    enabled: enabled && !!id,
  });
}

export function useCounsellorMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["admin-counsellors"] });

  const create = useMutation({
    mutationFn: createCounsellor,
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CounsellorFullUpdateInput }) => updateCounsellor(id, input),
    onSuccess: invalidate,
  });

  const lock = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => lockCounsellor(id, reason),
    onSuccess: invalidate,
  });

  const unlock = useMutation({
    mutationFn: (id: string) => unlockCounsellor(id),
    onSuccess: invalidate,
  });

  const softDelete = useMutation({
    mutationFn: (id: string) => softDeleteCounsellor(id),
    onSuccess: invalidate,
  });

  const restore = useMutation({
    mutationFn: (id: string) => restoreCounsellor(id),
    onSuccess: invalidate,
  });

  const setPassword = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => setCounsellorPassword(id, password),
  });

  const forcePasswordChange = useMutation({
    mutationFn: (id: string) => forceCounsellorPasswordChange(id),
  });

  const forceLogout = useMutation({
    mutationFn: (id: string) => forceCounsellorLogout(id),
  });

  const changeEmail = useMutation({
    mutationFn: ({ id, newEmail }: { id: string; newEmail: string }) => changeCounsellorEmail(id, newEmail),
    onSuccess: invalidate,
  });

  return { create, update, lock, unlock, softDelete, restore, setPassword, forcePasswordChange, forceLogout, changeEmail };
}

export function useCounsellorLoginHistory(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["admin-counsellor-login-history", id],
    queryFn: () => listCounsellorLoginHistory(id!),
    enabled: enabled && !!id,
  });
}

export function useCounsellorActiveSessions(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["admin-counsellor-active-sessions", id],
    queryFn: () => listCounsellorActiveSessions(id!),
    enabled: enabled && !!id,
  });
}
