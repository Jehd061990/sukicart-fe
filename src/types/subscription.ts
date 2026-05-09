import { PaymentStatus, SubscriptionPlanCode, SubscriptionStatus } from "@/types/payment";

export interface SubscriptionPlanFeatureMap {
  branchManagement: boolean;
  advancedReports: boolean;
  inventoryAnalytics: boolean;
  apiAccess: boolean;
  exports: boolean;
}

export interface SubscriptionPlan {
  code: SubscriptionPlanCode;
  name: string;
  monthlyAmount: number;
  includedSlots: number;
  branchLimit: number | null;
  addonSlotsEnabled: boolean;
  features: SubscriptionPlanFeatureMap;
}

export interface SubscriptionPlansResponse {
  plans: SubscriptionPlan[];
}

export interface BillingComputation {
  includedSlots: number;
  addonSlots: number;
  totalSlots: number;
  monthlyPrice: number;
  branchLimit: number | null;
}

export interface CurrentSubscription {
  id: string;
  plan: SubscriptionPlanCode;
  status: SubscriptionStatus;
  nextPlan?: SubscriptionPlanCode | "";
  nextAddonSlots?: number;
  cancelAtPeriodEnd?: boolean;
  billingDate?: string | null;
  currentPeriodEnd?: string | null;
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
  downgradeWarning?: string;
}

export interface CurrentSubscriptionResponse {
  subscription: CurrentSubscription;
}

export interface SubscriptionCheckoutPayload {
  plan: SubscriptionPlanCode;
  addonSlots?: number;
  paymentMethod?: "online" | "cod";
  effectiveTiming?: "immediate" | "next_cycle";
}

export interface SubscriptionCheckoutResponse {
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
  billing?: BillingComputation;
  schedule?: {
    currentPlan: SubscriptionPlanCode;
    nextPlan: SubscriptionPlanCode;
    billingDate: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    warning?: string;
  };
  billingPreview?: {
    monthlyPrice: number;
    includedSlots: number;
    addonSlots: number;
    totalSlots: number;
    effectiveDate?: string;
  };
}

export interface UpdateAddonSlotsPayload {
  addonSlots: number;
}

export interface UpdateAddonSlotsResponse {
  message: string;
  subscription?: CurrentSubscription;
  billing: BillingComputation;
  payment?: {
    id: string;
    amount: number;
    status: PaymentStatus;
    checkoutUrl: string;
  };
  proration?: {
    monthlyAddonTotal: number;
    monthlyDelta: number;
    proratedAmount: number;
    remainingDays: number;
    totalDaysInMonth: number;
  };
  summary?: {
    additionalSlots: number;
    updatedBillingAmount: number;
    effectiveNextBillingDate: string | null;
    proratedChargeToday?: number;
  };
}

export interface AddonSlotsPreviewResponse {
  preview: {
    currentIncludedSlots: number;
    currentAddonSlots: number;
    targetAddonSlots: number;
    currentUsedSlots: number;
    currentMaxSlots: number;
    remainingSlots: number;
    totalMonthlyAddonAmount: number;
    proratedChargeToday: number;
    nextRenewalAmount: number;
    billingDate: string;
    remainingDays: number;
    totalDaysInMonth: number;
  };
}

export interface CancelSubscriptionResponse {
  message: string;
  subscription: CurrentSubscription;
}

export interface Branch {
  _id: string;
  sellerId: string;
  branchName: string;
  address: string;
  contactNumber: string;
  status: "active" | "inactive" | "archived";
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BranchesResponse {
  branches: Branch[];
}

export interface CreateBranchPayload {
  branchName: string;
  address?: string;
  contactNumber?: string;
}

export interface UpdateBranchPayload {
  branchName?: string;
  address?: string;
  contactNumber?: string;
  status?: "active" | "inactive" | "archived";
}

export interface BranchMutationResponse {
  message: string;
  branch?: Branch;
}

export interface BillingSummaryResponse {
  subscription: CurrentSubscription | null;
  latestInvoice: InvoiceHistoryItem | null;
  latestTransaction: PaymentTransactionItem | null;
}

export interface BillingHistoryResponse {
  history: BillingHistoryItem[];
}

export interface InvoicesResponse {
  invoices: InvoiceHistoryItem[];
}

export interface PaymentTransactionsResponse {
  transactions: PaymentTransactionItem[];
}

export interface BillingHistoryItem {
  _id: string;
  action:
    | "subscription_created"
    | "upgrade"
    | "downgrade"
    | "renewal"
    | "addon_update"
    | "cancelled";
  fromPlan: string;
  toPlan: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface InvoiceHistoryItem {
  _id: string;
  amount: number;
  status: "pending" | "paid" | "failed" | "expired" | "cancelled";
  xenditInvoiceId: string;
  externalId: string;
  createdAt: string;
  paidAt: string | null;
}

export interface PaymentTransactionItem {
  _id: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed";
  provider: "xendit";
  providerTransactionId: string;
  createdAt: string;
  paidAt: string | null;
}
