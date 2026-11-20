import { toast } from "sonner";
import { buildResumeFileName, getResumePdfUrl } from "@/services/resumes.service";

/** Downloads a stored PDF through a short-lived signed URL with a clean file name. */
export async function downloadResumePdf(path: string, fullName: string, targetRole: string | null) {
  try {
    const url = await getResumePdfUrl(path, buildResumeFileName(fullName, targetRole));
    window.location.assign(url);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "The PDF could not be downloaded.");
  }
}
