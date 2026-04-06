import { FieldError } from "react-hook-form";

interface FileUploadProps {
  label: string;
  accept?: string;
  fileName?: string;
  onChange: (file: File | null) => void;
  error?: FieldError;
}

export function FileUpload({
  label,
  accept,
  fileName,
  onChange,
  error,
}: FileUploadProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-foreground">{label}</label>
      <input
        type="file"
        accept={accept}
        onChange={(event) => {
          const selectedFile = event.target.files?.[0] || null;
          onChange(selectedFile);
        }}
        className="block w-full rounded-xl border bg-white px-4 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:text-emerald-800"
      />
      {fileName ? (
        <p className="text-xs text-muted-foreground">Selected: {fileName}</p>
      ) : null}
      {error ? (
        <p className="text-xs text-destructive">{error.message}</p>
      ) : null}
    </div>
  );
}
