import { InputMethod, POSDeviceDetection } from "@/lib/pos-adaptive/types";

const DESKTOP_BREAKPOINT = 1280;
const TABLET_MIN = 768;

const detectInputMethod = (): InputMethod => {
  if (typeof window === "undefined") {
    return "mixed";
  }

  const hasFinePointer = window.matchMedia("(pointer:fine)").matches;
  const hasCoarsePointer = window.matchMedia("(pointer:coarse)").matches;

  if (hasFinePointer && !hasCoarsePointer) {
    return "keyboard";
  }

  if (!hasFinePointer && hasCoarsePointer) {
    return "touch";
  }

  return "mixed";
};

export const detectPOSDevice = (): POSDeviceDetection => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      userAgent: "server",
      viewportWidth: 1366,
      viewportHeight: 768,
      isDesktop: true,
      isAndroid: false,
      isIOS: false,
      isTablet: false,
      isMobile: false,
      isPWA: false,
      inputMethod: "keyboard",
    };
  }

  const ua = navigator.userAgent || "";
  const width = window.innerWidth;
  const height = window.innerHeight;
  const capacitorPlatform =
    typeof (window as Window & { Capacitor?: { getPlatform?: () => string } }).Capacitor
      ?.getPlatform === "function"
      ? String(
          (window as Window & { Capacitor?: { getPlatform?: () => string } }).Capacitor?.getPlatform?.() ||
            "",
        ).toLowerCase()
      : "";
  const isNativeCapacitor =
    typeof (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
      ?.isNativePlatform === "function"
      ? Boolean(
          (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.(),
        )
      : false;

  const isAndroid = /Android/i.test(ua) || capacitorPlatform === "android";
  const isIPhone = /iPhone/i.test(ua);
  const isIPad = /iPad/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isIOS = isIPhone || isIPad || capacitorPlatform === "ios";

  const isTouchCapable = navigator.maxTouchPoints > 0;
  const isTabletByUA = /Tablet|iPad/i.test(ua) || (isAndroid && !/Mobile/i.test(ua)) || isIPad;
  const shortestEdge = Math.min(width, height);
  const isTabletBySize = isTouchCapable && shortestEdge >= TABLET_MIN && shortestEdge < DESKTOP_BREAKPOINT;

  const isTablet = isTabletByUA || isTabletBySize;
  const isMobile = !isTablet && (isAndroid || isIPhone || width < TABLET_MIN);
  const isPWA =
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone) ||
    isNativeCapacitor;

  const isDesktop = !isMobile && !isTablet;

  return {
    userAgent: ua,
    viewportWidth: width,
    viewportHeight: height,
    isDesktop,
    isAndroid,
    isIOS,
    isTablet,
    isMobile,
    isPWA,
    inputMethod: detectInputMethod(),
  };
};
