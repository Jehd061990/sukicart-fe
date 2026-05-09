export type PaymentType = "one_time" | "subscription";
export type PaymentStatus = "pending" | "paid" | "failed";

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
  plan?: "BASIC" | "PRO" | "BUSINESS" | "";
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
  plan: "BASIC" | "PRO" | "BUSINESS";
}

export interface CreateSubscriptionCheckoutResponse {
  message: string;
  payment: {
    id: string;
    type: PaymentType;
    status: PaymentStatus;
    amount: number;
    plan: "BASIC" | "PRO" | "BUSINESS";
    subscriptionId: string;
    checkoutUrl: string;
  };
  subscription: {
    id: string;
    plan: "BASIC" | "PRO" | "BUSINESS";
    status: "active" | "pending" | "unpaid" | "cancelled";
    nextBillingDate: string | null;
  };
}

export interface GetPaymentStatusResponse {
  payment: PaymentRecord;
}

export interface SellerSubscriptionSnapshot {
  id: string;
  plan: "BASIC" | "PRO" | "BUSINESS";
  status: "active" | "pending" | "unpaid" | "cancelled";
  totalSlots: number;
  loginPolicy: "REJECT" | "INVALIDATE_OLDEST";
  nextBillingDate: string | null;
  activatedAt: string | null;
}

export interface GetMySubscriptionResponse {
  subscription: SellerSubscriptionSnapshot;
}

export interface CancelSubscriptionResponse {
  message: string;
  subscription: SellerSubscriptionSnapshot;
}
