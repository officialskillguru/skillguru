import { useMutation } from "@tanstack/react-query";
import { AuthService } from "@/services/auth.service";
import { AuthRepository } from "@/repositories/auth.repository";
import { supabase } from "@/lib/supabase/client";
import type { SignupFormData } from "@/schemas/auth.schema";
import { toast } from "sonner";

const authService = new AuthService(new AuthRepository(supabase));

export function useSignup() {
  return useMutation({
    mutationFn: async (credentials: SignupFormData) => {
      const result = await authService.signup(credentials);
      if (!result.success) {
        throw result.error;
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success("Account created successfully. Please check your email.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });
}
