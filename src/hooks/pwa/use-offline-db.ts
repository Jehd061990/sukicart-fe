"use client";

import { useMemo } from "react";
import { offlineDb } from "@/lib/offline/indexed-db";

export const useOfflineDB = () => {
  return useMemo(
    () => ({
      replaceProducts: offlineDb.replaceProducts,
      getProducts: offlineDb.getProducts,
      replaceCartItems: offlineDb.replaceCartItems,
      getCartItems: offlineDb.getCartItems,
      addOrderSnapshot: offlineDb.addOrderSnapshot,
      enqueueSync: offlineDb.enqueueSync,
      getSyncQueue: offlineDb.getSyncQueue,
      getSyncQueueCount: offlineDb.getSyncQueueCount,
      dequeueSync: offlineDb.dequeueSync,
    }),
    [],
  );
};
