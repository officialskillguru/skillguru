import { useId, useRef, useState } from "react";
import { AlertCircle, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export type MediaUploadKind = "image" | "video";

interface MediaUploadFieldProps {
  label: string;
  description?: string;
  kind: MediaUploadKind;
  accept: string;
  maxSizeBytes: number;
  previewUrl: string | null;
  isBusy: boolean;
  onUpload: (file: File) => void | Promise<void>;
  onRemove: () => void | Promise<void>;
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
  return `${Math.round(bytes / 1024)}KB`;
}

export function MediaUploadField({
  label,
  description,
  kind,
  accept,
  maxSizeBytes,
  previewUrl,
  isBusy,
  onUpload,
  onRemove,
}: Readonly<MediaUploadFieldProps>) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const acceptedTypes = accept.split(",").map((t) => t.trim());

  const validateAndUpload = (file: File | undefined) => {
    if (!file) return;
    setLocalError(null);

    if (!acceptedTypes.includes(file.type)) {
      setLocalError(`Unsupported file type. Expected ${kind === "image" ? "an image (jpg/png/webp)" : "a video (mp4/webm/mov)"}.`);
      return;
    }
    if (file.size > maxSizeBytes) {
      setLocalError(`File is too large. Maximum size is ${formatSize(maxSizeBytes)}.`);
      return;
    }

    void onUpload(file);
  };

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>

      <div
        className={[
          "relative flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-4 text-center transition-colors",
          dragActive ? "border-secondary bg-secondary/5" : "border-border",
        ].join(" ")}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          validateAndUpload(e.dataTransfer.files[0]);
        }}
      >
        {previewUrl ? (
          <div className="relative w-full">
            {kind === "image" ? (
              <img src={previewUrl} alt={`${label} preview`} className="mx-auto max-h-40 rounded-md object-contain" />
            ) : (
              <video src={previewUrl} controls className="mx-auto max-h-40 w-full rounded-md" aria-label={`${label} preview`} />
            )}
          </div>
        ) : (
          <>
            <Upload className="size-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-xs font-medium text-muted-foreground">Drag and drop, or</p>
          </>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={accept}
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
            onChange={(e) => {
              validateAndUpload(e.target.files?.[0]);
              // Reset so re-selecting the exact same file (e.g. Replace with
              // an identical filename) still fires a change event.
              e.target.value = "";
            }}
            disabled={isBusy}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isBusy}
            onClick={() => inputRef.current?.click()}
            aria-label={`${previewUrl ? "Replace" : "Choose"} ${label.toLowerCase()} file`}
            className="gap-1.5"
          >
            {isBusy ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Upload className="size-3.5" aria-hidden="true" />}
            {previewUrl ? "Replace" : "Choose file"}
          </Button>
          {previewUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={() => void onRemove()}
              aria-label={`Remove ${label.toLowerCase()}`}
              className="gap-1.5 text-destructive-text hover:text-destructive-text"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Remove
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">Max {formatSize(maxSizeBytes)}</p>
      </div>

      {localError && (
        <p role="alert" className="flex items-center gap-1.5 text-xs font-semibold text-destructive-text">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          {localError}
        </p>
      )}
    </div>
  );
}
