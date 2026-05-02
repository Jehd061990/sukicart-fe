"use client";

import { useSyncExternalStore } from "react";

export const useIsMobile = (breakpointPx = 768) => {
  const query = `(max-width: ${breakpointPx - 1}px)`;

  const subscribe = (onStoreChange: () => void) => {
    if (typeof window === "undefined") {
      return () => {};
    }

    const mediaQuery = window.matchMedia(query);
    const listener = () => onStoreChange();
    mediaQuery.addEventListener("change", listener);

    return () => {
      mediaQuery.removeEventListener("change", listener);
    };
  };

  const getSnapshot = () => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia(query).matches;
  };

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
};
