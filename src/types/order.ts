export type MarketplaceOrderStatus =
  | "pending"
  | "cancelled_by_buyer"
  | "declined_by_seller"
  | "searching_rider"
  | "accepted"
  | "delivering"
  | "completed"
  | "preparing"
  | "ready_for_pickup"
  | "assigned_to_rider"
  | "arrived_at_seller"
  | "picked_up"
  | "out_for_delivery"
  | "arrived_at_buyer"
  | "delivered";

export interface CheckoutItemPayload {
  productId: string;
  quantity: number;
}

export interface CheckoutOrderPayload {
  items: CheckoutItemPayload[];
  sellerLocation?: {
    lat: number;
    lng: number;
  } | null;
  buyerLocation?: {
    lat: number;
    lng: number;
  } | null;
}

export interface MarketplaceOrderItem {
  productId: string;
  name: string;
  unit: "kg" | "pcs";
  price: number;
  quantity: number;
  lineTotal: number;
  variant?: string;
  note?: string;
}

export interface MarketplaceOrderParty {
  id: string;
  name: string;
}

export interface MarketplaceOrder {
  id: string;
  status: MarketplaceOrderStatus;
  type: "ONLINE" | "POS";
  total: number;
  createdAt: string;
  updatedAt: string;
  pickupCodeIssuedAt?: string | null;
  pickupCodeVerifiedAt?: string | null;
  hasPickupCode?: boolean;
  sellerCancellationReason?: string;
  buyer: MarketplaceOrderParty | null;
  seller: MarketplaceOrderParty | null;
  rider: MarketplaceOrderParty | null;
  items: MarketplaceOrderItem[];
}

export interface PickupQrPayload {
  orderId: string;
  transactionNumber?: string;
  status: MarketplaceOrderStatus;
  pickupVerificationCode: string;
  pickupQrValue: string;
  issuedAt: string | null;
  verifiedAt: string | null;
}

export interface CreateOrderResponse {
  message: string;
  order: {
    id: string;
    transactionNumber: string;
    status: MarketplaceOrderStatus;
    total: number;
    seller: MarketplaceOrderParty | null;
    buyer: MarketplaceOrderParty | null;
    createdAt: string;
    updatedAt: string;
    type: "ONLINE" | "POS";
    branchId: string | null;
    items: MarketplaceOrderItem[];
  };
  orders?: Array<{
    id: string;
    transactionNumber: string;
    status: MarketplaceOrderStatus;
    total: number;
    seller: MarketplaceOrderParty | null;
    buyer: MarketplaceOrderParty | null;
    createdAt: string;
    updatedAt: string;
    type: "ONLINE" | "POS";
    branchId: string | null;
    items: MarketplaceOrderItem[];
  }>;
}
