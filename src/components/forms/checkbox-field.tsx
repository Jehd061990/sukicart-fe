import {
  FieldError,
  FieldValues,
  Path,
  UseFormRegister,
} from "react-hook-form";

interface CheckboxFieldProps<T extends FieldValues> {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  error?: FieldError;
}

export function CheckboxField<T extends FieldValues>({
  label,
  name,
  register,
  error,
}: CheckboxFieldProps<T>) {
  return (
    <div>
      <label className="flex items-start gap-3 rounded-xl border bg-white px-4 py-3">
        <input
          type="checkbox"
          {...register(name)}
          className="mt-1 h-4 w-4 rounded border-emerald-300 text-emerald-600"
        />
        <span className="text-sm text-foreground">{label}</span>
      </label>
      {error ? (
        <p className="mt-1 text-xs text-destructive">{error.message}</p>
      ) : null}
    </div>
  );
}
