export type PreferredPOSMode = "desktop" | "android" | "ios";

export type InputMethod = "keyboard" | "touch" | "mixed";

export type POSRuntimeMode =
  | "desktop"
  | "android"
  | "ios"
  | "tablet"
  | "mobile"
  | "pwa";

export type POSLayoutDensity = "compact" | "comfortable" | "spacious";

export type POSCartPlacement = "right-rail" | "bottom-sheet";

export type POSCapabilityLevel = "low" | "medium" | "high";

export interface POSDeviceDetection {
  userAgent: string;
  viewportWidth: number;
  viewportHeight: number;
  isDesktop: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isTablet: boolean;
  isMobile: boolean;
  isPWA: boolean;
  inputMethod: InputMethod;
}

export interface POSRuntimeProfile {
  preferredMode: PreferredPOSMode;
  runtimeMode: POSRuntimeMode;
  isDesktop: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isTablet: boolean;
  isMobile: boolean;
  isPWA: boolean;
  inputMethod: InputMethod;
  layoutDensity: POSLayoutDensity;
  cartPlacement: POSCartPlacement;
  productColumns: {
    compact: number;
    regular: number;
    expanded: number;
  };
  printerLikelyWireless: boolean;
  capabilityLevel: POSCapabilityLevel;
}
