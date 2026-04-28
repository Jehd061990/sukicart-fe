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
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-2.5 font-sans text-sm font-semibold text-white transition hover:bg-orange-600 active:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200 sm:px-5 sm:py-3 sm:text-base disabled:cursor-not-allowed disabled:bg-orange-300 disabled:text-white/90"
    >
      {isLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      ) : null}
      <span>{isLoading ? "Submitting..." : label}</span>
    </button>
  );
}
