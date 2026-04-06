import {
  FieldError,
  FieldValues,
  Path,
  UseFormRegister,
} from "react-hook-form";

interface TextAreaProps<T extends FieldValues> {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  error?: FieldError;
  placeholder?: string;
  rows?: number;
}

export function TextArea<T extends FieldValues>({
  label,
  name,
  register,
  error,
  placeholder,
  rows = 3,
}: TextAreaProps<T>) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-foreground">{label}</label>
      <textarea
        rows={rows}
        placeholder={placeholder}
        {...register(name)}
        className="w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-emerald-500"
      />
      {error ? (
        <p className="text-xs text-destructive">{error.message}</p>
      ) : null}
    </div>
  );
}
