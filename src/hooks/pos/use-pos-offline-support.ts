"use client";

import { useEffect, useRef } from "react";
import { usePWAStore } from "@/store/pwa.store";

interface UsePOSOfflineSupportArgs {
  hasFailedReceipts: boolean;
  retryLatestFailedReceipt?: () => Promise<void>;
}

export const usePOSOfflineSupport = ({
  hasFailedReceipts,
  retryLatestFailedReceipt,
}: UsePOSOfflineSupportArgs) => {
  const online = usePWAStore((state) => state.online);
  const pendingSyncCount = usePWAStore((state) => state.pendingSyncCount);
  const wasOnlineRef = useRef<boolean>(true);

  useEffect(() => {
    const cameBackOnline = !wasOnlineRef.current && online;
    wasOnlineRef.current = online;

    if (!cameBackOnline || !hasFailedReceipts || !retryLatestFailedReceipt) {
      return;
    }

    void retryLatestFailedReceipt();
  }, [hasFailedReceipts, online, retryLatestFailedReceipt]);

  return {
    online,
    pendingSyncCount,
  };
};
