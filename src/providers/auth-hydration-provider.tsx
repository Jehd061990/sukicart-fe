"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";

export function AuthHydrationProvider() {
  const setHydrated = useAuthStore((state) => state.setHydrated);

  useEffect(() => {
    setHydrated(useAuthStore.persist.hasHydrated());

    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    return unsubscribe;
  }, [setHydrated]);

  return null;
}
