import {
  FieldError,
  FieldValues,
  Path,
  UseFormRegister,
} from "react-hook-form";

interface SelectOption {
  label: string;
  value: string;
}

interface SelectFieldProps<T extends FieldValues> {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  options: SelectOption[];
  error?: FieldError;
  required?: boolean;
}

export function SelectField<T extends FieldValues>({
  label,
  name,
  register,
  options,
  error,
  required,
}: SelectFieldProps<T>) {
  return (
    <div className="space-y-2">
      <label className="font-sans text-sm font-medium text-gray-600">
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </label>
      <select
        {...register(name)}
        className="w-full rounded-2xl border border-gray-200 bg-white px-3.5 py-2.5 font-sans text-sm text-gray-700 outline-none transition hover:border-gray-300 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-500 sm:px-4 sm:py-3"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="font-sans text-xs text-destructive">{error.message}</p>
      ) : null}
    </div>
  );
}
