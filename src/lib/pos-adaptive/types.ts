export type PreferredPOSMode = "desktop" | "android" | "ios";

export type InputMethod = "keyboard" | "touch" | "mixed";

export type POSRuntimeMode =
  | "desktop"
  | "android"
  | "ios"
  | "tablet"
  | "mobile"
  | "pwa";

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
}
