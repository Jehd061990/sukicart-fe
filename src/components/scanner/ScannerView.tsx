"use client";

import { ReactNode } from "react";

interface ScannerViewProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  children?: ReactNode;
}

export function ScannerView({ containerRef, children }: ScannerViewProps) {
  return (
    <div className="relative flex-1 overflow-hidden rounded-3xl bg-black shadow-xl ring-1 ring-slate-800">
      <div
        ref={containerRef}
        className="absolute inset-0 [&_canvas]:h-full [&_canvas]:w-full [&_canvas]:object-cover [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
      />

      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
        <div className="relative h-[24%] w-[84%] rounded-xl border-2 border-emerald-300/90 shadow-[0_0_0_9999px_rgba(2,6,23,0.48)]">
          <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-emerald-300/90 animate-pulse" />
        </div>
      </div>

      {children}
    </div>
  );
}
