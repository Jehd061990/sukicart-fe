"use client";

import { useCallback, useEffect } from "react";
import axios from "axios";
import { offlineDb, SyncQueueEntry } from "@/lib/offline/indexed-db";
import { posService } from "@/lib/api/services/pos.service";
import { usePWAStore } from "@/store/pwa.store";

const createLocalOrderId = () => `local-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

const registerBackgroundSync = async () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if ("sync" in registration) {
      await (registration as ServiceWorkerRegistration & {
        sync: { register: (tag: string) => Promise<void> };
      }).sync.register("sukicart-pos-sync");
    }
  } catch {
    // Ignore when background sync is unavailable.
  }
};

export const enqueuePOSOrder = async (
  payload: SyncQueueEntry["payload"],
  reason: "offline" | "network-failure" = "offline",
) => {
  await offlineDb.enqueueSync({
    type: "pos-order-create",
    payload,
    createdAt: Date.now(),
  });

  await offlineDb.addOrderSnapshot({
    localId: createLocalOrderId(),
    kind: "pos-order-create",
    reason,
    payload,
    status: "queued",
    createdAt: Date.now(),
  });

  await registerBackgroundSync();
};

export const useSyncQueue = () => {
  const setOnline = usePWAStore((state) => state.setOnline);
  const setSyncing = usePWAStore((state) => state.setSyncing);
  const setPendingSyncCount = usePWAStore((state) => state.setPendingSyncCount);

  const refreshPendingCount = useCallback(async () => {
    const count = await offlineDb.getSyncQueueCount();
    setPendingSyncCount(count);
  }, [setPendingSyncCount]);

  const processQueue = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setOnline(false);
      await refreshPendingCount();
      return;
    }

    setOnline(true);
    setSyncing(true);

    try {
      const queue = await offlineDb.getSyncQueue();

      for (const entry of queue) {
        if (!entry.id) {
          continue;
        }

        if (entry.type === "pos-order-create") {
          await posService.createOrder({
            paymentMethod: entry.payload.paymentMethod,
            items: entry.payload.items,
            scannedCode: entry.payload.scannedCode || "",
          });
        }

        await offlineDb.dequeueSync(entry.id);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        setOnline(false);
      }
    } finally {
      setSyncing(false);
      await refreshPendingCount();
    }
  }, [refreshPendingCount, setOnline, setSyncing]);

  useEffect(() => {
    const updateOnline = () => {
      setOnline(navigator.onLine);
    };

    const onOnline = () => {
      updateOnline();
      void processQueue();
    };

    const onOffline = () => {
      updateOnline();
    };

    updateOnline();
    void refreshPendingCount();

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const interval = window.setInterval(() => {
      void processQueue();
    }, 12000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearInterval(interval);
    };
  }, [processQueue, refreshPendingCount, setOnline]);

  return {
    processQueue,
    refreshPendingCount,
  };
};
