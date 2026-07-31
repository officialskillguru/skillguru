import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { Inserts, Updates } from "@/types/database";
import {
  getResumeProfile,
  updateResumeContact,
  updateResumeEducation,
  listResumeExperience,
  createResumeExperience,
  updateResumeExperience,
  deleteResumeExperience,
  listResumeProjects,
  createResumeProject,
  updateResumeProject,
  deleteResumeProject,
  listResumeCertifications,
  createResumeCertification,
  updateResumeCertification,
  deleteResumeCertification,
  listResumeAchievements,
  createResumeAchievement,
  updateResumeAchievement,
  deleteResumeAchievement,
} from "@/services/resume.service";

const resumeKeys = {
  profile: (studentId: string) => ["resume", "profile", studentId] as const,
  experience: (studentId: string) => ["resume", "experience", studentId] as const,
  projects: (studentId: string) => ["resume", "projects", studentId] as const,
  certifications: (studentId: string) => ["resume", "certifications", studentId] as const,
  achievements: (studentId: string) => ["resume", "achievements", studentId] as const,
};

export function useResumeProfile() {
  const { user } = useAuth();
  const studentId = user?.id;
  return useQuery({
    queryKey: resumeKeys.profile(studentId ?? ""),
    queryFn: () => getResumeProfile(studentId ?? ""),
    enabled: !!studentId,
  });
}

export function useUpdateResumeContact() {
  const { user } = useAuth();
  const studentId = user?.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Updates<"profiles">) => updateResumeContact(studentId ?? "", patch),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: resumeKeys.profile(studentId ?? "") }),
  });
}

export function useUpdateResumeEducation() {
  const { user } = useAuth();
  const studentId = user?.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Parameters<typeof updateResumeEducation>[1]) => updateResumeEducation(studentId ?? "", patch),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: resumeKeys.profile(studentId ?? "") }),
  });
}

function useResumeListSection<T>(
  section: "experience" | "projects" | "certifications" | "achievements",
  list: (studentId: string) => Promise<T[]>
) {
  const { user } = useAuth();
  const studentId = user?.id;
  return useQuery({
    queryKey: resumeKeys[section](studentId ?? ""),
    queryFn: () => list(studentId ?? ""),
    enabled: !!studentId,
  });
}

export function useResumeExperience() {
  return useResumeListSection("experience", listResumeExperience);
}
export function useResumeProjects() {
  return useResumeListSection("projects", listResumeProjects);
}
export function useResumeCertifications() {
  return useResumeListSection("certifications", listResumeCertifications);
}
export function useResumeAchievements() {
  return useResumeListSection("achievements", listResumeAchievements);
}

export function useResumeExperienceMutations() {
  const { user } = useAuth();
  const studentId = user?.id;
  const queryClient = useQueryClient();
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: resumeKeys.experience(studentId ?? "") });
  return {
    create: useMutation({ mutationFn: (input: Omit<Inserts<"resume_experience">, "student_id">) => createResumeExperience({ ...input, student_id: studentId ?? "" }), onSuccess: invalidate }),
    update: useMutation({ mutationFn: (input: { id: string; patch: Updates<"resume_experience"> }) => updateResumeExperience(input.id, input.patch), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: string) => deleteResumeExperience(id), onSuccess: invalidate }),
  };
}

export function useResumeProjectMutations() {
  const { user } = useAuth();
  const studentId = user?.id;
  const queryClient = useQueryClient();
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: resumeKeys.projects(studentId ?? "") });
  return {
    create: useMutation({ mutationFn: (input: Omit<Inserts<"resume_projects">, "student_id">) => createResumeProject({ ...input, student_id: studentId ?? "" }), onSuccess: invalidate }),
    update: useMutation({ mutationFn: (input: { id: string; patch: Updates<"resume_projects"> }) => updateResumeProject(input.id, input.patch), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: string) => deleteResumeProject(id), onSuccess: invalidate }),
  };
}

export function useResumeCertificationMutations() {
  const { user } = useAuth();
  const studentId = user?.id;
  const queryClient = useQueryClient();
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: resumeKeys.certifications(studentId ?? "") });
  return {
    create: useMutation({ mutationFn: (input: Omit<Inserts<"resume_certifications">, "student_id">) => createResumeCertification({ ...input, student_id: studentId ?? "" }), onSuccess: invalidate }),
    update: useMutation({ mutationFn: (input: { id: string; patch: Updates<"resume_certifications"> }) => updateResumeCertification(input.id, input.patch), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: string) => deleteResumeCertification(id), onSuccess: invalidate }),
  };
}

export function useResumeAchievementMutations() {
  const { user } = useAuth();
  const studentId = user?.id;
  const queryClient = useQueryClient();
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: resumeKeys.achievements(studentId ?? "") });
  return {
    create: useMutation({ mutationFn: (input: Omit<Inserts<"resume_achievements">, "student_id">) => createResumeAchievement({ ...input, student_id: studentId ?? "" }), onSuccess: invalidate }),
    update: useMutation({ mutationFn: (input: { id: string; patch: Updates<"resume_achievements"> }) => updateResumeAchievement(input.id, input.patch), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: string) => deleteResumeAchievement(id), onSuccess: invalidate }),
  };
}
