export type StoreType =
  | "grocery"
  | "pharmacy"
  | "hardware"
  | "convenience"
  | "retail";

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

export interface StoreTypeConfig {
  label: string;
  modules: string[];
  features: StoreConfigFeatures;
  requiredFields: {
    posOrder: string[];
  };
  businessRules: StoreConfigBusinessRules;
  uiBehavior: StoreConfigUIBehavior;
}

export interface StoreConfigResponse {
  store: {
    id: string;
    name: string;
    storeType: StoreType;
  };
  config: StoreTypeConfig;
  supportedStoreTypes: StoreType[];
}

export interface UpdateStoreConfigPayload {
  storeType?: StoreType;
  configOverrides?: Partial<StoreTypeConfig> | null;
}