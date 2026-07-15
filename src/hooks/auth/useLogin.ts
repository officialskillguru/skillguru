import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthService } from "@/services/auth.service";
import { AuthRepository } from "@/repositories/auth.repository";
import { supabase } from "@/lib/supabase/client";
import type { LoginFormData } from "@/schemas/auth.schema";
import { toast } from "sonner";


const authService = new AuthService(new AuthRepository(supabase));

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginFormData) => {
      // Could dispatch { type: "SET_LOADING", payload: "LOGIN_LOADING" } if added to reducer
      const result = await authService.login(credentials);
      if (!result.success) {
        throw result.error;
      }
      return result.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });
}
