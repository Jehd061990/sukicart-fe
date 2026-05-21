export type StoreType =
  | "grocery"
  | "pharmacy"
  | "hardware"
  | "convenience"
  | "retail";

export type PreferredPOSMode = "desktop" | "android" | "ios";

export type ScannerMode = "camera" | "hardware" | "manual";
export type StoreCategoryKey = "vegetables" | "meat" | "fish";
export type CategoryThumbnailShape = "circle" | "rounded";

export interface StoreCategoryImage {
  url: string;
  publicId: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  format: string;
}

export interface StoreCategoryVisual {
  key: StoreCategoryKey;
  label: string;
  image?: string;
  images?: StoreCategoryImage[];
}

export interface StoreConfigFeatures {
  barcodeScanning: boolean;
  expiryTracking: boolean;
  prescriptionRequired: boolean;
  bulkQuantityInput: boolean;
}

export interface StoreConfigUIBehavior {
  showPrescriptionInput: boolean;
  showBarcodeScanner: boolean;
  showBulkQuantityActions: boolean;
  scannerModes: ScannerMode[];
  defaultScannerMode: ScannerMode;
  categoryCatalog?: StoreCategoryVisual[];
  categoryThumbnailShape?: CategoryThumbnailShape;
}

export interface StoreConfigBusinessRules {
  paymentMethods: string[];
  maxLineItems: number;
}

export interface StorePrintingConfig {
  preferredAdapter?: "browser" | "bluetooth" | "airprint" | "local-bridge";
  paperSize?: "58mm" | "80mm";
  autoPrint?: boolean;
  desktopPrinterName?: string;
}

export interface StoreTypeConfig {
  label: string;
  modules: string[];
  features: StoreConfigFeatures;
  requiredFields: {
    posOrder: string[];
  };
  businessRules: StoreConfigBusinessRules;
  uiBehavior: StoreConfigUIBehavior;
  printing?: StorePrintingConfig;
}

export interface StoreConfigResponse {
  store: {
    id: string;
    name: string;
    storeType: StoreType;
    preferredPOSMode?: PreferredPOSMode;
  };
  config: StoreTypeConfig;
  supportedStoreTypes: StoreType[];
}

export interface UpdateStoreConfigPayload {
  storeType?: StoreType;
  preferredPOSMode?: PreferredPOSMode;
  configOverrides?: Partial<StoreTypeConfig> | null;
}