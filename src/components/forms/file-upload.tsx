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
    <div className="space-y-2">
      <label className="font-sans text-sm font-medium text-gray-600">
        {label}
      </label>
      <input
        type="file"
        accept={accept}
        onChange={(event) => {
          const selectedFile = event.target.files?.[0] || null;
          onChange(selectedFile);
        }}
        className="block w-full rounded-2xl border border-gray-200 bg-white px-3.5 py-2.5 font-sans text-sm text-gray-700 transition hover:border-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:font-sans file:text-sm file:font-medium file:text-emerald-800 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-100 sm:px-4 sm:py-3"
      />
      {fileName ? (
        <p className="font-sans text-xs text-gray-500">Selected: {fileName}</p>
      ) : null}
      {error ? (
        <p className="font-sans text-xs text-destructive">{error.message}</p>
      ) : null}
    </div>
  );
}
