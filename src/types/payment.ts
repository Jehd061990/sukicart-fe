export type PaymentType = "one_time" | "subscription";
export type PaymentStatus = "pending" | "paid" | "failed";
export type SubscriptionPlanCode = "FREE" | "PRO" | "BUSINESS";
export type SubscriptionStatus =
  | "free"
  | "active"
  | "pending"
  | "cancelled"
  | "expired"
  | "past_due"
  | "trial";

export interface BuyerCheckoutItem {
  productId: string;
  quantity: number;
}

export interface BuyerCheckoutPayload {
  items: BuyerCheckoutItem[];
  paymentMethod: "cod" | "online";
  buyerLocation?: {
    lat: number;
    lng: number;
  } | null;
}

export interface PaymentRecord {
  _id?: string;
  id?: string;
  type: PaymentType;
  status: PaymentStatus;
  amount: number;
  orderId?: string | null;
  orderIds?: string[];
  sellerId?: string | null;
  buyerId?: string | null;
  plan?: SubscriptionPlanCode | "";
  addonSlots?: number;
  includedSlots?: number;
  totalSlots?: number;
  baseAmount?: number;
  addonAmount?: number;
  checkoutUrl?: string;
  paidAt?: string | null;
  failedAt?: string | null;
}

export interface CreateBuyerCheckoutResponse {
  message: string;
  payment: {
    id: string;
    type: PaymentType;
    status: PaymentStatus;
    amount: number;
    orderId: string | null;
    orderIds: string[];
    checkoutUrl: string;
  };
}

export interface CreateSubscriptionCheckoutPayload {
  plan: SubscriptionPlanCode;
  addonSlots?: number;
  paymentMethod?: "online" | "cod";
}

export interface CreateSubscriptionCheckoutResponse {
  message: string;
  payment?: {
    id: string;
    status: PaymentStatus;
    amount: number;
    plan: SubscriptionPlanCode;
    addonSlots: number;
    totalSlots: number;
    checkoutUrl: string;
  };
  subscription: {
    id: string;
    plan: SubscriptionPlanCode;
    status: SubscriptionStatus;
    pendingPlan?: SubscriptionPlanCode | "";
    pendingAddonSlots?: number;
  };
  billing?: {
    includedSlots: number;
    addonSlots: number;
    totalSlots: number;
    monthlyPrice: number;
    branchLimit: number | null;
  };
}

export interface GetPaymentStatusResponse {
  payment: PaymentRecord;
}

export interface SellerSubscriptionSnapshot {
  id: string;
  plan: SubscriptionPlanCode;
  status: SubscriptionStatus;
  includedSlots: number;
  addonSlots: number;
  totalSlots: number;
  monthlyPrice: number;
  branchLimit: number;
  branchCount: number;
  activeDevices: number;
  loginPolicy: "REJECT" | "INVALIDATE_OLDEST";
  nextBillingDate: string | null;
  activatedAt: string | null;
  startedAt: string | null;
}

export interface GetMySubscriptionResponse {
  subscription: SellerSubscriptionSnapshot;
}

export interface CancelSubscriptionResponse {
  message: string;
  subscription: SellerSubscriptionSnapshot;
}
