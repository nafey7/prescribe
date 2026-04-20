import { alpha, useTheme } from "@mui/material";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useCallback, useId, useState } from "react";
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
  const theme = useTheme();
  const inputId = useId();
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
    <Box>
      <Box
        component="label"
        htmlFor={inputId}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          px: 2,
          py: 4,
          borderRadius: 1,
          borderWidth: 2,
          borderStyle: "dashed",
          borderColor: drag ? "success.main" : "divider",
          bgcolor: drag
            ? alpha(theme.palette.success.main, 0.08)
            : alpha(theme.palette.text.primary, 0.04),
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          pointerEvents: disabled ? "none" : "auto",
          transition: theme.transitions.create(["border-color", "background-color"], {
            duration: theme.transitions.duration.shorter,
          }),
          "&:hover": {
            borderColor: disabled ? undefined : "text.secondary",
          },
        }}
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
        <Upload
          size={28}
          color={theme.palette.text.disabled}
          aria-hidden
        />
        <Typography variant="body2" color="text.primary">
          Drag a file here or{" "}
          <Box component="span" sx={{ fontWeight: 600, color: "success.dark" }}>
            browse
          </Box>
        </Typography>
        <Typography variant="caption" color="text.secondary">
          PDF (max 10 MB) · JPEG / PNG (max 5 MB)
        </Typography>
        <input
          id={inputId}
          type="file"
          accept={ACCEPT}
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        />
      </Box>
      {file && (
        <Typography variant="body2" color="text.primary" sx={{ mt: 1 }}>
          Selected: <strong>{file.name}</strong> ({formatBytes(file.size)})
        </Typography>
      )}
      {combinedError && (
        <Typography variant="body2" color="error" role="alert" sx={{ mt: 1 }}>
          {combinedError}
        </Typography>
      )}
    </Box>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
