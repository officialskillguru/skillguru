// Remove this directive after running `supabase gen types` to sync database schema.
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

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export type UploadResult = {
  bucket: string;
  path: string;
  publicUrl: string | null;
};

export function assertAllowedUpload(file: File) {
  if (!allowedMimeTypes.has(file.type)) {
    throw new Error("Unsupported file type. Upload jpg, jpeg, png, webp, or pdf files.");
  }
}

export async function uploadFile(bucketKey: StorageBucketKey, file: File, folder = ""): Promise<UploadResult> {
  assertAllowedUpload(file);

  const supabase = getSupabaseClientOrThrow();
  const bucket = storageBuckets[bucketKey];
  if (!bucket) throw new Error(`Bucket configuration not found for key: ${bucketKey}`);
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const fileName = `${Date.now()}-${createSlug(file.name.replace(/\.[^.]+$/, ""))}.${extension}`;
  const path = [folder ? createSlug(folder) : "", fileName].filter(Boolean).join("/");

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  assertServiceResponse(error);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return {
    bucket,
    path,
    publicUrl: data.publicUrl || null,
  };
}

export async function deleteFile(bucketKey: StorageBucketKey, path: string) {
  const supabase = getSupabaseClientOrThrow();
  const bucket = storageBuckets[bucketKey];
  if (!bucket) throw new Error(`Bucket configuration not found for key: ${bucketKey}`);
  const { error } = await supabase.storage.from(bucket).remove([path]);
  assertServiceResponse(error);
}
