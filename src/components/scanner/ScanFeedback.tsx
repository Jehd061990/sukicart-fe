"use client";

interface ScanFeedbackProps {
  message: string;
  tone: "idle" | "success" | "error";
}

export function ScanFeedback({ message, tone }: ScanFeedbackProps) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "error"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-slate-200 bg-white/90 text-slate-600";

  return (
    <p
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur ${toneClass}`}
    >
      {message}
    </p>
  );
}
