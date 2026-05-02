"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useScannerStore } from "@/store/scanner.store";

export const useComboScanner = () => {
  const registerSuccess = useScannerStore((state) => state.registerSuccess);
  const registerFailure = useScannerStore((state) => state.registerFailure);
  const lastComboAt = useScannerStore((state) => state.lastComboAt);
  const resetCombo = useScannerStore((state) => state.resetCombo);

  const [visibleCombo, setVisibleCombo] = useState(0);
  const hideTimerRef = useRef<number | null>(null);

  const onScanSuccess = useCallback(
    (scannedValue: string, now = Date.now()) => {
      const nextCombo = registerSuccess(scannedValue, now);
      if (nextCombo < 2) {
        return nextCombo;
      }

      setVisibleCombo(nextCombo);
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }

      hideTimerRef.current = window.setTimeout(() => {
        setVisibleCombo(0);
        hideTimerRef.current = null;
      }, 1300);

      return nextCombo;
    },
    [registerSuccess],
  );

  const onScanFailure = useCallback(() => {
    registerFailure();
    setVisibleCombo(0);
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, [registerFailure]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!lastComboAt) {
        return;
      }

      if (Date.now() - lastComboAt > 3000) {
        resetCombo();
        setVisibleCombo(0);
      }
    }, 300);

    return () => {
      window.clearInterval(interval);
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, [lastComboAt, resetCombo]);

  const intensityClass = useMemo(() => {
    if (visibleCombo >= 6) {
      return "shadow-[0_0_28px_rgba(16,185,129,0.65)] ring-2 ring-emerald-300";
    }

    if (visibleCombo >= 3) {
      return "shadow-[0_0_20px_rgba(56,189,248,0.5)] ring-2 ring-sky-300";
    }

    return "shadow-[0_0_12px_rgba(59,130,246,0.35)] ring-1 ring-blue-200";
  }, [visibleCombo]);

  return {
    visibleCombo,
    intensityClass,
    onScanSuccess,
    onScanFailure,
  };
};
