import {
  FieldError,
  FieldValues,
  Path,
  UseFormRegister,
} from "react-hook-form";

interface InputFieldProps<T extends FieldValues> {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  error?: FieldError;
  type?: "text" | "email" | "password" | "tel";
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
}

export function InputField<T extends FieldValues>({
  label,
  name,
  register,
  error,
  type = "text",
  placeholder,
  required,
  autoFocus,
}: InputFieldProps<T>) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-foreground">
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        autoFocus={autoFocus}
        {...register(name)}
        className="w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-emerald-500"
      />
      {error ? (
        <p className="text-xs text-destructive">{error.message}</p>
      ) : null}
    </div>
  );
}
