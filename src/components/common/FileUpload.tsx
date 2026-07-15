import { Upload, X } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { uploadFile, type StorageBucketKey, type UploadResult } from "@/services/storage.service";

type FileUploadProps = {
  bucket: StorageBucketKey;
  folder?: string;
  label: string;
  value?: string | null;
  onUploaded: (result: UploadResult) => void;
  onClear?: () => void;
};

export function FileUpload({ bucket, folder, label, value, onUploaded, onClear }: Readonly<FileUploadProps>) {
  const inputId = useId();
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
      toast.success("File uploaded successfully.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "File upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-xs font-black text-primary dark:text-slate-300">
        {label}
      </label>
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-muted p-3 dark:border-slate-800 dark:bg-slate-900">
        <label
          htmlFor={inputId}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-xs font-black text-white dark:bg-cyan-400 dark:text-primary"
        >
          <Upload className="size-4" />
          <span>{uploading ? "Uploading..." : "Choose File"}</span>
        </label>
        <input
          id={inputId}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          disabled={uploading}
          onChange={(event) => void handleFileChange(event)}
          className="sr-only"
        />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-500">
          {value ?? "jpg, jpeg, png, webp, or pdf"}
        </span>
        {value && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-white hover:text-rose-500 dark:hover:bg-slate-950"
            aria-label="Clear uploaded file"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
