"use client";

import { usePWAStore } from "@/store/pwa.store";

export function OfflineStatusIndicator() {
  const online = usePWAStore((state) => state.online);
  const isSyncing = usePWAStore((state) => state.isSyncing);
  const pending = usePWAStore((state) => state.pendingSyncCount);

  if (online && !isSyncing && pending === 0) {
    return null;
  }

  return (
    <div className="fixed left-3 top-3 z-40 inline-flex items-center gap-2 rounded-full border bg-white/95 px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur">
      <span
        className={`h-2 w-2 rounded-full ${
          online ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      <span className="text-slate-700">
        {!online
          ? "Offline mode"
          : isSyncing
            ? "Syncing"
            : `Pending sync: ${pending}`}
      </span>
    </div>
  );
}
