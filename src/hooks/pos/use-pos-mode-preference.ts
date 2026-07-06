"use client";

import { useEffect, useMemo, useState } from "react";
import { PreferredPOSMode } from "@/lib/pos-adaptive/types";

const PREFERRED_MODE_STORAGE_KEY = "sukigo-pos-preferred-mode";
const ONBOARDING_DONE_STORAGE_KEY = "sukigo-pos-mode-onboarding-done";

const isPreferredMode = (value: unknown): value is PreferredPOSMode =>
  value === "desktop" || value === "android" || value === "ios";

export const usePOSModePreference = (serverPreferredMode: PreferredPOSMode = "desktop") => {
  const [localPreferredMode, setLocalPreferredMode] = useState<PreferredPOSMode | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedMode = window.localStorage.getItem(PREFERRED_MODE_STORAGE_KEY);
    if (isPreferredMode(savedMode)) {
      setLocalPreferredMode(savedMode);
    }

    const onboardingFlag = window.localStorage.getItem(ONBOARDING_DONE_STORAGE_KEY);
    if (!onboardingFlag) {
      setOnboardingCompleted(false);
    }
  }, []);

  const effectiveMode = useMemo(
    () => localPreferredMode || serverPreferredMode,
    [localPreferredMode, serverPreferredMode],
  );

  const setModePreference = (mode: PreferredPOSMode) => {
    setLocalPreferredMode(mode);
    setOnboardingCompleted(true);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(PREFERRED_MODE_STORAGE_KEY, mode);
      window.localStorage.setItem(ONBOARDING_DONE_STORAGE_KEY, "1");
    }
  };

  const dismissOnboarding = () => {
    setOnboardingCompleted(true);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(ONBOARDING_DONE_STORAGE_KEY, "1");
    }
  };

  return {
    effectiveMode,
    localPreferredMode,
    showOnboarding: !onboardingCompleted,
    setModePreference,
    dismissOnboarding,
  };
};
