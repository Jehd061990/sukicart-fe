"use client";

interface FloatingAddOneEntry {
  id: number;
  leftPct: number;
  topPct: number;
}

interface FloatingAddOneProps {
  entries: FloatingAddOneEntry[];
}

export function FloatingAddOne({ entries }: FloatingAddOneProps) {
  return (
    <>
      {entries.map((entry) => (
        <span
          key={entry.id}
          className="pointer-events-none absolute z-30 rounded-full bg-emerald-500 px-2 py-1 text-xs font-bold text-white animate-[floatUp_1000ms_ease-out_forwards]"
          style={{ left: `${entry.leftPct}%`, top: `${entry.topPct}%` }}
        >
          +1
        </span>
      ))}
    </>
  );
}
