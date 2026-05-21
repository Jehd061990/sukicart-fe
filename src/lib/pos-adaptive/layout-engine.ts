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
  };
};
