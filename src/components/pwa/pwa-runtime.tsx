"use client";

import { useEffect } from "react";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { OfflineStatusIndicator } from "@/components/pwa/offline-status-indicator";
import { useSyncQueue } from "@/hooks/pwa/use-sync-queue";
import { offlineDb } from "@/lib/offline/indexed-db";
import { usePOSCartStore } from "@/store/pos-cart.store";

function useServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        // Ignore registration failures in unsupported environments.
      }
    };

    void register();
  }, []);
}

function useCartOfflinePersistence() {
  const items = usePOSCartStore((state) => state.items);
  const hydrateItems = usePOSCartStore((state) => state.hydrateItems);

  useEffect(() => {
    void offlineDb.replaceCartItems(items);
  }, [items]);

  useEffect(() => {
    const hydrate = async () => {
      const saved = await offlineDb.getCartItems<typeof items[number]>();
      if (saved.length) {
        hydrateItems(saved);
      }
    };

    void hydrate();
  }, [hydrateItems]);
}

export function PWARuntime() {
  useServiceWorkerRegistration();
  const { processQueue } = useSyncQueue();
  useCartOfflinePersistence();

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) {
      return;
    }

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "SUKICART_SYNC_QUEUE") {
        void processQueue();
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, [processQueue]);

  return (
    <>
      <OfflineStatusIndicator />
      {/* <InstallAppButton /> */}
    </>
  );
}
