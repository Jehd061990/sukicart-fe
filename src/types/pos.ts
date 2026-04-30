export interface POSOrderItemPayload {
  productId: string;
  quantity: number;
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
  status: "active" | "inactive" | "pending";
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
  username?: string;
  password?: string;
  autoGeneratePassword?: boolean;
}

export interface UpdatePOSPayload {
  posName?: string;
  username?: string;
  password?: string;
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
    totalSlots: number;
    loginPolicy: "REJECT" | "INVALIDATE_OLDEST";
  };
  usage: POSUsage;
  note: string;
}
