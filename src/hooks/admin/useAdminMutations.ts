import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getExtendedSupabaseClient } from "@/services/_shared";
import { createSlug } from "@/lib/slug";
import type { Json } from "@/types/database";

async function logAudit(action: string, entityType: string, details: Json) {
  try {
    const supabase = getExtendedSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      actor_id: user?.id ?? null,
      action,
      entity_type: entityType,
      new_values: details,
    });
  } catch {
    // Audit log failure should never block the main operation
    console.warn("[Audit] Failed to log:", action, entityType);
  }
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; category: string; price: number }) => {
      const supabase = getExtendedSupabaseClient();
      const slug = createSlug(data.title);

      // Fetch an admin user to temporarily assign as mentor (until a proper mentor picker exists)
      const { data: adminRole } = await supabase.from("roles").select("id").eq("code", "admin").single();
      const { data: adminUser } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role_id", adminRole?.id ?? "")
        .limit(1)
        .single();

      const { error } = await supabase.from("courses").insert({
        title: data.title,
        slug,
        price: data.price,
        mentor_id: adminUser?.user_id ?? "",
      });

      if (error) throw error;
      await logAudit("created", "course", data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard", "metrics"] });
      toast.success("Course created successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create course: ${error.message}`);
    },
  });
}

export function useCreateSuccessStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { studentName: string; company: string; package: string }) => {
      const supabase = getExtendedSupabaseClient();

      const { error } = await supabase.from("success_stories").insert({
        title: `${data.studentName} placed at ${data.company}`,
        company_name: data.company,
        package: data.package,
        full_story: "Generated from Quick Actions.",
        published: true,
      });

      if (error) throw new Error(String(error.message));
      await logAudit("created", "success_story", data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard", "metrics"] });
      toast.success("Success story added!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add story: ${error.message}`);
    },
  });
}
