import { createSlug } from "@/lib/slug";
import { publicEnv } from "@/lib/env";

import { assertServiceResponse, getSupabaseClientOrThrow } from "./_shared";

export const storageBuckets = {
  courses: publicEnv.VITE_STORAGE_COURSES,
  mentors: publicEnv.VITE_STORAGE_MENTORS,
  successStories: publicEnv.VITE_STORAGE_SUCCESS,
  admins: publicEnv.VITE_STORAGE_ADMINS,
  students: publicEnv.VITE_STORAGE_STUDENTS,
} as const;

export type StorageBucketKey = keyof typeof storageBuckets;

// Buckets that hold paid/private content - served via short-lived signed URLs
// rather than a permanent public URL.
const privateBuckets = new Set<StorageBucketKey>(["courses", "admins", "students"]);

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  // Document formats — added for mentor document management (resumes,
  // agreements) which commonly arrive as Word docs rather than PDF/images.
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export type UploadResult = {
  /** files.id - use this to link lessons.video_file_id / resources.file_id / profiles.avatar_file_id, etc. */
  fileId: string;
  bucket: string;
  path: string;
  /** Only set for public buckets (mentors, successStories). Private buckets require getSignedFileUrl(). */
  publicUrl: string | null;
};

export function assertAllowedUpload(file: File) {
  if (!allowedMimeTypes.has(file.type)) {
    throw new Error("Unsupported file type. Upload jpg, png, webp, pdf, mp4, webm, or mov files.");
  }
}

export async function uploadFile(bucketKey: StorageBucketKey, file: File, folder = ""): Promise<UploadResult> {
  assertAllowedUpload(file);

  const supabase = getSupabaseClientOrThrow();
  const bucket = storageBuckets[bucketKey];
  if (!bucket) throw new Error(`Bucket configuration not found for key: ${bucketKey}`);
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const fileName = `${Date.now()}-${createSlug(file.name.replace(/\.[^.]+$/, ""))}.${extension}`;
  // Slugify each folder segment independently and rejoin with "/" — running the
  // whole folder string (e.g. "<courseId>/gallery") through createSlug collapses
  // the "/" separator into "-", producing "<courseId>-gallery" which later broke
  // any code deriving a UUID from the path (see: gallery/FAQ UUID insert bug).
  const folderPath = folder
    ? folder
        .split("/")
        .filter(Boolean)
        .map((segment) => createSlug(segment))
        .join("/")
    : "";
  const path = [folderPath, fileName].filter(Boolean).join("/");

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  assertServiceResponse(uploadError);

  const isPublic = !privateBuckets.has(bucketKey);
  const publicUrl = isPublic ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl || null : null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: fileRow, error: registerError } = await supabase
    .from("files")
    .insert({
      original_name: file.name,
      stored_name: fileName,
      mime_type: file.type,
      size_bytes: file.size,
      bucket,
      object_key: path,
      storage_path: path,
      is_public: isPublic,
      virus_scan_status: "pending",
      uploaded_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (registerError || !fileRow) {
    // Roll back the storage object so we don't leak an unregistered file.
    await supabase.storage.from(bucket).remove([path]);
    throw new Error(registerError?.message ?? "Failed to register uploaded file.");
  }

  return {
    fileId: fileRow.id,
    bucket,
    path,
    publicUrl,
  };
}

/** Generates a short-lived signed URL for a file in a private bucket (courses/admins/students). */
export async function getSignedFileUrl(bucketKey: StorageBucketKey, path: string, expiresInSeconds = 3600): Promise<string> {
  const supabase = getSupabaseClientOrThrow();
  const bucket = storageBuckets[bucketKey];
  if (!bucket) throw new Error(`Bucket configuration not found for key: ${bucketKey}`);

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  assertServiceResponse(error);
  if (!data?.signedUrl) throw new Error("Failed to generate signed URL.");
  return data.signedUrl;
}

/**
 * Resolves any `files.id` to a playable/downloadable URL, regardless of which
 * logical bucket it was uploaded to - public files get their permanent public
 * URL, private files (e.g. course videos, gated behind RLS on `storage.objects`)
 * get a short-lived signed URL. Returns null if the file doesn't exist, or if
 * the caller's own Storage RLS policy rejects the signed-URL request (e.g. a
 * student with no active enrollment in the owning course).
 */
export async function resolveFileUrl(fileId: string, signedUrlTtlSeconds = 3600): Promise<string | null> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("files")
    .select("bucket, storage_path, is_public")
    .eq("id", fileId)
    .maybeSingle();
  if (error || !data) return null;

  if (data.is_public) {
    return supabase.storage.from(data.bucket).getPublicUrl(data.storage_path).data.publicUrl || null;
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(data.bucket)
    .createSignedUrl(data.storage_path, signedUrlTtlSeconds);
  if (signError || !signed?.signedUrl) return null;
  return signed.signedUrl;
}

export async function deleteFile(bucketKey: StorageBucketKey, path: string) {
  const supabase = getSupabaseClientOrThrow();
  const bucket = storageBuckets[bucketKey];
  if (!bucket) throw new Error(`Bucket configuration not found for key: ${bucketKey}`);
  const { error } = await supabase.storage.from(bucket).remove([path]);
  assertServiceResponse(error);
}
