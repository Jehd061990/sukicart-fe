interface SubmitButtonProps {
  isLoading: boolean;
  disabled?: boolean;
  label: string;
}

export function SubmitButton({
  isLoading,
  disabled,
  label,
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || isLoading}
      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-base font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      ) : null}
      <span>{isLoading ? "Submitting..." : label}</span>
    </button>
  );
}
