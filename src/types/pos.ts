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
    id: string;
    transactionNumber: string;
    total: number;
    totalAmount?: number;
    status: string;
    type: "POS" | "ONLINE";
    branchId?: string | null;
    createdAt?: string;
    updatedAt?: string;
    items?: Array<{
      productId: string;
      name: string;
      unit: "kg" | "pcs";
      price: number;
      quantity: number;
      lineTotal: number;
      variant?: string;
      note?: string;
    }>;
    taxSummary?: {
      businessTaxType: "VAT" | "NON_VAT";
      taxEnabled: boolean;
      defaultVatRate: number;
      subtotal: number;
      vatableSales: number;
      vatAmount: number;
      vatExemptSales: number;
      zeroRatedSales: number;
      nonVatSales: number;
      totalTax: number;
      grandTotal: number;
    };
  };
}

export interface POSTaxSummaryResponse {
  summary: {
    ordersCount: number;
    vatableSales: number;
    vatAmount: number;
    vatExemptSales: number;
    zeroRatedSales: number;
    nonVatSales: number;
    grandTotal: number;
  };
  range: {
    from: string | null;
    to: string | null;
  };
}

export interface POSSalesPerformancePoint {
  label: string;
  walkIn: number;
  online: number;
  total: number;
  orders: number;
}

export interface POSSalesPerformanceResponse {
  branchId: string;
  totals: {
    walkIn: number;
    online: number;
    total: number;
    orders: number;
  };
  range: {
    preset: "today" | "yesterday" | "custom";
    bucket: "hour" | "day";
    from: string;
    to: string;
  };
  series: POSSalesPerformancePoint[];
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

export interface POSOnlineOrderParty {
  id: string;
  name: string;
  phoneNumber?: string;
  isOnline?: boolean;
  isAvailable?: boolean;
}

export interface POSOnlineOrderItem {
  productId: string;
  name: string;
  unit: "kg" | "pcs";
  price: number;
  quantity: number;
  lineTotal: number;
  variant?: string;
  note?: string;
}

export interface POSOnlineOrder {
  id: string;
  status: string;
  type: "ONLINE" | "POS";
  branchId: string | null;
  total: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  buyer: POSOnlineOrderParty | null;
  seller: POSOnlineOrderParty | null;
  rider: POSOnlineOrderParty | null;
  assignedHandler: POSOnlineOrderParty | null;
  assignedHandlerAt: string | null;
  items: POSOnlineOrderItem[];
}

export interface POSOnlineOrderQueueCounters {
  newOrders: number;
  preparing: number;
  ready: number;
  outForDelivery: number;
  completed: number;
  cancelled: number;
}

export interface POSOnlineOrderQueueResponse {
  branchId: string;
  orders: POSOnlineOrder[];
  counters: POSOnlineOrderQueueCounters;
}

export interface POSOnlineOrderMetricsResponse {
  branchId: string;
  counters: POSOnlineOrderQueueCounters & {
    total: number;
  };
  kpi: {
    avgMinutesToReady: number;
    readySamples: number;
    stalePreparingOrders: number;
  };
  range: {
    from: string | null;
    to: string | null;
  };
}

export interface POSOnlineOrderDetailResponse {
  branchId: string;
  order: POSOnlineOrder;
  timeline: Array<{
    at: string;
    label: string;
    type?: string;
    status?: string;
    actorName?: string;
  }>;
}
