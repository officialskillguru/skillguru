import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useCheckEnrollment(courseSlug: string) {
  const { user } = useAuth();
  const studentId = user?.id;

  return useQuery({
    queryKey: ["check-enrollment-by-slug", studentId, courseSlug],
    queryFn: async () => {
      if (!studentId || !courseSlug) return { isEnrolled: false, courseId: null };
      
      // Get the course id by slug
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("id")
        .eq("slug", courseSlug)
        .maybeSingle();
        
      if (courseError || !courseData) {
        return { isEnrolled: false, courseId: null };
      }

      const { data, error } = await supabase
        .from("enrollments")
        .select("id")
        .eq("student_id", studentId)
        .eq("course_id", courseData.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking enrollment:", error);
        return { isEnrolled: false, courseId: courseData.id };
      }
      
      return { isEnrolled: !!data, courseId: courseData.id };
    },
    enabled: !!studentId && !!courseSlug,
  });
}
