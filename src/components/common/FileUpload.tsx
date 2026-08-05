import { Upload, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";

import { uploadFile, type StorageBucketKey, type UploadResult } from "@/services/storage.service";

type FileUploadProps = {
  bucket: StorageBucketKey;
  folder?: string;
  label: string;
  /** Overrides the default image/PDF-only accept list — pass a video or document MIME/extension list for those upload targets. */
  accept?: string;
  /** Text shown next to the picker when nothing has been uploaded yet, e.g. "mp4, webm, or mov". Defaults to the image/PDF hint. */
  hint?: string;
  value?: string | null;
  onUploaded: (result: UploadResult) => void;
  onClear?: () => void;
};

export function FileUpload({ bucket, folder, label, accept, hint, value, onUploaded, onClear }: Readonly<FileUploadProps>) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploading(true);
    try {
      const result = await uploadFile(bucket, file, folder);
      onUploaded(result);
      toast.success(`${label} uploaded successfully.`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "File upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const statusText = uploading ? "Uploading…" : value ? "Uploaded" : null;

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-xs font-black text-primary dark:text-slate-300">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-dashed border-slate-300 bg-muted p-3 dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-70 dark:bg-cyan-400 dark:text-primary"
        >
          <Upload className="size-4" aria-hidden="true" />
          <span>{uploading ? "Uploading..." : "Choose File"}</span>
        </button>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept ?? ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"}
          disabled={uploading}
          onChange={(event) => void handleFileChange(event)}
          className="sr-only"
        />
        {(value && onClear) ? (
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-500">{value}</span>
            <button
              type="button"
              onClick={onClear}
              className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-white hover:text-rose-500 dark:hover:bg-slate-950"
              aria-label="Clear uploaded file"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <span className="min-w-0 flex-1 basis-full text-xs font-semibold text-slate-500 sm:basis-auto">
            {value ?? hint ?? "jpg, jpeg, png, webp, or pdf"}
          </span>
        )}
        <span role="status" aria-live="polite" className="sr-only">
          {statusText ? `${label}: ${statusText}` : ""}
        </span>
      </div>
    </div>
  );
}
