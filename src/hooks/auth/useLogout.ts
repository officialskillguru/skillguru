import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthService } from "@/services/auth.service";
import { AuthRepository } from "@/repositories/auth.repository";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useAuthContext } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { routes } from "@/lib/routes";

const authService = new AuthService(new AuthRepository(supabase));

export function useLogout() {
  const queryClient = useQueryClient();
  const { dispatch } = useAuthContext();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      const result = await authService.logout();
      if (!result.success) throw result.error;
    },
    onSuccess: () => {
      dispatch({ type: "LOGOUT" });
      void queryClient.clear();
      void navigate(routes.login);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });
}
