import {
  FieldError,
  FieldValues,
  Path,
  UseFormRegister,
} from "react-hook-form";
import { ReactNode } from "react";

interface CheckboxFieldProps<T extends FieldValues> {
  label: ReactNode;
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
      <label className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white px-3.5 py-2.5 transition hover:border-gray-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 sm:px-4 sm:py-3">
        <input
          type="checkbox"
          {...register(name)}
          className="mt-1 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-200"
        />
        <span className="font-sans text-sm leading-6 text-gray-700">
          {label}
        </span>
      </label>
      {error ? (
        <p className="mt-1 font-sans text-xs text-destructive">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}
