"use client";

import { useEffect, useMemo, useState } from "react";
import { useScannerStore } from "@/store/scanner.store";

export const useComboScanner = () => {
  const comboCount = useScannerStore((state) => state.comboCount);
  const lastComboAt = useScannerStore((state) => state.lastComboAt);
  const resetCombo = useScannerStore((state) => state.resetCombo);

  const [visibleCombo, setVisibleCombo] = useState(0);

  useEffect(() => {
    if (comboCount >= 2) {
      setVisibleCombo(comboCount);
      const timer = window.setTimeout(() => {
        setVisibleCombo(0);
      }, 1300);

      return () => {
        window.clearTimeout(timer);
      };
    }

    return undefined;
  }, [comboCount]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!lastComboAt || comboCount <= 0) {
        return;
      }

      if (Date.now() - lastComboAt > 3000) {
        resetCombo();
      }
    }, 300);

    return () => {
      window.clearInterval(interval);
    };
  }, [comboCount, lastComboAt, resetCombo]);

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
    comboCount,
    visibleCombo,
    intensityClass,
  };
};
