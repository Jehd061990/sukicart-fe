export interface POSOrderItemPayload {
  productId: string;
  quantity: number;
  variant?: string;
  note?: string;
}

export interface DecodeBarcodeFramePayload {
  imageData: string;
}

export interface DecodeBarcodeFrameResponse {
  message: string;
  barcode: string | null;
}

export interface CreatePOSOrderPayload {
  items: POSOrderItemPayload[];
  paymentMethod: "cash";
  prescriptionCode?: string;
  scannedCode?: string;
}

export interface POSOrderResponse {
  message: string;
  order: {
    _id: string;
    total: number;
    status: string;
    type: "POS" | "ONLINE";
  };
}

export interface DeviceSession {
  id: string;
  userId: string;
  role: "SELLER" | "POS" | "ADMIN" | "BUYER" | "RIDER";
  deviceId: string;
  deviceName: string;
  ipAddress: string;
  lastActiveAt: string;
  createdAt: string;
}

export interface POSAccount {
  id: string;
  posName: string;
  username: string;
  email?: string;
  status: "active" | "inactive" | "pending";
  branchId?: string | null;
  branchName?: string;
  assignedUserId?: string | null;
  deviceStatus?: "active" | "inactive" | "suspended";
  isDeactivated: boolean;
  createdAt: string;
  activeSession: DeviceSession | null;
}

export interface POSUsage {
  active: number;
  total: number;
}

export interface CreatePOSPayload {
  posName: string;
  email?: string;
  username?: string;
  password?: string;
  autoGeneratePassword?: boolean;
  branchId?: string;
  assignedUserId?: string;
  deviceStatus?: "active" | "inactive" | "suspended";
}

export interface UpdatePOSPayload {
  posName?: string;
  email?: string;
  username?: string;
  password?: string;
  branchId?: string;
  assignedUserId?: string;
  deviceStatus?: "active" | "inactive" | "suspended";
}

export interface UpgradePOSSlotsPayload {
  additionalSlots: number;
}

export interface CreatePOSResponse {
  message: string;
  pos: POSAccount;
  generatedPassword?: string;
  usage: POSUsage;
}

export interface POSListResponse {
  usage: POSUsage;
  data: POSAccount[];
}

export interface SessionListResponse {
  data: DeviceSession[];
}

export interface UpgradePOSSlotsResponse {
  message: string;
  subscription: {
    includedSlots?: number;
    addonSlots?: number;
    totalSlots: number;
    monthlyPrice?: number;
    loginPolicy: "REJECT" | "INVALIDATE_OLDEST";
  };
  usage: POSUsage;
  note: string;
}
