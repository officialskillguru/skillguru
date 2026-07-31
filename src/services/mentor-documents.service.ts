import { assertServiceResponse, getSupabaseClientOrThrow } from "./_shared";
import { uploadFile, resolveFileUrl } from "./storage.service";
import type { Tables } from "@/types/database";

export type MentorDocumentType = "resume" | "certificate" | "agreement" | "identity" | "portfolio" | "other";

export const MENTOR_DOCUMENT_TYPE_LABELS: Record<MentorDocumentType, string> = {
  resume: "Resume",
  certificate: "Certificate",
  agreement: "Agreement",
  identity: "Identity Document",
  portfolio: "Portfolio",
  other: "Other",
};

export type MentorDocument = Tables<"mentor_documents"> & {
  file?: { original_name: string; size_bytes: number; mime_type: string } | null;
  uploader?: { full_name: string } | null;
};

/** All versions across all document types for a mentor, newest first — the UI groups these by document_type to show version history. */
export async function listMentorDocuments(mentorId: string): Promise<MentorDocument[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("mentor_documents")
    .select("*, file:files(original_name, size_bytes, mime_type), uploader:profiles!mentor_documents_uploaded_by_fkey(full_name)")
    .eq("mentor_id", mentorId)
    .is("deleted_at", null)
    .order("document_type", { ascending: true })
    .order("version", { ascending: false });
  assertServiceResponse(error);
  return data ?? [];
}

/** Uploads a new document, automatically becoming the new "current" version of its type (previous versions are kept, not deleted, for version history). */
export async function uploadMentorDocument(mentorId: string, documentType: MentorDocumentType, file: File, notes?: string): Promise<MentorDocument> {
  const supabase = getSupabaseClientOrThrow();

  const { data: existing } = await supabase
    .from("mentor_documents")
    .select("version")
    .eq("mentor_id", mentorId)
    .eq("document_type", documentType)
    .is("deleted_at", null)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersion = (existing?.version ?? 0) + 1;

  const uploadResult = await uploadFile("admins", file, `mentor-documents/${mentorId}`);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (nextVersion > 1) {
    await supabase
      .from("mentor_documents")
      .update({ is_current: false })
      .eq("mentor_id", mentorId)
      .eq("document_type", documentType)
      .eq("is_current", true);
  }

  const { data, error } = await supabase
    .from("mentor_documents")
    .insert({
      mentor_id: mentorId,
      file_id: uploadResult.fileId,
      document_type: documentType,
      version: nextVersion,
      is_current: true,
      uploaded_by: user?.id ?? null,
      notes: notes ?? null,
    })
    .select("*, file:files(original_name, size_bytes, mime_type), uploader:profiles!mentor_documents_uploaded_by_fkey(full_name)")
    .single();
  assertServiceResponse(error);
  if (!data) throw new Error("Document upload failed.");
  await supabase.rpc("log_audit_event", {
    p_action: "mentor_document_uploaded",
    p_entity_type: "mentor_profile",
    p_entity_id: mentorId,
    p_new_values: { document_type: documentType, version: nextVersion },
  });
  return data;
}

/** Soft-deletes a single document version (e.g. remove an incorrectly-uploaded file); does not affect sibling versions. */
export async function deleteMentorDocument(documentId: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { data: doc } = await supabase.from("mentor_documents").select("mentor_id, document_type, version").eq("id", documentId).maybeSingle();
  const { error } = await supabase.from("mentor_documents").update({ deleted_at: new Date().toISOString() }).eq("id", documentId);
  assertServiceResponse(error);
  if (doc) {
    await supabase.rpc("log_audit_event", {
      p_action: "mentor_document_deleted",
      p_entity_type: "mentor_profile",
      p_entity_id: doc.mentor_id,
      p_old_values: { document_type: doc.document_type, version: doc.version },
    });
  }
}

export async function getMentorDocumentUrl(fileId: string): Promise<string | null> {
  return resolveFileUrl(fileId);
}
