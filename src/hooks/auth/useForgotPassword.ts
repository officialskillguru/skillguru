import { useMutation } from "@tanstack/react-query";
import { AuthService } from "@/services/auth.service";
import { AuthRepository } from "@/repositories/auth.repository";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

const authService = new AuthService(new AuthRepository(supabase));

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const result = await authService.resetPassword(email);
      if (!result.success) throw result.error;
    },
    onSuccess: () => {
      toast.success("Password reset instructions have been sent to your email.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });
}
