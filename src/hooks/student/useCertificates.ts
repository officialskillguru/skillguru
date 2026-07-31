import { useQuery } from "@tanstack/react-query";
import { certificateService } from "@/services/certificate.service";
import { useAuth } from "@/hooks/useAuth";

export function useCertificates(page: number = 1, limit: number = 10) {
  const { user } = useAuth();
  const studentId = user?.id;

  return useQuery({
    queryKey: ["certificates", studentId, page, limit],
    queryFn: async () => {
      if (!studentId) return null;
      const res = await certificateService.getStudentCertificates(studentId, { page, limit });
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!studentId,
  });
}

export function useCertificateDetails(id: string | undefined) {
  return useQuery({
    queryKey: ["certificate-details", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await certificateService.getCertificateWithDetails(id);
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCertificateVerification(hash: string) {
  return useQuery({
    queryKey: ["certificate-verification", hash],
    queryFn: async () => {
      if (!hash) return null;
      const res = await certificateService.verifyCertificate(hash);
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!hash,
  });
}
