"use client";

import { useState } from "react";
import { usePWAInstall } from "@/hooks/pwa/use-pwa-install";

export function InstallAppButton() {
  const [showHint, setShowHint] = useState(false);
  const { canInstall, canShowInstallFallback, installHint, promptInstall } =
    usePWAInstall();

  if (!canInstall && !canShowInstallFallback) {
    return null;
  }

  const onClickInstall = async () => {
    if (canInstall) {
      const installed = await promptInstall();
      if (!installed) {
        setShowHint(true);
      }
      return;
    }

    setShowHint((current) => !current);
  };

  return (
    <div className="fixed bottom-20 right-4 z-40 flex max-w-xs flex-col items-end gap-2 md:bottom-4">
      {showHint ? (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-lg">
          {installHint}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => {
          void onClickInstall();
        }}
        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.2)] transition hover:bg-brand-700 animate-[toastIn_260ms_ease-out]"
      >
        <span aria-hidden>+</span>
        Install App
      </button>
    </div>
  );
}
