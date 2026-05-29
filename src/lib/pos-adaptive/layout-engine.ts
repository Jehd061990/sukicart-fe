import { POSDeviceDetection, POSRuntimeProfile, PreferredPOSMode } from "@/lib/pos-adaptive/types";

const resolveRuntimeMode = (detection: POSDeviceDetection, preferredMode: PreferredPOSMode) => {
  if (detection.isTablet) {
    return "tablet" as const;
  }

  if (detection.isPWA && (detection.isAndroid || detection.isIOS || detection.isMobile)) {
    return "pwa" as const;
  }

  if (detection.isAndroid) {
    return "android" as const;
  }

  if (detection.isIOS) {
    return "ios" as const;
  }

  if (detection.isMobile) {
    return "mobile" as const;
  }

  if (preferredMode === "android" && detection.isDesktop) {
    return "desktop" as const;
  }

  if (preferredMode === "ios" && detection.isDesktop) {
    return "desktop" as const;
  }

  return "desktop" as const;
};

export const buildPOSRuntimeProfile = (
  detection: POSDeviceDetection,
  preferredMode: PreferredPOSMode,
): POSRuntimeProfile => {
  const runtimeMode = resolveRuntimeMode(detection, preferredMode);
  const layoutDensity =
    runtimeMode === "desktop" ? "spacious" : runtimeMode === "tablet" ? "comfortable" : "compact";
  const cartPlacement = runtimeMode === "desktop" || runtimeMode === "tablet" ? "right-rail" : "bottom-sheet";
  const productColumns =
    runtimeMode === "desktop"
      ? { compact: 2, regular: 3, expanded: 4 }
      : runtimeMode === "tablet"
        ? { compact: 2, regular: 3, expanded: 3 }
        : { compact: 2, regular: 2, expanded: 2 };
  const capabilityLevel =
    runtimeMode === "desktop" ? "high" : runtimeMode === "tablet" ? "medium" : "low";
  const printerLikelyWireless = runtimeMode === "android" || runtimeMode === "ios" || runtimeMode === "mobile";

  return {
    preferredMode,
    runtimeMode,
    isDesktop: detection.isDesktop,
    isAndroid: detection.isAndroid,
    isIOS: detection.isIOS,
    isTablet: detection.isTablet,
    isMobile: detection.isMobile,
    isPWA: detection.isPWA,
    inputMethod: detection.inputMethod,
    layoutDensity,
    cartPlacement,
    productColumns,
    printerLikelyWireless,
    capabilityLevel,
  };
};
