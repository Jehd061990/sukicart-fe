"use client";

import { usePWAInstall } from "@/hooks/pwa/use-pwa-install";

export function InstallAppButton() {
  const { canInstall, promptInstall } = usePWAInstall();

  if (!canInstall) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => {
        void promptInstall();
      }}
      className="fixed bottom-20 right-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.2)] transition hover:bg-brand-700 animate-[toastIn_260ms_ease-out] md:bottom-4"
    >
      <span aria-hidden>+</span>
      Install App
    </button>
  );
}
