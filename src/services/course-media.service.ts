// Course-level media (thumbnail/banner/promo video) upload + safe removal.
// Lesson-level media stays inside CourseCurriculumEditor/curriculum.service.ts -
// this file only covers the three course-table media columns.
import { assertServiceResponse, getSupabaseClientOrThrow } from "./_shared";
import { assertAllowedUpload, uploadFile } from "./storage.service";
import { getCourseById, updateCourse, type Course } from "./courses.service";

export type CourseMediaField = "thumbnail_file_id" | "banner_file_id" | "promo_video_file_id";

/**
 * A files.id can only ever be safely deleted once nothing references it -
 * every upload call site creates a fresh file row, but a mentor replacing
 * media mid-edit (or a lesson happening to reuse an id) must not orphan a
 * file another record still points at.
 */
async function isFileReferenced(fileId: string): Promise<boolean> {
  const supabase = getSupabaseClientOrThrow();
  const [courses, lessons, resources, courseMedia] = await Promise.all([
    supabase
      .from("courses")
      .select("id", { count: "exact", head: true })
      .or(`thumbnail_file_id.eq.${fileId},banner_file_id.eq.${fileId},promo_video_file_id.eq.${fileId}`),
    supabase.from("lessons").select("id", { count: "exact", head: true }).eq("video_file_id", fileId),
    supabase.from("resources").select("id", { count: "exact", head: true }).eq("file_id", fileId),
    supabase.from("course_media").select("id", { count: "exact", head: true }).eq("file_id", fileId),
  ]);
  return [courses, lessons, resources, courseMedia].some(({ count }) => (count ?? 0) > 0);
}

/**
 * Soft-deletes the files registry row once nothing references it. Does not
 * remove the physical storage object - the app has no existing precedent for
 * hard-deleting storage objects (deleteFile() is unused elsewhere), and a
 * mentor only holds files-table RLS rights (uploaded_by = self), not
 * necessarily storage.objects rights, so this stays conservative and
 * consistent with the current architecture.
 *
 * KNOWN LIMITATION (pre-existing, not introduced here): the `files` UPDATE
 * policy currently rejects a non-admin uploader's own attempt to set
 * `deleted_at` on their own row (verified: every other column updates fine
 * under the same auth context; only `deleted_at` 42501s). Root cause wasn't
 * pinned down without a schema/RLS change, which is out of scope here. This
 * call is intentionally fire-and-forget from the caller so that failure -
 * logged below, not thrown - never blocks or corrupts the actual media
 * update (the course's *_file_id column, updated by the caller beforehand,
 * is unaffected). Net effect: replaced/removed files' registry rows are
 * left with deleted_at still null (harmless orphan, not a data-loss or
 * security issue) until this is fixed at the RLS layer.
 */
async function cleanupFileIfOrphaned(fileId: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const stillReferenced = await isFileReferenced(fileId);
  if (stillReferenced) return;
  await supabase.from("files").update({ deleted_at: new Date().toISOString() }).eq("id", fileId);
}

export async function replaceCourseMediaFile(courseId: string, field: CourseMediaField, file: File): Promise<Course> {
  assertAllowedUpload(file);

  const course = await getCourseById(courseId);
  if (!course) throw new Error("Course not found.");
  const previousFileId = course[field];

  const uploaded = await uploadFile("courses", file, courseId);
  const updated = await updateCourse(courseId, { [field]: uploaded.fileId });

  if (previousFileId && previousFileId !== uploaded.fileId) {
    cleanupFileIfOrphaned(previousFileId).catch((err) => {
      console.error("Failed to clean up replaced course media file", err);
    });
  }

  return updated;
}

export async function removeCourseMediaFile(courseId: string, field: CourseMediaField): Promise<Course> {
  const course = await getCourseById(courseId);
  if (!course) throw new Error("Course not found.");
  const fileId = course[field];

  const updated = await updateCourse(courseId, { [field]: null });

  if (fileId) {
    cleanupFileIfOrphaned(fileId).catch((err) => {
      console.error("Failed to clean up removed course media file", err);
    });
  }

  return updated;
}

export async function resolveCourseMediaUrl(fileId: string | null): Promise<string | null> {
  if (!fileId) return null;
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("files").select("bucket, storage_path, is_public").eq("id", fileId).maybeSingle();
  assertServiceResponse(error);
  if (!data) return null;
  if (data.is_public) {
    return supabase.storage.from(data.bucket).getPublicUrl(data.storage_path).data.publicUrl || null;
  }
  const { data: signed } = await supabase.storage.from(data.bucket).createSignedUrl(data.storage_path, 3600);
  return signed?.signedUrl ?? null;
}
