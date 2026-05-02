"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

const DISMISSED_KEY = "sukicart-pwa-install-dismissed";
const INSTALLED_KEY = "sukicart-pwa-installed";

const getInitialInstalled = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari standalone mode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Boolean((window.navigator as any).standalone);

  return isStandalone || localStorage.getItem(INSTALLED_KEY) === "1";
};

const getInitialDismissed = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return localStorage.getItem(DISMISSED_KEY) === "1";
};

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(getInitialInstalled);
  const [dismissed, setDismissed] = useState(getInitialDismissed);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      setDeferredPrompt(installEvent);
    };

    const handleAppInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, "1");
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return false;
    }

    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;

    if (result.outcome === "accepted") {
      localStorage.setItem(INSTALLED_KEY, "1");
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }

    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
    setDeferredPrompt(null);
    return false;
  }, [deferredPrompt]);

  const canInstall = useMemo(
    () => Boolean(deferredPrompt) && !isInstalled && !dismissed,
    [deferredPrompt, dismissed, isInstalled],
  );

  return {
    canInstall,
    isInstalled,
    promptInstall,
  };
};
