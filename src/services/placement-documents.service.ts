// Application documents (resume overrides, cover letters, ID proof). Reuses
// storage.service.ts's canonical upload pipeline against the existing private
// "students" bucket (folder = studentId) - the same bucket profile.service.ts
// already uses for avatars, and student_profiles.resume_file_id already uses
// for the default resume. No new bucket/edge function needed.
import type { Tables } from "@/types/database";
import { assertServiceResponse, getSupabaseClientOrThrow } from "./_shared";
import { uploadFile } from "./storage.service";

export type ApplicationDocument = Tables<"application_documents">;
export type DocumentType = ApplicationDocument["document_type"];

export async function uploadApplicationDocument(
  applicationId: string,
  studentId: string,
  file: File,
  documentType: DocumentType
): Promise<ApplicationDocument> {
  const uploaded = await uploadFile("students", file, studentId);
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("application_documents")
    .insert({
      application_id: applicationId,
      file_id: uploaded.fileId,
      document_type: documentType,
      uploaded_by: studentId,
    })
    .select("*")
    .single();
  assertServiceResponse(error);
  return data;
}

export async function listApplicationDocuments(applicationId: string): Promise<ApplicationDocument[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("application_documents")
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });
  assertServiceResponse(error);
  return data ?? [];
}

export async function deleteApplicationDocument(id: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("application_documents").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  assertServiceResponse(error);
}
