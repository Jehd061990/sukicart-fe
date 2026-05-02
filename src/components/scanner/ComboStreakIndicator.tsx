"use client";

interface ComboStreakIndicatorProps {
  count: number;
  intensityClass: string;
}

export function ComboStreakIndicator({
  count,
  intensityClass,
}: ComboStreakIndicatorProps) {
  if (count < 2) {
    return null;
  }

  return (
    <div
      className={`pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-full bg-white/95 px-4 py-2 text-sm font-bold text-slate-900 transition-all duration-300 animate-[comboPop_900ms_ease-out] ${intensityClass}`}
    >
      x{count} Combo
    </div>
  );
}
