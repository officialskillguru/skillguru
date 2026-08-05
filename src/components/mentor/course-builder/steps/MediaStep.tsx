import { toast } from "sonner";
import { MediaUploadField } from "@/components/shared/MediaUploadField";
import { useCourseMediaMutations, useCourseMediaUrl } from "@/hooks/useMentorPortal";
import type { StepProps } from "@/components/mentor/course-builder/types";
import type { CourseMediaField } from "@/services/course-media.service";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

function MediaSlot({
  courseId,
  field,
  fileId,
  label,
  description,
  kind,
}: Readonly<{
  courseId: string;
  field: CourseMediaField;
  fileId: string | null;
  label: string;
  description: string;
  kind: "image" | "video";
}>) {
  const { data: previewUrl } = useCourseMediaUrl(fileId);
  const { replace, remove } = useCourseMediaMutations(courseId);

  return (
    <MediaUploadField
      label={label}
      description={description}
      kind={kind}
      accept={kind === "image" ? IMAGE_ACCEPT : VIDEO_ACCEPT}
      maxSizeBytes={kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES}
      previewUrl={previewUrl ?? null}
      isBusy={replace.isPending || remove.isPending}
      onUpload={async (file) => {
        try {
          await replace.mutateAsync({ field, file });
          toast.success(`${label} uploaded.`);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : `Failed to upload ${label.toLowerCase()}.`);
        }
      }}
      onRemove={async () => {
        try {
          await remove.mutateAsync(field);
          toast.success(`${label} removed.`);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : `Failed to remove ${label.toLowerCase()}.`);
        }
      }}
    />
  );
}

export function MediaStep({ course }: Readonly<StepProps>) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Course Media</h2>
        <p className="text-sm text-muted-foreground">Thumbnail and banner are shown on course cards and the course page. Promo video is optional.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <MediaSlot
          courseId={course.id}
          field="thumbnail_file_id"
          fileId={course.thumbnail_file_id}
          label="Thumbnail"
          description="Required. Shown on course cards. Square or 4:3 works best."
          kind="image"
        />
        <MediaSlot
          courseId={course.id}
          field="banner_file_id"
          fileId={course.banner_file_id}
          label="Banner"
          description="Optional. Wide banner shown on the course detail page."
          kind="image"
        />
      </div>

      <MediaSlot
        courseId={course.id}
        field="promo_video_file_id"
        fileId={course.promo_video_file_id}
        label="Promo video"
        description="Optional. A short preview video shown to prospective students."
        kind="video"
      />
    </div>
  );
}
