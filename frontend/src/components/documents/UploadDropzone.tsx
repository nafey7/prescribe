import { useCallback, useState } from "react";
import { Upload } from "lucide-react";

const ACCEPT =
  "application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png";

export const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const MAX_BYTES: Record<string, number> = {
  "application/pdf": 10 * 1024 * 1024,
  "image/jpeg": 5 * 1024 * 1024,
  "image/png": 5 * 1024 * 1024,
};

export function validateClientFile(file: File): string | null {
  const t = file.type.split(";")[0].trim().toLowerCase();
  if (!ALLOWED_TYPES.has(t)) {
    return "Only PDF, JPEG, and PNG files are allowed.";
  }
  const max = MAX_BYTES[t];
  if (file.size > max) {
    const mb = max / (1024 * 1024);
    return `File is too large (max ${mb} MB for this type).`;
  }
  if (file.size === 0) {
    return "File is empty.";
  }
  return null;
}

interface Props {
  file: File | null;
  onFile: (file: File | null) => void;
  error: string | null;
  disabled?: boolean;
}

export default function UploadDropzone({
  file,
  onFile,
  error,
  disabled,
}: Props) {
  const [drag, setDrag] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list?.length) return;
      const f = list[0];
      const err = validateClientFile(f);
      if (err) {
        onFile(null);
        setLocalErr(err);
        return;
      }
      setLocalErr(null);
      onFile(f);
    },
    [onFile]
  );

  const combinedError = error || localErr;

  return (
    <div>
      <label
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors cursor-pointer ${
          drag
            ? "border-emerald-500 bg-emerald-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400"
        } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <Upload className="text-gray-400" size={28} />
        <span className="text-sm text-gray-700">
          Drag a file here or{" "}
          <span className="font-medium text-emerald-700">browse</span>
        </span>
        <span className="text-xs text-gray-500">
          PDF (max 10 MB) · JPEG / PNG (max 5 MB)
        </span>
        <input
          type="file"
          className="sr-only"
          accept={ACCEPT}
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
      {file && (
        <p className="mt-2 text-sm text-gray-700">
          Selected: <strong>{file.name}</strong> ({formatBytes(file.size)})
        </p>
      )}
      {combinedError && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {combinedError}
        </p>
      )}
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
