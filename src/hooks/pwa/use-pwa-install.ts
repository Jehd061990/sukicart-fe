"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type InstallPlatform = "ios" | "android" | "desktop" | "unknown";

const DISMISSED_KEY = "sukicart-pwa-install-dismissed";
const INSTALLED_KEY = "sukicart-pwa-installed";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24;

const isStandaloneMode = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari standalone mode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Boolean((window.navigator as any).standalone)
  );
};

const detectInstallPlatform = (): InstallPlatform => {
  if (typeof navigator === "undefined") {
    return "unknown";
  }

  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return "ios";
  }

  if (/Android/i.test(ua)) {
    return "android";
  }

  if (/Windows|Macintosh|Linux/i.test(ua)) {
    return "desktop";
  }

  return "unknown";
};

const getInitialInstalled = () => {
  return isStandaloneMode();
};

const getInitialDismissed = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) || 0);
  if (!Number.isFinite(dismissedAt) || dismissedAt <= 0) {
    return false;
  }

  const stillSuppressed = Date.now() - dismissedAt < DISMISS_TTL_MS;
  if (!stillSuppressed) {
    localStorage.removeItem(DISMISSED_KEY);
  }

  return stillSuppressed;
};

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(getInitialInstalled);
  const [dismissed, setDismissed] = useState(getInitialDismissed);
  const [platform, setPlatform] = useState<InstallPlatform>("unknown");

  useEffect(() => {
    setPlatform(detectInstallPlatform());
    const standalone = isStandaloneMode();
    setIsInstalled(standalone);

    if (!standalone) {
      localStorage.removeItem(INSTALLED_KEY);
    }

    if (localStorage.getItem(DISMISSED_KEY)) {
      const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) || 0);
      if (!Number.isFinite(dismissedAt) || Date.now() - dismissedAt >= DISMISS_TTL_MS) {
        localStorage.removeItem(DISMISSED_KEY);
        setDismissed(false);
      }
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      setDeferredPrompt(installEvent);
      setDismissed(false);
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
      setIsInstalled(true);
      setDeferredPrompt(null);
      localStorage.removeItem(DISMISSED_KEY);
      return true;
    }

    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setDismissed(true);
    setDeferredPrompt(null);
    return false;
  }, [deferredPrompt]);

  const canInstall = useMemo(
    () => Boolean(deferredPrompt) && !isInstalled && !dismissed,
    [deferredPrompt, dismissed, isInstalled],
  );

  const canShowInstallFallback = useMemo(
    () => !isInstalled && !dismissed,
    [dismissed, isInstalled],
  );

  const installHint = useMemo(() => {
    if (platform === "ios") {
      return "Tap Share, then Add to Home Screen.";
    }

    if (platform === "android") {
      return "Open browser menu, then tap Install app or Add to Home screen.";
    }

    if (platform === "desktop") {
      return "Use browser install option in the address bar or app menu.";
    }

    return "Use your browser menu to install this app.";
  }, [platform]);

  return {
    canInstall,
    canShowInstallFallback,
    installHint,
    platform,
    isInstalled,
    promptInstall,
  };
};
